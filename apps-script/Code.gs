/**
 * Calendario de contenidos — backend (Google Apps Script)
 *
 * Vive pegado a la Google Sheet (Extensiones > Apps Script).
 * Hojas que usa:
 *   - Contenidos : una fila por contenido (la fuente de verdad)
 *   - Config     : listas de Estados (+ color), Formatos y Redes
 *   - Papelera   : contenidos eliminados desde la app (se pueden recuperar a mano)
 *
 * Primera vez: ejecutar setup() una vez desde el editor y autorizar.
 */

const SHEET = 'Contenidos';
const CONFIG = 'Config';
const TRASH = 'Papelera';

// clave interna -> encabezado en la hoja (se buscan por nombre, el orden de columnas no importa)
const COLS = [
  ['id', 'ID'],
  ['fecha', 'Fecha publicación'],
  ['titulo', 'Contenido'],
  ['estado', 'Estado'],
  ['formato', 'Formato'],
  ['red', 'Red'],
  ['link', 'Link'],
  ['notas', 'Notas'],
  ['inicio', 'Inicio producción'],
  ['responsable', 'Responsable'],
  ['actualizado', 'Actualizado'],
  ['por', 'Actualizado por'],
  ['version', 'Versión'],
];
const DATE_KEYS = ['fecha', 'inicio'];
const EDITABLE = ['fecha', 'titulo', 'estado', 'formato', 'red', 'link', 'notas', 'inicio', 'responsable'];

const DEFAULT_ESTADOS = [
  ['Idea', '#94A3B8'], ['En curso', '#3B82F6'], ['Faltan tomas', '#F97316'],
  ['En proceso de revisión', '#A855F7'], ['Aceptada', '#14B8A6'], ['Para publicar', '#EAB308'],
  ['Programado', '#6366F1'], ['Publicado', '#22C55E'], ['no se publica', '#78716C'], ['ELIMINADO', '#EF4444'],
];
const DEFAULT_FORMATOS = ['Reel', 'Post', 'Carrusel', 'Historia', 'Video', 'Otro'];
const DEFAULT_REDES = ['Instagram', 'TikTok', 'LinkedIn', 'Facebook', 'YouTube', 'X'];

/* ------------------------------------------------------------------ web app */

/**
 * Sin parámetros: muestra la app.
 * Con ?action=getData / ?action=getRev: responde JSON (para el HTML abierto fuera de Apps Script).
 */
function doGet(e) {
  if (e && e.parameter && e.parameter.action) return api_(e.parameter.action, []);
  try {
    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('Calendario de contenidos')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (err) {
    // Sin archivo Index en el proyecto: se usa el HTML suelto, esto es solo la API
    return ContentService.createTextOutput('API del calendario funcionando. Abrí el Index.html para usar la app.');
  }
}

/** Escrituras desde el HTML externo: body JSON { action, args }. */
function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { /* body inválido */ }
  return api_(body.action, body.args || []);
}

function api_(action, args) {
  const actions = {
    getData: getData, getRev: getRev, createItem: createItem, createMany: createMany,
    updateItem: updateItem, updateMany: updateMany, deleteItem: deleteItem,
  };
  let out;
  try {
    if (!actions[action]) throw new Error('Acción desconocida: ' + action);
    out = { ok: true, data: actions[action].apply(null, args) };
  } catch (err) {
    out = { ok: false, error: String((err && err.message) || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/** Carga inicial: todos los contenidos + configuración. */
function getData() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const items = readAll_(true);
    return {
      items: items,
      config: readConfig_(),
      rev: getRev(),
      user: currentUser_(),
      sheetUrl: SpreadsheetApp.getActive().getUrl(),
    };
  } finally {
    lock.releaseLock();
  }
}

/** Número de revisión: cambia cada vez que alguien modifica algo (app o planilla). */
function getRev() {
  return Number(PropertiesService.getScriptProperties().getProperty('rev') || 0);
}

/** Crea un contenido nuevo. */
function createItem(data, who) {
  return withLock_(function () {
    const sh = sheet_();
    const map = headerMap_(sh);
    const item = { id: newId_(), version: 1 };
    EDITABLE.forEach(function (k) { item[k] = data[k] != null ? data[k] : ''; });
    if (!item.estado) item.estado = 'Idea';
    stamp_(item, who);
    const row = new Array(sh.getLastColumn()).fill('');
    writeToRow_(row, map, item);
    sh.getRange(sh.getLastRow() + 1, 1, 1, row.length).setValues([row]);
    return { item: item, rev: bump_() };
  });
}

/** Crea varios contenidos de una vez (carga inicial). */
function createMany(list, who) {
  return withLock_(function () {
    const sh = sheet_();
    const map = headerMap_(sh);
    const ncol = sh.getLastColumn();
    const items = [];
    const rows = (list || []).map(function (data) {
      const item = { id: newId_(), version: 1 };
      EDITABLE.forEach(function (k) { item[k] = data[k] != null ? data[k] : ''; });
      if (!item.estado) item.estado = 'Idea';
      stamp_(item, who);
      items.push(item);
      const row = new Array(ncol).fill('');
      writeToRow_(row, map, item);
      return row;
    });
    if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, ncol).setValues(rows);
    return { items: items, rev: bump_() };
  });
}

/**
 * Actualiza campos de un contenido. Solo se pisan los campos enviados en `patch`,
 * así dos personas editando campos distintos no se pisan entre sí.
 * Si la versión de base no coincide, se aplica igual pero se avisa (conflicted).
 */
function updateItem(id, patch, baseVersion, who) {
  return withLock_(function () {
    const res = applyPatches_([{ id: id, patch: patch, baseVersion: baseVersion }], who);
    return { item: res.items[0], conflicted: res.conflicted, rev: bump_() };
  });
}

/** Varios cambios atómicos (intercambiar fechas, deshacer, mover en bloque). */
function updateMany(changes, who) {
  return withLock_(function () {
    const res = applyPatches_(changes, who);
    return { items: res.items, conflicted: res.conflicted, rev: bump_() };
  });
}

/** Mueve el contenido a la hoja Papelera. */
function deleteItem(id, who) {
  return withLock_(function () {
    const sh = sheet_();
    const map = headerMap_(sh);
    const rowNum = findRow_(sh, map, id);
    if (!rowNum) return { ok: true, rev: bump_() };
    const values = sh.getRange(rowNum, 1, 1, sh.getLastColumn()).getValues()[0];
    const trash = SpreadsheetApp.getActive().getSheetByName(TRASH) || createTrash_(sh);
    const out = values.slice(0, sh.getLastColumn());
    trash.appendRow(out.concat([new Date(), cleanWho_(who)]));
    sh.deleteRow(rowNum);
    return { ok: true, rev: bump_() };
  });
}

/* ------------------------------------------------------- setup & triggers */

/** Ejecutar UNA vez desde el editor: crea/ordena hojas, validaciones y el disparador de edición. */
function setup() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET, 0);
    sh.getRange(1, 1, 1, COLS.length).setValues([COLS.map(function (c) { return c[1]; })]);
  } else {
    // agrega columnas faltantes al final sin tocar las existentes
    const head = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
    COLS.forEach(function (c) {
      if (head.indexOf(c[1]) === -1) {
        sh.getRange(1, sh.getLastColumn() + 1).setValue(c[1]);
      }
    });
  }
  const map = headerMap_(sh);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#1F2937').setFontColor('#FFFFFF');
  DATE_KEYS.forEach(function (k) { sh.getRange(2, map[k] + 1, sh.getMaxRows() - 1, 1).setNumberFormat('dd/mm/yyyy'); });
  sh.getRange(2, map.actualizado + 1, sh.getMaxRows() - 1, 1).setNumberFormat('dd/mm/yyyy hh:mm');

  let cf = ss.getSheetByName(CONFIG);
  if (!cf) {
    cf = ss.insertSheet(CONFIG);
    const rows = [['Estados', 'Color', 'Formatos', 'Redes']];
    const n = Math.max(DEFAULT_ESTADOS.length, DEFAULT_FORMATOS.length, DEFAULT_REDES.length);
    for (let i = 0; i < n; i++) {
      const e = DEFAULT_ESTADOS[i] || ['', ''];
      rows.push([e[0], e[1], DEFAULT_FORMATOS[i] || '', DEFAULT_REDES[i] || '']);
    }
    cf.getRange(1, 1, rows.length, 4).setValues(rows);
    cf.getRange(1, 1, 1, 4).setFontWeight('bold');
  }
  if (!ss.getSheetByName(TRASH)) createTrash_(sh);

  // Desplegables en la planilla (por si alguien edita directo en Sheets)
  const lists = [['estado', 'A'], ['formato', 'C'], ['red', 'D']];
  lists.forEach(function (l) {
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInRange(cf.getRange(CONFIG + '!$' + l[1] + '$2:$' + l[1] + '$40'), true)
      .setAllowInvalid(true).build();
    sh.getRange(2, map[l[0]] + 1, sh.getMaxRows() - 1, 1).setDataValidation(rule);
  });

  // Disparador: si alguien edita a mano en la planilla, la app también se entera
  const exists = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'alEditarPlanilla'; });
  if (!exists) ScriptApp.newTrigger('alEditarPlanilla').forSpreadsheet(ss).onEdit().create();

  readAll_(true); // asigna IDs a filas que no tengan
  bump_();
  return 'Listo: ' + (sh.getLastRow() - 1) + ' contenidos.';
}

/** Disparador instalable de edición manual en la planilla. */
function alEditarPlanilla(e) {
  try {
    const name = e && e.range ? e.range.getSheet().getName() : '';
    if (name === SHEET || name === CONFIG) bump_();
  } catch (err) { /* nunca romper la edición del usuario */ }
}

/* ---------------------------------------------------------------- helpers */

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function bump_() {
  const props = PropertiesService.getScriptProperties();
  const rev = Number(props.getProperty('rev') || 0) + 1;
  props.setProperty('rev', String(rev));
  return rev;
}

function sheet_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET);
  if (!sh) throw new Error('No existe la hoja "' + SHEET + '". Ejecutá setup() desde el editor de Apps Script.');
  return sh;
}

function tz_() { return SpreadsheetApp.getActive().getSpreadsheetTimeZone(); }

function headerMap_(sh) {
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
  const map = {};
  COLS.forEach(function (c) {
    const i = head.indexOf(c[1]);
    if (i === -1) throw new Error('Falta la columna "' + c[1] + '" en la hoja ' + SHEET + '. Ejecutá setup().');
    map[c[0]] = i;
  });
  return map;
}

function toISO_(v) {
  if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, tz_(), 'yyyy-MM-dd');
  const s = String(v || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return '';
}

function fromISO_(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s || '') ? Utilities.parseDate(s, tz_(), 'yyyy-MM-dd') : '';
}

function rowToItem_(row, map) {
  const it = {};
  COLS.forEach(function (c) {
    const v = row[map[c[0]]];
    if (DATE_KEYS.indexOf(c[0]) !== -1) it[c[0]] = toISO_(v);
    else if (c[0] === 'actualizado') it[c[0]] = v instanceof Date ? v.toISOString() : String(v || '');
    else if (c[0] === 'version') it[c[0]] = Number(v) || 1;
    else it[c[0]] = v == null ? '' : String(v);
  });
  return it;
}

function writeToRow_(row, map, item) {
  COLS.forEach(function (c) {
    if (!(c[0] in item)) return;
    let v = item[c[0]];
    if (DATE_KEYS.indexOf(c[0]) !== -1) v = fromISO_(v);
    else if (c[0] === 'actualizado') v = v ? new Date(v) : '';
    row[map[c[0]]] = v;
  });
}

/** Lee todos los contenidos. Si fixIds, asigna ID a filas cargadas a mano sin ID. */
function readAll_(fixIds) {
  const sh = sheet_();
  const map = headerMap_(sh);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const values = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
  const items = [];
  const idFixes = [];
  values.forEach(function (row, i) {
    const hasContent = row[map.titulo] !== '' || row[map.fecha] !== '' || row[map.link] !== '';
    if (!hasContent) return;
    if (!row[map.id]) {
      row[map.id] = newId_();
      idFixes.push([i + 2, row[map.id]]);
    }
    items.push(rowToItem_(row, map));
  });
  if (fixIds && idFixes.length) {
    idFixes.forEach(function (f) { sh.getRange(f[0], map.id + 1).setValue(f[1]); });
  }
  return items;
}

function readConfig_() {
  const cf = SpreadsheetApp.getActive().getSheetByName(CONFIG);
  if (!cf || cf.getLastRow() < 2) {
    return {
      estados: DEFAULT_ESTADOS.map(function (e) { return { nombre: e[0], color: e[1] }; }),
      formatos: DEFAULT_FORMATOS, redes: DEFAULT_REDES,
    };
  }
  const v = cf.getRange(2, 1, cf.getLastRow() - 1, 4).getValues();
  return {
    estados: v.filter(function (r) { return r[0] !== ''; }).map(function (r) { return { nombre: String(r[0]), color: String(r[1] || '#94A3B8') }; }),
    formatos: v.map(function (r) { return String(r[2]); }).filter(String),
    redes: v.map(function (r) { return String(r[3]); }).filter(String),
  };
}

function findRow_(sh, map, id) {
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const ids = sh.getRange(2, map.id + 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return 0;
}

function applyPatches_(changes, who) {
  const sh = sheet_();
  const map = headerMap_(sh);
  const ncol = sh.getLastColumn();
  const out = [];
  let conflicted = false;
  changes.forEach(function (ch) {
    const rowNum = findRow_(sh, map, ch.id);
    if (!rowNum) throw new Error('El contenido ya no existe (quizás alguien lo eliminó). Recargá.');
    const range = sh.getRange(rowNum, 1, 1, ncol);
    const row = range.getValues()[0];
    const current = rowToItem_(row, map);
    if (ch.baseVersion && Number(ch.baseVersion) !== current.version) conflicted = true;
    const next = {};
    EDITABLE.forEach(function (k) { if (ch.patch && k in ch.patch) next[k] = ch.patch[k] == null ? '' : ch.patch[k]; });
    next.version = current.version + 1;
    stamp_(next, who);
    writeToRow_(row, map, next);
    range.setValues([row]);
    out.push(rowToItem_(row, map));
  });
  return { items: out, conflicted: conflicted };
}

function stamp_(item, who) {
  item.actualizado = new Date().toISOString();
  item.por = cleanWho_(who);
}

function cleanWho_(who) {
  return String(who || currentUser_() || 'anónimo').slice(0, 60);
}

function currentUser_() {
  try { return Session.getActiveUser().getEmail() || ''; } catch (e) { return ''; }
}

function newId_() {
  return 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
}

function createTrash_(sh) {
  const t = SpreadsheetApp.getActive().insertSheet(TRASH);
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  t.getRange(1, 1, 1, head.length + 2).setValues([head.concat(['Eliminado', 'Eliminado por'])]).setFontWeight('bold');
  return t;
}

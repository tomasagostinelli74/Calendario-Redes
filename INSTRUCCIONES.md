# Calendario de contenidos: instalación

Son 3 archivos más la planilla base:

| Archivo | Para qué sirve |
|---|---|
| `Calendario UADE - Base.xlsx` | Tus 389 contenidos ya migrados, más las hojas **Config** y **Papelera** |
| `apps-script/Code.gs` | El backend: lee y escribe en la planilla |
| `apps-script/Index.html` | La app (vista Contenidos + vista Gantt) |
| `apps-script/appsscript.json` | Zona horaria del proyecto (opcional) |

## 1. Subir la planilla a Google Sheets (2 min)
1. Subí `Calendario UADE - Base.xlsx` a Google Drive.
2. Abrila con Google Sheets y andá a **Archivo › Guardar como Hojas de cálculo de Google**. Desde ahí trabajás con esa copia.
   - Si preferís seguir usando la planilla de siempre: en ella andá a **Archivo › Importar › Subir** y elegí el .xlsx con la opción **"Insertar hojas nuevas"**. Se agregan las hojas Contenidos, Config y Papelera.

## 2. Pegar el código (3 min)
1. En la planilla: **Extensiones › Apps Script**.
2. Borrá todo lo que hay en `Código.gs` y pegá el contenido de `Code.gs`.
3. Hacé clic en **＋ › HTML**, ponele de nombre **`Index`** (exacto, sin ".html") y pegá el contenido de `Index.html`.
4. En **⚙ Configuración del proyecto**, elegí la zona horaria **(GMT-03:00) Buenos Aires**.
5. Guardá (Ctrl+S).

## 3. Ejecutar `setup` una vez
En el editor, elegí la función **`setup`** en el desplegable de arriba y tocá **Ejecutar**. Google te va a pedir permisos: aceptalos. Si aparece "Google no verificó esta app", entrá a *Configuración avanzada › Ir a (proyecto)*. Es tu propio script.

`setup` hace esto:
- ordena las columnas y los formatos de fecha,
- arma los desplegables de Estado, Formato y Red en la planilla,
- instala un disparador para que, si alguien edita **a mano en la planilla**, la app también se entere.

## 4. Publicar como aplicación web
1. **Implementar › Nueva implementación** › tipo **Aplicación web**.
2. **Ejecutar como:** *Yo*.
3. **Quién tiene acceso:** *Cualquier usuario de UADE* (si usan cuentas institucionales) o *Cualquier usuario con cuenta de Google*.
4. **Implementar** y copiá la URL. **Esa URL es la que comparten con el equipo** (conviene guardarla en favoritos).

> Con "Ejecutar como: Yo", tus compañeros no necesitan acceso a la planilla para usar la app. Igual podés compartirles la planilla si quieren verla o editarla directo.
>
> **Importante:** cualquiera que tenga acceso a la URL puede modificar el calendario. Por eso conviene restringirla a UADE y no usar "Cualquier persona".

### Usar el `Index.html` suelto (fuera de Apps Script)
El `Index.html` ya tiene adentro la URL de la implementación (`EXEC_URL`), así que también funciona abierto como archivo o subido a cualquier web. Para que se pueda conectar:
- la implementación tiene que tener **Quién tiene acceso: Cualquier persona** (si no, el navegador bloquea la conexión),
- en Apps Script tiene que estar pegado el `Code.gs` nuevo (incluye `doPost` y las respuestas en JSON) y publicada una **nueva versión**.

Con acceso "Cualquier persona", **cualquiera que tenga el HTML o la URL puede leer y modificar el calendario**. No lo publiques en lugares abiertos.

Si la planilla está vacía, la app ofrece el botón **"Cargar contenidos programados"**, que sube los 38 contenidos que trae el HTML.

### Cuando cambies el código
Andá a **Implementar › Administrar implementaciones › ✏️ › Versión: Nueva versión › Implementar**. La URL sigue siendo la misma.

---

## Cómo se usa

**Período (arriba):** Día · Semana · Mes · 2 meses · 3 meses · Rango · Todo. Las flechas ‹ › avanzan y retroceden. Si hacés clic en el nombre del período (por ejemplo "Octubre 2026") podés saltar a cualquier fecha. En *Rango* elegís el desde y el hasta.

**Filtros:** el buscador, Formato, Red y Responsable. Los chips de estado muestran cuántos contenidos hay de cada uno en el período: con un clic lo mostrás u ocultás, con doble clic ves solo ese estado. *Solo pendientes* oculta lo publicado y lo descartado.

**Vista Contenidos:** es la lista día por día. Los días futuros **sin contenido** aparecen en amarillo para que se vean los huecos.
- Estado, título, formato, red y responsable se editan ahí mismo.
- Para pasar un contenido a otro día, **arrastralo desde ⋮⋮** o usá el ícono de calendario.
- Con **›** abrís el detalle: notas o copy, link, inicio de producción, duplicar, eliminar e **intercambiar fecha con otro contenido** (para cuando lo de hoy se pasa a otro día y viceversa).

**Vista Gantt:** cada contenido es una fila. El **rombo** marca la fecha de publicación y la **barra** el período de producción (desde "Inicio de producción"). Si arrastrás el rombo, cambia la fecha. Si arrastrás la barra, se mueve todo. Si arrastrás el borde izquierdo, cambia el inicio. Además podés agrupar por estado, formato, red o responsable y hacer zoom (− Ajustar +). Si hacés clic en un día del encabezado, se abre ese día en la lista.

**Deshacer:** cada vez que movés, intercambiás o cambiás un estado aparece un aviso con **Deshacer**.

**Atajos:** `N` nuevo · `/` buscar · `T` hoy · `←` `→` período anterior/siguiente · `G` cambiar de vista · `Esc` cerrar.

## Cómo funciona la sincronización
- Cada cambio se guarda en la planilla al instante. Arriba a la derecha dice *Guardando…* y después *Sincronizado*.
- Cada ~12 segundos (y cada vez que volvés a la pestaña) la app revisa si alguien cambió algo y se actualiza sola.
- Si dos personas editan **campos distintos** del mismo contenido, se conservan los dos cambios. Si editan **el mismo campo**, queda el último y la app avisa.
- En cada fila, la planilla registra quién hizo el último cambio y cuándo. Tu nombre se configura con el botón **"¿Quién sos?"** de arriba.
- Lo que se elimina desde la app **no se pierde**: pasa a la hoja **Papelera**.

## Personalizar
Desde la hoja **Config** podés agregar o renombrar **estados** (con su color en hexadecimal), **formatos** y **redes**. La app los toma en la próxima actualización.

## Qué se hizo con tu Excel original
- Se tomó la hoja **"2025"**. La hoja **"FACE"** es una copia más vieja de esa misma información (no tiene ninguna fila que no esté en "2025"), así que no se importó por separado.
- Las filas con contenido pasaron a la hoja **Contenidos** (389 en total). Los días vacíos no se copiaron, porque ahora la app los muestra sola.
- Los contenidos **sin estado** (los ideados de fines de octubre y noviembre) quedaron como **"Idea"**.
- **Formato:** se completó a partir del link (los /reel/ como *Reel* y los /p/ como *Post*). Los que no tenían link quedaron vacíos.
- **Red:** se puso *Instagram* en todos, porque todos los links eran de Instagram. Se puede cambiar.
- Hay 2 filas que tenían link pero no título (9/4/2025 y 13/5/2025). Quedaron como "(sin título)".

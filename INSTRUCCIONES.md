# Calendario de contenidos: instalación con Supabase

La app (`index.html`) guarda todo en una base de datos de **Supabase** y los cambios de cada uno aparecen **en tiempo real** en la pantalla de los demás.

## 1. Crear el proyecto en Supabase (3 min)
1. Entrá a [supabase.com](https://supabase.com) y creá una cuenta (el plan gratis alcanza).
2. Tocá **New project**:
   - **Name:** `calendario-redes`
   - **Database password:** inventá una y guardala (para la app no se usa, pero Supabase la pide).
   - **Region:** **South America (São Paulo)**, que es la más cercana.
3. Esperá 1 o 2 minutos a que termine de crearse.

## 2. Crear las tablas y cargar los datos (1 min)
1. En el menú de la izquierda, entrá a **SQL Editor** › **New query**.
2. Pegá **todo** el contenido de [`supabase/instalar.sql`](supabase/instalar.sql) y tocá **Run**.
3. Abajo tiene que aparecer `contenidos_cargados: 38`. Esos son los contenidos que había en la Google Sheet, con sus estados actuales.

El script crea las tablas, los permisos y el tiempo real. Se puede ejecutar más de una vez: no duplica nada.

## 3. Copiar las dos claves
Tocá el botón **Connect**, arriba, o andá a **Project Settings › API Keys / Data API**, y copiá:
- **Project URL**, que se ve así: `https://abcdefghijkl.supabase.co`.
- La clave **pública**, que puede aparecer de dos maneras:
  - como **Publishable key** (empieza con `sb_publishable_…`),
  - o como **anon public**, en la sección *Legacy API keys*.

> ⚠️ **Nunca** uses la clave **secret** ni la **service_role**. Esas dan acceso total a la base y no pueden ir en una página web.

Pegalas en `index.html`, en estas dos líneas (están cerca de la línea 500):
```js
const SUPABASE_URL = 'https://abcdefghijkl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_...';
```
Después subí el cambio a GitHub y Vercel lo publica solo.

Hasta que pongas las claves, la app funciona en modo local: muestra los 38 contenidos y guarda los cambios **solo en ese navegador**.

---

## Cómo se usa

**Período (arriba):** Día · Semana · Mes · 2 meses · 3 meses · Rango · Todo. Las flechas ‹ › avanzan y retroceden. Si hacés clic en el nombre del período, podés saltar a cualquier fecha.

**Filtros:** el buscador, Formato, Red y Responsable. Los chips de estado muestran cuántos contenidos hay de cada uno: con un clic lo mostrás u ocultás, con doble clic ves solo ese estado.

**Vista Contenidos:** es la lista día por día. Los días futuros **sin contenido** aparecen en amarillo. Todo se edita ahí mismo. Para pasar un contenido a otro día, arrastralo desde ⋮⋮ o usá el ícono de calendario. Con **›** abrís el detalle: notas, link, inicio de producción, duplicar, eliminar e **intercambiar fecha con otro contenido**.

**Vista Gantt:** el **rombo** marca la fecha de publicación y la **barra** el período de producción. Para cambiar la fecha, arrastrá el rombo; para mover todo, arrastrá la barra. Se puede agrupar y hacer zoom.

**Exportar a PDF:** está en la vista Gantt, con el botón **Exportar PDF**. Arma una sola hoja **A4 o A3**, horizontal o vertical, a color y en tema claro, con el período, los filtros y la agrupación actuales.

**Tema:** la app arranca en claro. El botón de la luna, arriba a la derecha, la pasa a oscuro.

**Deshacer:** cada vez que movés, intercambiás o cambiás un estado, aparece **Deshacer**.

**Atajos:** `N` nuevo · `/` buscar · `T` hoy · `←` `→` período · `G` cambiar de vista · `Esc` cerrar.

## Sincronización
- Cada cambio se guarda al instante en Supabase y les aparece a los demás en el momento. Arriba a la derecha dice **En vivo**.
- Además, cada 30 segundos la app verifica que no se haya perdido nada (por ejemplo, si se cortó internet).
- Si dos personas editan **campos distintos** del mismo contenido, se conservan los dos cambios. Si editan **el mismo campo**, queda el último y la app avisa.
- Tu nombre se configura con el botón **"¿Quién sos?"** y queda registrado en cada cambio (columna `por`).

## Recuperar algo eliminado
"Eliminar" no borra: marca la fila. Para recuperarla, entrá en Supabase a **Table Editor › contenidos**, buscá la fila (tiene completo `eliminado_at`), borrá ese valor y guardá. Vuelve a aparecer en la app.

## Personalizar estados, formatos y redes
En **Table Editor › opciones** podés agregar filas:
- `tipo` puede ser `estado`, `formato` o `red`.
- `nombre` es el texto que se muestra.
- `color` es solo para estados, en hexadecimal (por ejemplo `#22C55E`).
- `orden` define el orden en los desplegables.

## Seguridad: leelo
La clave pública va dentro del `index.html`, así que **quien tenga el link de la app puede ver y editar el calendario**. Lo que no puede hacer es borrar definitivamente. Para un equipo chico con el link compartido solo entre ustedes suele alcanzar. Si más adelante necesitan restringirlo, se puede agregar un inicio de sesión con el mail de cada uno.

Además, en el plan gratis Supabase **pausa los proyectos que no se usan durante 7 días**. Con el uso diario no pasa. Si pasara, se reactiva desde el panel de Supabase con un clic.

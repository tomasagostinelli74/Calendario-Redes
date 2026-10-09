# Calendario de contenidos

Calendario de contenidos para redes (Marketing · Publicidad digital): vista **Contenidos** y vista **Gantt**, con filtros por período, exportación del Gantt a PDF (A4/A3) y sincronización **en tiempo real** con Supabase.

## Cómo está armado

| Archivo | Qué es |
|---|---|
| `index.html` | La app completa: un solo archivo, sin build. Es lo que publica Vercel. |
| `supabase/instalar.sql` | Crea las tablas, los permisos y el tiempo real en Supabase, y carga los contenidos iniciales. |
| `INSTRUCCIONES.md` | Instalación paso a paso y manual de uso. |

La conexión se configura en `index.html` con `SUPABASE_URL` y `SUPABASE_KEY` (la clave **pública**). Si están vacías, la app funciona en modo local, solo en ese navegador.

## Publicar
Es un sitio estático: Vercel lo sirve tal cual, sin framework y sin comando de build. Cada push a `main` se publica solo.

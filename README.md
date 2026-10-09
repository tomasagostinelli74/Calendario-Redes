# Calendario de contenidos

Calendario de contenidos para redes (Marketing · Publicidad digital): vista **Contenidos** y vista **Gantt**, con filtros por período y sincronización en línea con una Google Sheet.

## Cómo está armado

| Archivo | Qué es |
|---|---|
| `index.html` | La app completa (un solo archivo, sin build). Es lo que publica Vercel. |
| `apps-script/Code.gs` | Backend en Google Apps Script: lee y escribe en la planilla. |
| `INSTRUCCIONES.md` | Instalación del script y manual de uso. |

El `index.html` se conecta al script por la constante `EXEC_URL` (cerca de la línea 458). Si se crea una implementación nueva del Apps Script, hay que actualizar esa URL.

## Publicar
Es un sitio estático: Vercel lo sirve tal cual, sin framework y sin comando de build.

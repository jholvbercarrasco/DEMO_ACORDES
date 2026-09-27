# CifraPad – Demo V1

Demo web de biblioteca de cifrados + editor + arreglos + modo escenario + autoscroll + pads de audio.

## Qué funciona ya

- Biblioteca de canciones con búsqueda y filtro por tonalidad.
- Crear y editar canciones.
- Secciones rápidas: Intro, Estrofa, Pre-coro, Coro, Puente, Instrumental y Final.
- Paleta rápida de acordes según la tonalidad.
- Arreglo independiente del contenido maestro: reordenar, duplicar, quitar apariciones y restaurar el orden original.
- Transposición de visualización.
- Tamaño de letra configurable.
- Modo escenario.
- Autoscroll con velocidad regulable.
- Pads mayores y menores integrados a partir de los audios entregados por el usuario. La app expone 24 tonalidades de canción (12 mayores + 12 menores) y reutiliza pads relativos cuando no existe un archivo menor dedicado.
- Volumen independiente del pad.
- Setlists básicos: crear listas, añadir canciones y tocarlas en secuencia.
- Guardado persistente en `localStorage` del navegador.
- Importación por texto.
- Importación experimental de imagen (Tesseract.js), PDF (PDF.js) y Word `.docx` (Mammoth.js). Todo pasa al editor antes de guardarse.

## Cómo probar localmente

No abras `index.html` directamente si quieres evitar restricciones del navegador con archivos/audio. Levanta un servidor local.

Con Python:

```bash
python -m http.server 8080
```

Luego abre `http://localhost:8080`.

## GitHub Pages

1. Sube toda esta carpeta a un repositorio.
2. En GitHub: Settings > Pages.
3. Selecciona `Deploy from a branch` y la rama principal.
4. Conserva la carpeta `assets/pads`; los nombres ya están normalizados para la app.

## Importación y dependencias

La demo usa CDN para OCR/PDF/Word. Si no hay internet, la creación manual y el pegado de texto siguen funcionando, pero el procesamiento de imagen/PDF/Word puede no cargar. En una versión de producción conviene empaquetar dependencias o mover el reconocimiento a un backend.

## Persistencia actual

Esta V1 guarda canciones y setlists en el navegador del dispositivo. Recargar la página no borra los datos, pero limpiar datos del navegador o usar otro dispositivo sí. La siguiente fase natural es autenticación + base de datos en nube (por ejemplo Supabase) y sincronización offline/online.

## Nota sobre los pads

Los 12 audios incluidos son largos (aprox. 8.5–10.5 min), estéreo, 44.1 kHz y 192 kbps, así que esta demo reproduce el archivo completo y no fuerza looping corto.

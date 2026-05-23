# MikelFit — app de seguimiento (Objetivo 75 kg)

App web instalable (PWA) en español para seguir entrenamiento, nutrición, peso, hitos y motivación. Los datos se guardan **en tu propio móvil**.

> ⚠️ **El repositorio DEBE llamarse `mikelfit`.** Las rutas internas dependen de ese nombre. Si quieres otro nombre, cambia la constante `REPO` en `vite.config.js` (por ejemplo `/mi-app/`) para que coincida.

## Cómo publicarla en GitHub Pages

1. Crea un repositorio nuevo en GitHub llamado **`mikelfit`** (público).
2. Sube a ese repo **todo el contenido de esta carpeta** (sin `node_modules` ni `dist`, que se generan solos).
3. En el repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Cada vez que subas cambios a la rama `main`, GitHub construye y publica la app sola.
5. Tu app quedará en: `https://TU-USUARIO.github.io/mikelfit/`

## Instalarla en el móvil

- **Android (Chrome):** abre la dirección → menú (⋮) → "Añadir a pantalla de inicio".
- **iPhone (Safari):** abre la dirección → botón Compartir → "Añadir a pantalla de inicio".

Aparecerá con icono propio y se abrirá a pantalla completa, sin barras del navegador. Tras la primera carga funciona también sin conexión.

## Probar en tu ordenador (opcional)

```bash
npm install
npm run dev       # desarrollo
npm run build     # versión final (carpeta dist)
npm run preview   # ver la versión final
```

## Copias de seguridad

Como los datos viven en el navegador del móvil, en **Ajustes** tienes:
- **Descargar copia (.json)** — guárdala de vez en cuando.
- **Restaurar desde una copia** — para recuperar o pasar tus datos a otro dispositivo.

## Personalización

Todo (peso, objetivo, kcal, proteína, agua, pasos, semanas, fecha de inicio) se edita desde **Ajustes** dentro de la app. La progresión del circuito por semanas está en `src/App.jsx` (constante `PROG`).

_Esto no sustituye asesoramiento médico. Ante lesiones, enfermedad, medicación o síntomas raros, consulta con un profesional sanitario._

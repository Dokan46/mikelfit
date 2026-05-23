import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// IMPORTANTE: 'base' debe coincidir con el nombre de tu repositorio de GitHub.
// Si tu repo se llama "mikelfit", déjalo así. Si lo llamas distinto, cámbialo
// aquí y también en scope/start_url más abajo (p. ej. "/mi-repo/").
const REPO = "/mikelfit/";

export default defineConfig({
  base: REPO,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png", "favicon.ico"],
      manifest: {
        name: "MikelFit — Objetivo 75 kg",
        short_name: "MikelFit",
        description: "Seguimiento personal de entrenamiento, nutrición y progreso.",
        lang: "es",
        theme_color: "#3C6E5B",
        background_color: "#F6F2E9",
        display: "standalone",
        orientation: "portrait",
        scope: REPO,
        start_url: REPO,
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: { globPatterns: ["**/*.{js,css,html,png,svg,ico,woff,woff2}"] },
    }),
  ],
});

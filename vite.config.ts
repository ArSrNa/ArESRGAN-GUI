import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron/simple";
import pkg from "./package.json";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    assetsDir: "public",
    emptyOutDir: true,
    copyPublicDir: false,
    rollupOptions: {
      output: {
        format: "es",
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    electron({
      main: {
        entry: "electron/main/index.ts",
        onstart(args) {
          if (process.env.VSCODE_DEBUG) {
            console.log("[startup] Electron App");
          } else {
            args.startup();
          }
        },
        vite: {
          build: {
            sourcemap: !!process.env.VSCODE_DEBUG,
            minify: true,
            outDir: "dist-electron/main",
            rollupOptions: {
              external: Object.keys(
                "dependencies" in pkg ? pkg.dependencies : {}
              ),
            },
          },
        },
      },
      preload: {
        input: "electron/preload/index.ts",
        vite: {
          build: {
            sourcemap: !!process.env.VSCODE_DEBUG ? "inline" : undefined,
            minify: true,
            outDir: "dist-electron/preload",
            rollupOptions: {
              external: Object.keys(
                "dependencies" in pkg ? pkg.dependencies : {}
              ),
            },
          },
        },
      },
      renderer: {},
    }),
  ],
  clearScreen: false,
});

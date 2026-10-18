import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Tauri 在开发时会通过 TAURI_DEV_HOST 指定移动端/局域网调试地址
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  // Tauri CLI 占用终端输出，避免 Vite 清屏冲刷
  clearScreen: false,
  server: {
    port: 7777,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 7778,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "public",
    emptyOutDir: true,
    // public 目录存放推理二进制与模型，由 Tauri 打包，不重复嵌入前端产物
    copyPublicDir: false,
    rollupOptions: {
      output: {
        format: "es",
      },
    },
  },
});

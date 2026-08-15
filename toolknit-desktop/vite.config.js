import { defineConfig } from "vite";

export default defineConfig(async () => ({
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // CLI staging replaces bundled binaries and fonts. Watching those output
      // directories can crash chokidar with EBUSY on Windows while Tauri is running.
      ignored: ["**/src-tauri/**", "**/cli/vendor/**", "**/cli/resources/**", "**/cli/*.tgz"],
    },
  },
  optimizeDeps: {
    // Keep imgly out of prebundle (heavy / wasm). Prebundle ORT so Tauri WebView
    // does not fetch raw /node_modules/... ESM (that path fails with dynamic import).
    exclude: ["@imgly/background-removal"],
    include: ["onnxruntime-web", "onnxruntime-web/webgpu", "onnxruntime-web/wasm"],
  },
  assetsInclude: ["**/*.wasm"],
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        screenshot: "screenshot.html",
      },
    },
  },
}));

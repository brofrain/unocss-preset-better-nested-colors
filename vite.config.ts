import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "index.js",
    },
    minify: false,
    rollupOptions: { external: ["unocss"] },
    target: "esnext",
  },
});

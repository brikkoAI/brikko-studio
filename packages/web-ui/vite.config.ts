import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 3737, host: "127.0.0.1", strictPort: true },
  build: { outDir: "dist", sourcemap: true },
});

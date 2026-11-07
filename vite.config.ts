import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 상대 경로로 빌드해 GitHub Pages 등 어떤 하위 경로에서도 동작하게 한다.
export default defineConfig({
  base: "./",
  plugins: [react()],
});

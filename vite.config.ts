import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";

import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

const config = defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [
    devtools(),

    tailwindcss(),
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),

    TanStackRouterVite(),
    viteReact({
      babel: {
        plugins: [["babel-plugin-react-compiler", {}]],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "tanstack-vendor": [
            "@tanstack/react-router",
            "@tanstack/store",
            "@tanstack/history",
          ],
          "ui-vendor": [
            "@base-ui/react",
            "@phosphor-icons/react",
            "clsx",
            "tailwind-merge",
          ],
        },
      },
    },
  },
});

export default config;

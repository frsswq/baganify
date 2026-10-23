import { fileURLToPath, URL } from "node:url";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";

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

    tanstackRouter(),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react-vendor",
              test: /[\\/]node_modules[\\/](?:react|react-dom)[\\/]/,
            },
            {
              name: "tanstack-vendor",
              test: /[\\/]node_modules[\\/]@tanstack[\\/](?:react-router|store|history)[\\/]/,
            },
            {
              name: "ui-vendor",
              test: /[\\/]node_modules[\\/](?:@base-ui[\\/]react|@phosphor-icons[\\/]react|clsx|tailwind-merge)[\\/]/,
            },
          ],
        },
      },
    },
  },
});

export default config;

import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react-swc"
import { defineConfig, loadEnv } from "vite"

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const configuredBase = env.VITE_BASE_PATH?.trim() || "/"
  const prefixedBase = configuredBase.startsWith("/")
    ? configuredBase
    : `/${configuredBase}`
  const normalizedBase = prefixedBase.endsWith("/")
    ? prefixedBase
    : `${prefixedBase}/`

  return {
    base: normalizedBase,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    plugins: [
      tanstackRouter({
        target: "react",
        autoCodeSplitting: true,
      }),
      react(),
      tailwindcss(),
    ],
  }
})

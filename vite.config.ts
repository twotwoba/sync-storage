import { crx } from "@crxjs/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react-swc"
import { defineConfig } from "vite"
import zip from "vite-plugin-zip-pack"
import manifest from "./manifest.config.js"
import { name, version } from "./package.json"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	const isProd = mode === "production"

	return {
		resolve: {
			tsconfigPaths: true
		},
		plugins: [
			react(),
			tailwindcss(),
			crx({ manifest }),
			zip({ outDir: "release", outFileName: `crx-${name}-${version}.zip` })
		],
		build: {
			target: "es2020",
			sourcemap: !isProd ? "inline" : false,
			manifest: true,
			rolldownOptions: {
				input: {
					main: "index.html"
				},
				output: {
					chunkFileNames: "js/[name]-[hash].js",
					entryFileNames: "js/[name]-[hash].js",
					assetFileNames: "[ext]/[name]-[hash].[ext]"
				}
			}
		},
		server: {
			cors: {
				origin: [/chrome-extension:\/\//]
			}
		}
	}
})

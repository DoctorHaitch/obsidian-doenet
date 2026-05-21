import esbuild from "esbuild";

esbuild.build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  outfile: "main.js",
  format: "cjs",
  target: "es2018",
  external: ["obsidian"],
  sourcemap: "inline",
  platform: "browser",
  logLevel: "info",
}).catch(() => process.exit(1));
import type { DoenetMode, DoenetVersion } from "./types";
import { Plugin as ObsidianPlugin } from "obsidian";
import { App } from "obsidian"; //NEW

async function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);

    // Prevent duplicate loads
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));

    document.head.appendChild(script);
  });
}


export function resolveDoenetScript(
  mode: DoenetMode,
  version: DoenetVersion,
  app: App,
  plugin: ObsidianPlugin
): { primary: string; fallback?: string } {

  const cdnVersion = version === "dev" ? "dev" : "latest";

  const local = app.vault.adapter.getResourcePath(
    plugin.manifest.dir + `/vendor/doenet/doenet-standalone-${cdnVersion}.js`
  );

  const cdn = `https://cdn.jsdelivr.net/npm/@doenet/standalone@${cdnVersion}/doenet-standalone.js`;

  if (mode === "local") return { primary: local };
  if (mode === "cdn") return { primary: cdn };

  // auto
  return { primary: cdn, fallback: local };
}


export function resolveMathJaxScript(
  mode: DoenetMode,
  app: App,
  plugin: ObsidianPlugin
): { primary: string; fallback?: string } {

  const local = app.vault.adapter.getResourcePath(
    plugin.manifest.dir + "/vendor/mathjax/es5/tex-mml-chtml.js"
  );

  const cdn = "https://cdn.jsdelivr.net/npm/mathjax@4.1.0/tex-mml-chtml.js";

  if (mode === "local") return { primary: local };
  if (mode === "cdn") return { primary: cdn };

  return { primary: cdn, fallback: local };
}


export function resolveDoenetCSS(
  mode: DoenetMode,
  app: App,
  plugin: ObsidianPlugin
): { primary: string; fallback?: string } {

  const local = app.vault.adapter.getResourcePath(
    plugin.manifest.dir + "/vendor/doenet/style.css"
  );

  const cdn = "https://cdn.jsdelivr.net/npm/@doenet/standalone@latest/style.css";

  if (mode === "local") return { primary: local };
  if (mode === "cdn") return { primary: cdn };

  return { primary: cdn, fallback: local };
}
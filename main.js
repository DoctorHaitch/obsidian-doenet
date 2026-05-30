var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => DoenetPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var import_obsidian2 = require("obsidian");

// src/iframeSrcdoc.ts
function buildIframeSrcdoc(params) {
  const { css, doenetML, id, showKeyboard, scriptSource, mathJaxSource, mode } = params;
  return `
  <!DOCTYPE html>
<html><head><meta charset="UTF-8">


<script type="module">


async function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

console.log("Mode:", "${mode}");

let mathJaxLoaded = false;

// ----------- MathJax
try {
  await loadScript("${mathJaxSource.primary}");
  mathJaxLoaded = true;
} catch (e) {
  ${mode === "auto" ? `
  console.warn("MathJax primary failed, using fallback");
  await loadScript("${mathJaxSource.fallback}");
  mathJaxLoaded = true;
  ` : ""}
}

<\/script>


<style>
${css}
</style>

<style>
  body {
    margin: 0;
    padding: 10px;
    overflow: visible;
    height: auto;
  }

/* ============= DOENET EXCESSIVE SPACING FIX ============= */
/* If math renders strangely, it's probably something here. */
/* Kill vertical stacking margins */
.doenet-viewer > div {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}
/* Kill graph container margins, huge improvement on Obsidian embedding */
.jxgbox {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}
/* Remove horizontal padding + width cap */
.doenet-viewer {
  padding-left: 0 !important;
  padding-right: 0 !important;
  Padding: 0 !important;
  max-width: 100% !important;
}
/* Prevent nested wrapper buildup */
#doenet-viewer div[style*="margin: 12px"] {
  margin: 0 !important;
}
/* ============= DOENET GRAPH AXES ============= */
/* Too bold -- deemphasize them a bit. */
.jxgbox line {
  stroke: #666666 !important;
}
/* Light gray grid */
.jxgbox path[stroke-opacity="0.5"] {
  stroke: #bbbbbb !important;
  stroke-opacity: 0.55 !important;
}
</style></head>

<body>

<div id="app"></div>


<script type="module">
const primary = "${scriptSource.primary}";
const fallback = "${scriptSource.fallback || ""}";
const mode = "${mode}";

let Doenet;

try {
  Doenet = await import(primary);
  console.log("[Doenet] Loaded primary:", primary);
} catch (e) {
  if (mode === "auto" && fallback) {
    console.warn("[Doenet] Primary failed, using fallback:", fallback);
    Doenet = await import(fallback);
  } else {
    throw e;
  }
}

const container = document.getElementById("app");

// Inject DoenetML
const script = document.createElement("script");
script.type = "text/doenetml";
script.textContent = ${JSON.stringify(doenetML)};
container.appendChild(script);

Doenet.renderDoenetViewerToContainer(
  container,
  null,
  { addVirtualKeyboard: ${showKeyboard} }
);

// --------------------------------------------------
// RESIZING OF IFRAME TO FIT CONTENT HEIGHT
// --------------------------------------------------
function sendSize() {
  const height = document.body.scrollHeight;

  parent.postMessage({
    type: "doenet-resize",
    id: "${id}",
    height
  }, "*");
}

// Run after Doenet starts rendering
requestAnimationFrame(() => {
  requestAnimationFrame(sendSize);
});

// Observe AFTER content exists
const observer = new ResizeObserver(() => {
  sendSize();
});
observer.observe(document.body);

// Final safety pass
window.addEventListener("load", sendSize);

<\/script>
</body>
</html>
`;
}

// src/loader.ts
function resolveDoenetScript(mode, version, app, plugin) {
  const cdnVersion = version === "dev" ? "dev" : "latest";
  const local = app.vault.adapter.getResourcePath(
    plugin.manifest.dir + `/vendor/doenet/doenet-standalone-${cdnVersion}.js`
  );
  const cdn = `https://cdn.jsdelivr.net/npm/@doenet/standalone@${cdnVersion}/doenet-standalone.js`;
  if (mode === "local") return { primary: local };
  if (mode === "cdn") return { primary: cdn };
  return { primary: cdn, fallback: local };
}
function resolveMathJaxScript(mode, app, plugin) {
  const local = app.vault.adapter.getResourcePath(
    plugin.manifest.dir + "/vendor/mathjax/es5/tex-mml-chtml.js"
  );
  const cdn = "https://cdn.jsdelivr.net/npm/mathjax@4.1.0/tex-mml-chtml.js";
  if (mode === "local") return { primary: local };
  if (mode === "cdn") return { primary: cdn };
  return { primary: cdn, fallback: local };
}
function resolveDoenetCSS(mode, app, plugin) {
  const local = app.vault.adapter.getResourcePath(
    plugin.manifest.dir + "/vendor/doenet/style.css"
  );
  const cdn = "https://cdn.jsdelivr.net/npm/@doenet/standalone@latest/style.css";
  if (mode === "local") return { primary: local };
  if (mode === "cdn") return { primary: cdn };
  return { primary: cdn, fallback: local };
}

// src/main.ts
var DEFAULT_SETTINGS = {
  mode: "auto",
  doenetVersion: "latest",
  enableCache: false,
  cacheTTL: 1440
  // 24 hours
};
var CacheManager = class {
  constructor(plugin) {
    __publicField(this, "plugin");
    this.plugin = plugin;
  }
  async getCachePath(url) {
    const hash = await this.hashString(url);
    return `${this.plugin.manifest.dir}/cache/${hash}.json`;
  }
  async ensureCacheFolder() {
    const dir = `${this.plugin.manifest.dir}/cache`;
    if (!await this.plugin.app.vault.adapter.exists(dir)) {
      await this.plugin.app.vault.adapter.mkdir(dir);
    }
  }
  // ----------- Updated with debug output.
  async get(url) {
    if (!this.plugin.settings.enableCache) {
      console.log("[Doenet] Cache disabled");
      return null;
    }
    const path = await this.getCachePath(url);
    if (!await this.plugin.app.vault.adapter.exists(path)) {
      console.log("[Doenet] Cache miss (no file):", url);
      return null;
    }
    try {
      const raw = await this.plugin.app.vault.adapter.read(path);
      const data = JSON.parse(raw);
      const ageMinutes = (Date.now() - data.timestamp) / (1e3 * 60);
      if (ageMinutes > this.plugin.settings.cacheTTL) {
        console.log("[Doenet] Cache expired:", url);
        return null;
      }
      console.log("[Doenet] Cache HIT:", data.url);
      return data.content;
    } catch (e) {
      console.error("[Doenet] Cache read error:", e);
      return null;
    }
  }
  async set(url, content) {
    if (!this.plugin.settings.enableCache) return;
    const path = await this.getCachePath(url);
    await this.ensureCacheFolder();
    const data = {
      url,
      timestamp: Date.now(),
      content
    };
    try {
      console.log("[Doenet] Caching response:", url);
      await this.plugin.app.vault.adapter.write(
        path,
        JSON.stringify(data)
      );
    } catch (e) {
      console.error("Cache write error:", e);
    }
  }
  // ------------ NEW
  async hashString(input) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
};
var DoenetPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    __publicField(this, "settings");
    __publicField(this, "cssCache", null);
    __publicField(this, "cachedMode", null);
  }
  async onload() {
    console.log("Doenet plugin (iframe mode) loaded");
    await this.loadSettings();
    this.addSettingTab(new DoenetSettingTab(this.app, this));
    this.registerMarkdownCodeBlockProcessor(
      "doenet",
      async (source, el) => {
        await this.renderDoenetIframe(source, el);
      }
    );
  }
  async loadDoenetCSS() {
    if (this.cssCache && this.cachedMode === this.settings.mode) {
      console.log("[Doenet] CSS cache (memory) hit");
      return this.cssCache;
    }
    const cssSource = resolveDoenetCSS(
      this.settings.mode,
      this.app,
      this
    );
    let rawCSS;
    try {
      rawCSS = await fetch(cssSource.primary).then((r) => r.text());
      console.log("[Doenet] CSS loaded from primary:", cssSource.primary);
    } catch (e) {
      if (cssSource.fallback) {
        console.warn("[Doenet] CSS fallback to local");
        rawCSS = await fetch(cssSource.fallback).then((r) => r.text());
      } else {
        throw e;
      }
    }
    this.cssCache = rawCSS;
    this.cachedMode = this.settings.mode;
    return rawCSS;
  }
  // -------------------------------------------------- NEW
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  // --------------------------------------------------
  async parseFirstLineOptions(source) {
    var _a;
    const trimmedSource = source.trim();
    const lines = trimmedSource.split("\n");
    const options = {};
    let startIndex = 0;
    if ((_a = lines[0]) == null ? void 0 : _a.trim().startsWith("#")) {
      const directive = lines[0].trim().substring(1).trim();
      directive.split(/\s+/).forEach((pair) => {
        const [key, value] = pair.split("=");
        if (key && value) {
          options[key.trim()] = value.trim();
        }
      });
      startIndex = 1;
    }
    let doenetML = lines.slice(startIndex).join("\n").trim();
    const isURL = /^https?:\/\/\S+$/.test(doenetML);
    if (isURL) {
      const cache = new CacheManager(this);
      const cached = await cache.get(doenetML);
      if (cached) {
        return {
          doenetML: cached,
          options: { ...options, source: "url" }
        };
      }
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8e3);
        const res = await fetch(doenetML + "?t=" + Date.now(), {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
          throw new Error(`Fetch failed with status ${res.status} ${res.statusText}`);
        }
        const fetchedText = await res.text();
        await cache.set(doenetML, fetchedText);
        if (!fetchedText || !fetchedText.trim()) {
          throw new Error("Fetched content is empty");
        }
        return {
          doenetML: fetchedText.trim(),
          options: { ...options, source: "url" }
        };
      } catch (err) {
        console.error("Error fetching DoenetML from URL:", err);
        const error = err instanceof Error ? err : new Error("Unknown error");
        return {
          doenetML: "",
          options: {
            ...options,
            source: "url",
            error: true,
            message: error.name === "AbortError" ? "Request timed out while fetching URL" : error.message || "Unknown fetch error"
          }
        };
      }
    }
    return { doenetML, options };
  }
  // --------------------------------------------------
  async renderDoenetIframe(source, el) {
    const { doenetML, options } = await this.parseFirstLineOptions(source);
    const showKeyboard = options.showkeyboard === "false";
    const rawCSS = await this.loadDoenetCSS();
    const css = rawCSS + "\n/*# sourceURL=doenet.css */";
    const iframe = document.createElement("iframe");
    const id = "doenet-" + Math.random().toString(36).slice(2);
    const scriptSource = resolveDoenetScript(
      this.settings.mode,
      this.settings.doenetVersion,
      this.app,
      this
    );
    const mathJaxSource = resolveMathJaxScript(
      this.settings.mode,
      this.app,
      this
    );
    iframe.dataset.doenetId = id;
    iframe.style.width = options.width || "100%";
    iframe.style.border = "none";
    iframe.style.overflow = "hidden";
    iframe.style.display = "block";
    iframe.style.height = options.height || "300px";
    iframe.setAttribute("scrolling", "no");
    el.appendChild(iframe);
    iframe.srcdoc = buildIframeSrcdoc({
      css,
      doenetML,
      id,
      showKeyboard,
      scriptSource,
      mathJaxSource,
      mode: this.settings.mode
    });
    iframe.onload = () => {
      try {
        const doc = iframe.contentDocument;
        if (doc == null ? void 0 : doc.body) {
          const resize = () => {
            iframe.style.height = doc.body.scrollHeight + "px";
          };
          resize();
          new ResizeObserver(resize).observe(doc.body);
        }
      } catch (e) {
      }
    };
    const listener = (event) => {
      var _a;
      if (event.source === iframe.contentWindow && ((_a = event.data) == null ? void 0 : _a.type) === "doenet-resize" && event.data.id === id) {
        const TargetHeight = Math.ceil(event.data.height);
        iframe.style.height = TargetHeight + "px";
        iframe.style.overflow = "hidden";
      }
    };
    window.addEventListener("message", listener);
    this.register(() => {
      window.removeEventListener("message", listener);
    });
  }
};
var DoenetSettingTab = class extends import_obsidian2.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    __publicField(this, "plugin");
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Doenet Settings" });
    new import_obsidian2.Setting(containerEl).setName("Doenet loading mode").setDesc(
      "Choose how Doenet, MathJax, and Doenet CSS are loaded (CDN = best performance, Local = offline, Auto = CDN with fallback)"
    ).addDropdown(
      (drop) => drop.addOption("cdn", "CDN (fast, requires internet)").addOption("local", "Local (offline, uses bundled files)").addOption("auto", "Auto (CDN with local fallback)").setValue(this.plugin.settings.mode).onChange(async (value) => {
        this.plugin.settings.mode = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Doenet Version").setDesc("Choose which version of Doenet to use").addDropdown(
      (dropdown) => dropdown.addOption("latest", "Latest (stable)").addOption("dev", "Development").setValue(this.plugin.settings.doenetVersion).onChange(async (value) => {
        this.plugin.settings.doenetVersion = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Enable local caching").setDesc("Cache remotely fetched files locally for faster loading.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.enableCache).onChange(async (value) => {
        this.plugin.settings.enableCache = value;
        await this.plugin.saveSettings();
        this.display();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Cache duration (minutes)").setDesc("How long cached files should be reused before refetching.").addText((text) => {
      text.setPlaceholder("1440").setValue(String(this.plugin.settings.cacheTTL)).setDisabled(!this.plugin.settings.enableCache).onChange(async (value) => {
        const num = parseInt(value);
        this.plugin.settings.cacheTTL = isNaN(num) ? 1440 : num;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian2.Setting(containerEl).setName("Clear cache").setDesc("Delete all locally cached Doenet files.").addButton(
      (button) => button.setButtonText("Clear").setWarning().onClick(async () => {
        const dir = `${this.plugin.manifest.dir}/cache`;
        try {
          if (await this.plugin.app.vault.adapter.exists(dir)) {
            await this.plugin.app.vault.adapter.rmdir(dir, true);
            console.log("[Doenet] Cache cleared");
          } else {
            console.log("[Doenet] No cache folder to clear");
          }
        } catch (e) {
          console.error("[Doenet] Error clearing cache:", e);
        }
        new import_obsidian2.Notice("Doenet cache cleared");
      })
    );
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2lmcmFtZVNyY2RvYy50cyIsICJzcmMvbG9hZGVyLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBQbHVnaW4gYXMgT2JzaWRpYW5QbHVnaW4gfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IFBsdWdpblNldHRpbmdUYWIsIEFwcCwgU2V0dGluZywgTm90aWNlIH0gZnJvbSBcIm9ic2lkaWFuXCI7IC8vTkVXXG5pbXBvcnQgeyBidWlsZElmcmFtZVNyY2RvYyB9IGZyb20gXCIuL2lmcmFtZVNyY2RvY1wiO1xuaW1wb3J0IHsgcmVzb2x2ZURvZW5ldFNjcmlwdCwgcmVzb2x2ZU1hdGhKYXhTY3JpcHQsIHJlc29sdmVEb2VuZXRDU1MgfSBmcm9tIFwiLi9sb2FkZXJcIjtcbmltcG9ydCB0eXBlIHsgRG9lbmV0TW9kZSwgRG9lbmV0VmVyc2lvbiB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbi8vIFNvIG1hbnkgcmVuZGVyIGxheWVycywgYnV0IGl0IHdvcmtzIGFzIHdlbGwgYXNcbi8vIG9uZSBtaWdodCBwb3NzaWJseSBob3BlLlxuLy8gT2JzaWRpYW4gXHUyMTkyIGlmcmFtZSBcdTIxOTIgRG9lbmV0IFx1MjE5MiBKU1hHcmFwaCBcdTIxOTIgU1ZHXG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5pbnRlcmZhY2UgRG9lbmV0T3B0aW9ucyB7XG4gIHdpZHRoPzogc3RyaW5nO1xuICBoZWlnaHQ/OiBzdHJpbmc7XG4gIHNob3drZXlib2FyZD86IHN0cmluZztcbiAgc291cmNlPzogXCJ1cmxcIiB8IFwiaW5saW5lXCI7XG4gIGVycm9yPzogYm9vbGVhbjtcbiAgbWVzc2FnZT86IHN0cmluZztcbiAgW2tleTogc3RyaW5nXTogc3RyaW5nIHwgYm9vbGVhbiB8IHVuZGVmaW5lZDtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gIE5FV1xuXG5cbmludGVyZmFjZSBEb2VuZXRQbHVnaW5TZXR0aW5ncyB7XG4gIG1vZGU6IERvZW5ldE1vZGU7XG4gIGRvZW5ldFZlcnNpb246IERvZW5ldFZlcnNpb247XG4gIGVuYWJsZUNhY2hlOiBib29sZWFuO1xuICBjYWNoZVRUTDogbnVtYmVyO1xufVxuXG5jb25zdCBERUZBVUxUX1NFVFRJTkdTOiBEb2VuZXRQbHVnaW5TZXR0aW5ncyA9IHtcbiAgbW9kZTogXCJhdXRvXCIsXG4gIGRvZW5ldFZlcnNpb246IFwibGF0ZXN0XCIsXG4gIGVuYWJsZUNhY2hlOiBmYWxzZSxcbiAgY2FjaGVUVEw6IDE0NDAsIC8vIDI0IGhvdXJzXG59O1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBORVdcbmNsYXNzIENhY2hlTWFuYWdlciB7XG4gIHBsdWdpbjogRG9lbmV0UGx1Z2luO1xuXG4gIGNvbnN0cnVjdG9yKHBsdWdpbjogRG9lbmV0UGx1Z2luKSB7XG4gICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gIH1cbiAgXG4gIHByaXZhdGUgYXN5bmMgZ2V0Q2FjaGVQYXRoKHVybDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBjb25zdCBoYXNoID0gYXdhaXQgdGhpcy5oYXNoU3RyaW5nKHVybCk7XG4gICAgcmV0dXJuIGAke3RoaXMucGx1Z2luLm1hbmlmZXN0LmRpcn0vY2FjaGUvJHtoYXNofS5qc29uYDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZW5zdXJlQ2FjaGVGb2xkZXIoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZGlyID0gYCR7dGhpcy5wbHVnaW4ubWFuaWZlc3QuZGlyfS9jYWNoZWA7XG5cbiAgICBpZiAoIShhd2FpdCB0aGlzLnBsdWdpbi5hcHAudmF1bHQuYWRhcHRlci5leGlzdHMoZGlyKSkpIHtcbiAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmFwcC52YXVsdC5hZGFwdGVyLm1rZGlyKGRpcik7XG4gICAgfVxuICB9XG4gIFxuICAvLyAtLS0tLS0tLS0tLSBVcGRhdGVkIHdpdGggZGVidWcgb3V0cHV0LlxuICBhc3luYyBnZXQodXJsOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcbiAgICBpZiAoIXRoaXMucGx1Z2luLnNldHRpbmdzLmVuYWJsZUNhY2hlKSB7XG4gICAgICBjb25zb2xlLmxvZyhcIltEb2VuZXRdIENhY2hlIGRpc2FibGVkXCIpO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgcGF0aCA9IGF3YWl0IHRoaXMuZ2V0Q2FjaGVQYXRoKHVybCk7IC8vIFVQREFURUQgdG8gYXN5bmNcblxuICAgIGlmICghKGF3YWl0IHRoaXMucGx1Z2luLmFwcC52YXVsdC5hZGFwdGVyLmV4aXN0cyhwYXRoKSkpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiW0RvZW5ldF0gQ2FjaGUgbWlzcyAobm8gZmlsZSk6XCIsIHVybCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgcmF3ID0gYXdhaXQgdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmFkYXB0ZXIucmVhZChwYXRoKTtcbiAgICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKHJhdyk7XG5cbiAgICAgIGNvbnN0IGFnZU1pbnV0ZXMgPVxuICAgICAgICAoRGF0ZS5ub3coKSAtIGRhdGEudGltZXN0YW1wKSAvICgxMDAwICogNjApO1xuXG4gICAgICBpZiAoYWdlTWludXRlcyA+IHRoaXMucGx1Z2luLnNldHRpbmdzLmNhY2hlVFRMKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiW0RvZW5ldF0gQ2FjaGUgZXhwaXJlZDpcIiwgdXJsKTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIGNvbnNvbGUubG9nKFwiW0RvZW5ldF0gQ2FjaGUgSElUOlwiLCBkYXRhLnVybCk7XG4gICAgICByZXR1cm4gZGF0YS5jb250ZW50O1xuXG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc29sZS5lcnJvcihcIltEb2VuZXRdIENhY2hlIHJlYWQgZXJyb3I6XCIsIGUpO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgc2V0KHVybDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMucGx1Z2luLnNldHRpbmdzLmVuYWJsZUNhY2hlKSByZXR1cm47XG5cbiAgICBjb25zdCBwYXRoID0gYXdhaXQgdGhpcy5nZXRDYWNoZVBhdGgodXJsKTsgLy8gVVBEQVRFRCB0byBhc3luY1xuXG4gICAgYXdhaXQgdGhpcy5lbnN1cmVDYWNoZUZvbGRlcigpO1xuXG4gICAgY29uc3QgZGF0YSA9IHtcbiAgICAgIHVybCwgXG4gICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXG4gICAgICBjb250ZW50LFxuICAgIH07XG5cbiAgICB0cnkge1xuICAgICAgY29uc29sZS5sb2coXCJbRG9lbmV0XSBDYWNoaW5nIHJlc3BvbnNlOlwiLCB1cmwpO1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmFkYXB0ZXIud3JpdGUoXG4gICAgICAgIHBhdGgsXG4gICAgICAgIEpTT04uc3RyaW5naWZ5KGRhdGEpXG4gICAgICApO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJDYWNoZSB3cml0ZSBlcnJvcjpcIiwgZSk7XG4gICAgfVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tIE5FV1xuICBwcml2YXRlIGFzeW5jIGhhc2hTdHJpbmcoaW5wdXQ6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3QgZW5jb2RlciA9IG5ldyBUZXh0RW5jb2RlcigpO1xuICAgIGNvbnN0IGRhdGEgPSBlbmNvZGVyLmVuY29kZShpbnB1dCk7XG5cbiAgICBjb25zdCBoYXNoQnVmZmVyID0gYXdhaXQgY3J5cHRvLnN1YnRsZS5kaWdlc3QoXCJTSEEtMjU2XCIsIGRhdGEpO1xuICAgIGNvbnN0IGhhc2hBcnJheSA9IEFycmF5LmZyb20obmV3IFVpbnQ4QXJyYXkoaGFzaEJ1ZmZlcikpO1xuXG4gICAgcmV0dXJuIGhhc2hBcnJheS5tYXAoYiA9PiBiLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCBcIjBcIikpLmpvaW4oXCJcIik7XG4gIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIERvZW5ldFBsdWdpbiBleHRlbmRzIE9ic2lkaWFuUGx1Z2luIHtcbiAgc2V0dGluZ3MhOiBEb2VuZXRQbHVnaW5TZXR0aW5ncztcbiAgcHJpdmF0ZSBjc3NDYWNoZTogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgY2FjaGVkTW9kZTogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gIFxuICBhc3luYyBvbmxvYWQoKSB7XG4gICAgY29uc29sZS5sb2coXCJEb2VuZXQgcGx1Z2luIChpZnJhbWUgbW9kZSkgbG9hZGVkXCIpO1xuXG4gICAgYXdhaXQgdGhpcy5sb2FkU2V0dGluZ3MoKTsgIC8vIE5FV1xuICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgRG9lbmV0U2V0dGluZ1RhYih0aGlzLmFwcCwgdGhpcykpOyAvLyBORVdcblxuXG4gICAgdGhpcy5yZWdpc3Rlck1hcmtkb3duQ29kZUJsb2NrUHJvY2Vzc29yKFxuICAgICAgXCJkb2VuZXRcIixcbiAgICAgIGFzeW5jIChzb3VyY2UgOiBzdHJpbmcsIGVsOiBIVE1MRWxlbWVudCkgPT4ge1xuICAgICAgICBhd2FpdCB0aGlzLnJlbmRlckRvZW5ldElmcmFtZShzb3VyY2UsIGVsKTtcbiAgICAgIH1cbiAgICApO1xuICB9XG5cbiAgYXN5bmMgbG9hZERvZW5ldENTUygpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGlmICh0aGlzLmNzc0NhY2hlICYmIHRoaXMuY2FjaGVkTW9kZSA9PT0gdGhpcy5zZXR0aW5ncy5tb2RlKSB7XG4gICAgICBjb25zb2xlLmxvZyhcIltEb2VuZXRdIENTUyBjYWNoZSAobWVtb3J5KSBoaXRcIik7XG4gICAgICByZXR1cm4gdGhpcy5jc3NDYWNoZTtcbiAgICB9XG5cbiAgICBjb25zdCBjc3NTb3VyY2UgPSByZXNvbHZlRG9lbmV0Q1NTKFxuICAgICAgdGhpcy5zZXR0aW5ncy5tb2RlIGFzIERvZW5ldE1vZGUsXG4gICAgICB0aGlzLmFwcCBhcyBBcHAsXG4gICAgICB0aGlzIGFzIERvZW5ldFBsdWdpblxuICAgICk7XG5cbiAgICBsZXQgcmF3Q1NTOiBzdHJpbmc7XG5cbiAgICB0cnkge1xuICAgICAgcmF3Q1NTID0gYXdhaXQgZmV0Y2goY3NzU291cmNlLnByaW1hcnkpLnRoZW4ociA9PiByLnRleHQoKSk7XG4gICAgICBjb25zb2xlLmxvZyhcIltEb2VuZXRdIENTUyBsb2FkZWQgZnJvbSBwcmltYXJ5OlwiLCBjc3NTb3VyY2UucHJpbWFyeSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGNzc1NvdXJjZS5mYWxsYmFjaykge1xuICAgICAgICBjb25zb2xlLndhcm4oXCJbRG9lbmV0XSBDU1MgZmFsbGJhY2sgdG8gbG9jYWxcIik7XG4gICAgICAgIHJhd0NTUyA9IGF3YWl0IGZldGNoKGNzc1NvdXJjZS5mYWxsYmFjaykudGhlbihyID0+IHIudGV4dCgpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5jc3NDYWNoZSA9IHJhd0NTUztcbiAgICB0aGlzLmNhY2hlZE1vZGUgPSB0aGlzLnNldHRpbmdzLm1vZGU7XG5cbiAgICByZXR1cm4gcmF3Q1NTO1xuICB9XG5cblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBORVdcblxuICBhc3luYyBsb2FkU2V0dGluZ3MoKSB7XG4gICAgdGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfU0VUVElOR1MsIGF3YWl0IHRoaXMubG9hZERhdGEoKSk7XG4gIH1cblxuICBhc3luYyBzYXZlU2V0dGluZ3MoKSB7XG4gICAgYXdhaXQgdGhpcy5zYXZlRGF0YSh0aGlzLnNldHRpbmdzKTtcbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGFzeW5jIHBhcnNlRmlyc3RMaW5lT3B0aW9ucyhzb3VyY2UgOiBzdHJpbmcpOiBQcm9taXNlPHtcbiAgICBkb2VuZXRNTDogc3RyaW5nOyBcbiAgICBvcHRpb25zOiBEb2VuZXRPcHRpb25zXG4gIH0+IHtcbiAgICBjb25zdCB0cmltbWVkU291cmNlID0gc291cmNlLnRyaW0oKTtcbiAgICBjb25zdCBsaW5lcyA9IHRyaW1tZWRTb3VyY2Uuc3BsaXQoXCJcXG5cIik7XG4gICAgY29uc3Qgb3B0aW9uczogRG9lbmV0T3B0aW9ucyA9IHt9O1xuICAgIGxldCBzdGFydEluZGV4ID0gMDtcblxuICAgIC8vIFN0cmlwcyBmaXJzdC1saW5lIG9wdGlvbnMgYW5kIHJldHVybnMgdGhlbSxcbiAgICAvLyBhbG9uZyB3aXRoIHRoZSByZW1haW5pbmcgRG9lbmV0TUwgY29udGVudC5cbiAgICBpZiAobGluZXNbMF0/LnRyaW0oKS5zdGFydHNXaXRoKFwiI1wiKSkge1xuICAgICAgY29uc3QgZGlyZWN0aXZlID0gbGluZXNbMF0hLnRyaW0oKS5zdWJzdHJpbmcoMSkudHJpbSgpO1xuXG4gICAgICBkaXJlY3RpdmUuc3BsaXQoL1xccysvKS5mb3JFYWNoKChwYWlyKSA9PiB7XG4gICAgICAgIGNvbnN0IFtrZXksIHZhbHVlXSA9IHBhaXIuc3BsaXQoXCI9XCIpO1xuICAgICAgICBpZiAoa2V5ICYmIHZhbHVlKSB7XG4gICAgICAgICAgb3B0aW9uc1trZXkudHJpbSgpXSA9IHZhbHVlLnRyaW0oKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHN0YXJ0SW5kZXggPSAxO1xuICAgIH1cbiAgICBsZXQgZG9lbmV0TUwgPSBsaW5lcy5zbGljZShzdGFydEluZGV4KS5qb2luKFwiXFxuXCIpLnRyaW0oKTtcblxuICAgIC8vIFByb2Nlc3MgY29udGVudCwgaWYgdXJsLCBmZXRjaCBjb250ZW50LCBpZiBpbmxpbmUsIHVzZSBhcy1pcy5cbiAgICBjb25zdCBpc1VSTCA9IC9eaHR0cHM/OlxcL1xcL1xcUyskLy50ZXN0KGRvZW5ldE1MKTtcbiAgICBpZiAoaXNVUkwpIHtcbiAgICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBORVdcbiAgICAgIGNvbnN0IGNhY2hlID0gbmV3IENhY2hlTWFuYWdlcih0aGlzKTtcblxuICAgICAgLy8gVHJ5IGNhY2hlIGZpcnN0XG4gICAgICBjb25zdCBjYWNoZWQgPSBhd2FpdCBjYWNoZS5nZXQoZG9lbmV0TUwpO1xuICAgICAgaWYgKGNhY2hlZCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGRvZW5ldE1MOiBjYWNoZWQsXG4gICAgICAgICAgb3B0aW9uczogeyAuLi5vcHRpb25zLCBzb3VyY2U6IFwidXJsXCIgfVxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICB0cnkge1xuICAgICAgICAvLyBUaW1lb3V0IGFmdGVyIDggc2Vjb25kcyB0byBwcmV2ZW50IGhhbmdpbmcgb24gYmFkIFVSTHMuXG4gICAgICAgIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG4gICAgICAgIGNvbnN0IHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoKCkgPT4gY29udHJvbGxlci5hYm9ydCgpLCA4MDAwKTsgLy8gOHMgdGltZW91dFxuICAgICAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaChkb2VuZXRNTCArIFwiP3Q9XCIgKyBEYXRlLm5vdygpLCB7XG4gICAgICAgICAgc2lnbmFsOiBjb250cm9sbGVyLnNpZ25hbFxuICAgICAgICB9KTtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIEhUVFAgZXJyb3JzXG4gICAgICAgIGlmICghcmVzLm9rKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGZXRjaCBmYWlsZWQgd2l0aCBzdGF0dXMgJHtyZXMuc3RhdHVzfSAke3Jlcy5zdGF0dXNUZXh0fWApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZmV0Y2hlZFRleHQgPSBhd2FpdCByZXMudGV4dCgpO1xuICAgICAgICBhd2FpdCBjYWNoZS5zZXQoZG9lbmV0TUwsIGZldGNoZWRUZXh0KTtcblxuICAgICAgICAvLyBWYWxpZGF0ZSByZXNwb25zZSBpcyBub24tZW1wdHkuXG4gICAgICAgIGlmICghZmV0Y2hlZFRleHQgfHwgIWZldGNoZWRUZXh0LnRyaW0oKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZldGNoZWQgY29udGVudCBpcyBlbXB0eVwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJldHVybiBEb2VuZXRNTCB3aXRoIHNvdXJjZSBpbmZvIGZvciBkZWJ1Z2dpbmcuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgZG9lbmV0TUw6IGZldGNoZWRUZXh0LnRyaW0oKSxcbiAgICAgICAgICBvcHRpb25zOiB7IC4uLm9wdGlvbnMsIHNvdXJjZTogXCJ1cmxcIiB9XG4gICAgICAgIH07XG5cbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiRXJyb3IgZmV0Y2hpbmcgRG9lbmV0TUwgZnJvbSBVUkw6XCIsIGVycik7XG5cbiAgICAgICAgY29uc3QgZXJyb3IgPSBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyciA6IG5ldyBFcnJvcihcIlVua25vd24gZXJyb3JcIik7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBkb2VuZXRNTDogXCJcIixcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgICAgc291cmNlOiBcInVybFwiLFxuICAgICAgICAgICAgZXJyb3I6IHRydWUsXG4gICAgICAgICAgICBtZXNzYWdlOiBlcnJvci5uYW1lID09PSBcIkFib3J0RXJyb3JcIlxuICAgICAgICAgICAgICA/IFwiUmVxdWVzdCB0aW1lZCBvdXQgd2hpbGUgZmV0Y2hpbmcgVVJMXCJcbiAgICAgICAgICAgICAgOiBlcnJvci5tZXNzYWdlIHx8IFwiVW5rbm93biBmZXRjaCBlcnJvclwiXG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBSZXR1cm4gaW5saW5lIERvZW5ldE1MIHdpdGggYW55IHByb2Nlc3NlZCBvcHRpb25zLlxuICAgIHJldHVybiB7IGRvZW5ldE1MLCBvcHRpb25zIH07XG4gIH1cblxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGFzeW5jIHJlbmRlckRvZW5ldElmcmFtZShzb3VyY2UgOiBzdHJpbmcsIGVsOiBIVE1MRWxlbWVudCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHsgZG9lbmV0TUwsIG9wdGlvbnMgfSA9IGF3YWl0IHRoaXMucGFyc2VGaXJzdExpbmVPcHRpb25zKHNvdXJjZSk7XG4gICAgY29uc3Qgc2hvd0tleWJvYXJkID0gb3B0aW9ucy5zaG93a2V5Ym9hcmQgPT09IFwiZmFsc2VcIjtcbiAgICBjb25zdCByYXdDU1MgPSBhd2FpdCB0aGlzLmxvYWREb2VuZXRDU1MoKTtcbiAgICBjb25zdCBjc3MgPSByYXdDU1MgKyBcIlxcbi8qIyBzb3VyY2VVUkw9ZG9lbmV0LmNzcyAqL1wiO1xuICAgIGNvbnN0IGlmcmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpZnJhbWVcIik7XG4gICAgY29uc3QgaWQgPSBcImRvZW5ldC1cIiArIE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnNsaWNlKDIpO1xuXG4gICAgY29uc3Qgc2NyaXB0U291cmNlID0gcmVzb2x2ZURvZW5ldFNjcmlwdChcbiAgICAgIHRoaXMuc2V0dGluZ3MubW9kZSxcbiAgICAgIHRoaXMuc2V0dGluZ3MuZG9lbmV0VmVyc2lvbixcbiAgICAgIHRoaXMuYXBwLFxuICAgICAgdGhpc1xuICAgICk7XG5cbiAgICBjb25zdCBtYXRoSmF4U291cmNlID0gcmVzb2x2ZU1hdGhKYXhTY3JpcHQoXG4gICAgICB0aGlzLnNldHRpbmdzLm1vZGUsXG4gICAgICB0aGlzLmFwcCxcbiAgICAgIHRoaXNcbiAgICApO1xuXG4gICAgLy8gU2V0IGlmcmFtZSBhdHRyaWJ1dGVzIGFuZCBzdHlsZXMgZm9yIG9wdGltYWwgRG9lbmV0IHJlbmRlcmluZ1xuICAgIGlmcmFtZS5kYXRhc2V0LmRvZW5ldElkID0gaWQ7XG4gICAgaWZyYW1lLnN0eWxlLndpZHRoID0gb3B0aW9ucy53aWR0aCB8fCBcIjEwMCVcIjsgLy8gRnVsbCB3aWR0aCBieSBkZWZhdWx0XG4gICAgaWZyYW1lLnN0eWxlLmJvcmRlciA9IFwibm9uZVwiOyAvLyBSZW1vdmUgZGVmYXVsdCBib3JkZXJcbiAgICBpZnJhbWUuc3R5bGUub3ZlcmZsb3cgPSBcImhpZGRlblwiOyAvLyBIaWRlIHNjcm9sbGJhcnNcbiAgICBpZnJhbWUuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjsgLy8gUmVtb3ZlIGRlZmF1bHQgaW5saW5lIHNwYWNpbmdcbiAgICBpZnJhbWUuc3R5bGUuaGVpZ2h0ID0gb3B0aW9ucy5oZWlnaHQgfHwgXCIzMDBweFwiOyAvLyBQcmV2ZW50IGNvbGxhcHNlXG4gICAgaWZyYW1lLnNldEF0dHJpYnV0ZShcInNjcm9sbGluZ1wiLCBcIm5vXCIpOyAvLyBMZWdhY3kgZmFsbGJhY2sgc2FmZXR5IG5ldFxuICAgIGVsLmFwcGVuZENoaWxkKGlmcmFtZSk7IC8vIEFkZCBpZnJhbWUgdG8gRE9NIGJlZm9yZSBzZXR0aW5nIHNyY2RvYyBmb3IgYmV0dGVyIHBlcmZvcm1hbmNlXG5cblxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tSW5qZWN0IEZVTEwgaWZyYW1lIGNvbnRlbnRcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vIFN3aXRjaCB0byBjYWxsaW5nIGZ1bmN0aW9uIHRvIGJ1aWxkIGZ1bGwgc3JjZG9jIGNvbnRlbnQsIGluY2x1ZGluZyBDU1MgYW5kIERvZW5ldE1MLlxuICAgIGlmcmFtZS5zcmNkb2MgPSBidWlsZElmcmFtZVNyY2RvYyh7XG4gICAgICBjc3MsXG4gICAgICBkb2VuZXRNTCxcbiAgICAgIGlkLFxuICAgICAgc2hvd0tleWJvYXJkLFxuICAgICAgc2NyaXB0U291cmNlLFxuICAgICAgbWF0aEpheFNvdXJjZSxcbiAgICAgIG1vZGU6IHRoaXMuc2V0dGluZ3MubW9kZVxuICAgIH0pO1xuXG4gICAgLy8gU2FmZSBIZWlnaHQgRmFsbGJhY2s/IElzIHRoaXMgc3RpbGwgbmVjZXNzYXJ5P1xuICAgIGlmcmFtZS5vbmxvYWQgPSAoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBkb2MgPSBpZnJhbWUuY29udGVudERvY3VtZW50O1xuICAgICAgICBpZiAoZG9jPy5ib2R5KSB7XG4gICAgICAgICAgY29uc3QgcmVzaXplID0gKCkgPT4ge1xuICAgICAgICAgICAgaWZyYW1lLnN0eWxlLmhlaWdodCA9IGRvYy5ib2R5LnNjcm9sbEhlaWdodCArIFwicHhcIjtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgcmVzaXplKCk7IC8vIGluaXRpYWxcbiAgICAgICAgICBuZXcgUmVzaXplT2JzZXJ2ZXIocmVzaXplKS5vYnNlcnZlKGRvYy5ib2R5KTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge31cbiAgICB9O1xuXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyBQYXJlbnQgcmVzaXplIGxpc3RlbmVyIChVTkNIQU5HRUQpXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBjb25zdCBsaXN0ZW5lciA9IChldmVudDogTWVzc2FnZUV2ZW50KSA9PiB7XG4gICAgICBpZiAoXG4gICAgICAgIGV2ZW50LnNvdXJjZSA9PT0gaWZyYW1lLmNvbnRlbnRXaW5kb3cgJiZcbiAgICAgICAgZXZlbnQuZGF0YT8udHlwZSA9PT0gXCJkb2VuZXQtcmVzaXplXCIgJiZcbiAgICAgICAgZXZlbnQuZGF0YS5pZCA9PT0gaWRcbiAgICAgICkge1xuICAgICAgICAvLyBNYXRoLmNlaWwgcHJldmVudHMgZnJhY3Rpb25hbCBwaXhlbCBnYXBzIHRoYXQgY2F1c2Ugc2Nyb2xsYmFyc1xuICAgICAgICBjb25zdCBUYXJnZXRIZWlnaHQgPSBNYXRoLmNlaWwoZXZlbnQuZGF0YS5oZWlnaHQpO1xuICAgICAgICBcbiAgICAgICAgaWZyYW1lLnN0eWxlLmhlaWdodCA9IFRhcmdldEhlaWdodCArIFwicHhcIjtcbiAgICAgICAgaWZyYW1lLnN0eWxlLm92ZXJmbG93ID0gXCJoaWRkZW5cIjsgLy8gRm9yY2UtZGlzYWJsZSBzY3JvbGxiYXJzIGR5bmFtaWNhbGx5XG4gICAgICB9XG4gICAgfTtcbiAgICAvLyBjb25zdCBsaXN0ZW5lciA9IChldmVudDogTWVzc2FnZUV2ZW50KSA9PiB7XG4gICAgLy8gLy8gIGNvbnNvbGUubG9nKFwiTUVTU0FHRSBSRUNFSVZFRDpcIiwge1xuICAgIC8vIC8vICAgIGRhdGE6IGV2ZW50LmRhdGEsXG4gICAgLy8gLy8gICAgb3JpZ2luOiBldmVudC5vcmlnaW4sXG4gICAgLy8gLy8gICAgc291cmNlTWF0Y2hlczogZXZlbnQuc291cmNlID09PSBpZnJhbWUuY29udGVudFdpbmRvd1xuICAgIC8vIC8vICB9KTtcblxuICAgIC8vICAgaWYgKFxuICAgIC8vICAgICBldmVudC5zb3VyY2UgPT09IGlmcmFtZS5jb250ZW50V2luZG93ICYmXG4gICAgLy8gICAgIGV2ZW50LmRhdGE/LnR5cGUgPT09IFwiZG9lbmV0LXJlc2l6ZVwiICYmXG4gICAgLy8gICAgIGV2ZW50LmRhdGEuaWQgPT09IGlkXG4gICAgLy8gICApIHtcbiAgICAvLyAgICAgaWZyYW1lLnN0eWxlLmhlaWdodCA9IGV2ZW50LmRhdGEuaGVpZ2h0ICsgXCJweFwiO1xuICAgIC8vICAgfVxuICAgIC8vIH07XG5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgbGlzdGVuZXIpO1xuXG4gICAgLy8gQ2xlYW51cFxuICAgIHRoaXMucmVnaXN0ZXIoKCkgPT4ge1xuICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGxpc3RlbmVyKTtcbiAgICB9KTtcbiAgfVxufTtcblxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAgTkVXXG5jbGFzcyBEb2VuZXRTZXR0aW5nVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XG4gIHBsdWdpbjogRG9lbmV0UGx1Z2luO1xuXG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IERvZW5ldFBsdWdpbikge1xuICAgIHN1cGVyKGFwcCwgcGx1Z2luKTtcbiAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgfVxuXG4gIGRpc3BsYXkoKTogdm9pZCB7XG4gICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpcztcbiAgICBjb250YWluZXJFbC5lbXB0eSgpO1xuXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiRG9lbmV0IFNldHRpbmdzXCIgfSk7XG5cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy8gRW5hYmxlIGxvYWQgZnJvbSBMb2NhbCwgQ0ROLCBvciBBdXRvIChDRE4gd2l0aCBMb2NhbCBmYWxsYmFjaylcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkRvZW5ldCBsb2FkaW5nIG1vZGVcIilcbiAgICAgIC5zZXREZXNjKFxuICAgICAgICBcIkNob29zZSBob3cgRG9lbmV0LCBNYXRoSmF4LCBhbmQgRG9lbmV0IENTUyBhcmUgbG9hZGVkIChDRE4gPSBiZXN0IHBlcmZvcm1hbmNlLCBMb2NhbCA9IG9mZmxpbmUsIEF1dG8gPSBDRE4gd2l0aCBmYWxsYmFjaylcIlxuICAgICAgKVxuICAgICAgLmFkZERyb3Bkb3duKGRyb3AgPT5cbiAgICAgICAgZHJvcFxuICAgICAgICAgIC5hZGRPcHRpb24oXCJjZG5cIiwgXCJDRE4gKGZhc3QsIHJlcXVpcmVzIGludGVybmV0KVwiKVxuICAgICAgICAgIC5hZGRPcHRpb24oXCJsb2NhbFwiLCBcIkxvY2FsIChvZmZsaW5lLCB1c2VzIGJ1bmRsZWQgZmlsZXMpXCIpXG4gICAgICAgICAgLmFkZE9wdGlvbihcImF1dG9cIiwgXCJBdXRvIChDRE4gd2l0aCBsb2NhbCBmYWxsYmFjaylcIilcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MubW9kZSlcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLm1vZGUgPSB2YWx1ZSBhcyBEb2VuZXRNb2RlO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgfSlcbiAgICAgICk7XG5cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy8gRW5hYmxlIFZlcnNpb24gU2VsZWN0aW9uXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAgIC5zZXROYW1lKFwiRG9lbmV0IFZlcnNpb25cIilcbiAgICAgICAgICAuc2V0RGVzYyhcIkNob29zZSB3aGljaCB2ZXJzaW9uIG9mIERvZW5ldCB0byB1c2VcIilcbiAgICAgICAgICAuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PlxuICAgICAgICAgICAgZHJvcGRvd25cbiAgICAgICAgICAgICAgLmFkZE9wdGlvbihcImxhdGVzdFwiLCBcIkxhdGVzdCAoc3RhYmxlKVwiKVxuICAgICAgICAgICAgICAuYWRkT3B0aW9uKFwiZGV2XCIsIFwiRGV2ZWxvcG1lbnRcIilcbiAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRvZW5ldFZlcnNpb24pXG4gICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWU6IFN0cmluZykgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmRvZW5ldFZlcnNpb24gPSB2YWx1ZSBhcyBEb2VuZXRWZXJzaW9uO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICk7XG5cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy8gRW5hYmxlIENhY2hlIFRvZ2dsZVxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiRW5hYmxlIGxvY2FsIGNhY2hpbmdcIilcbiAgICAgIC5zZXREZXNjKFwiQ2FjaGUgcmVtb3RlbHkgZmV0Y2hlZCBmaWxlcyBsb2NhbGx5IGZvciBmYXN0ZXIgbG9hZGluZy5cIilcbiAgICAgIC5hZGRUb2dnbGUodG9nZ2xlID0+XG4gICAgICAgIHRvZ2dsZVxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbmFibGVDYWNoZSlcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbmFibGVDYWNoZSA9IHZhbHVlO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG5cbiAgICAgICAgICAgIHRoaXMuZGlzcGxheSgpOyAvLyByZWZyZXNoIFVJXG4gICAgICAgICAgfSlcbiAgICAgICk7XG5cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy8gQ2FjaGUgVFRMIElucHV0XG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJDYWNoZSBkdXJhdGlvbiAobWludXRlcylcIilcbiAgICAgIC5zZXREZXNjKFwiSG93IGxvbmcgY2FjaGVkIGZpbGVzIHNob3VsZCBiZSByZXVzZWQgYmVmb3JlIHJlZmV0Y2hpbmcuXCIpXG4gICAgICAuYWRkVGV4dCh0ZXh0ID0+IHtcbiAgICAgICAgdGV4dFxuICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcihcIjE0NDBcIilcbiAgICAgICAgICAuc2V0VmFsdWUoU3RyaW5nKHRoaXMucGx1Z2luLnNldHRpbmdzLmNhY2hlVFRMKSlcbiAgICAgICAgICAuc2V0RGlzYWJsZWQoIXRoaXMucGx1Z2luLnNldHRpbmdzLmVuYWJsZUNhY2hlKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG51bSA9IHBhcnNlSW50KHZhbHVlKTtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmNhY2hlVFRMID0gaXNOYU4obnVtKSA/IDE0NDAgOiBudW07XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyBDbGVhciBDYWNoZSBCdXR0b25cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkNsZWFyIGNhY2hlXCIpXG4gICAgICAuc2V0RGVzYyhcIkRlbGV0ZSBhbGwgbG9jYWxseSBjYWNoZWQgRG9lbmV0IGZpbGVzLlwiKVxuICAgICAgLmFkZEJ1dHRvbihidXR0b24gPT5cbiAgICAgICAgYnV0dG9uXG4gICAgICAgICAgLnNldEJ1dHRvblRleHQoXCJDbGVhclwiKVxuICAgICAgICAgIC5zZXRXYXJuaW5nKClcbiAgICAgICAgICAub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBkaXIgPSBgJHt0aGlzLnBsdWdpbi5tYW5pZmVzdC5kaXJ9L2NhY2hlYDtcblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgaWYgKGF3YWl0IHRoaXMucGx1Z2luLmFwcC52YXVsdC5hZGFwdGVyLmV4aXN0cyhkaXIpKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmFkYXB0ZXIucm1kaXIoZGlyLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIltEb2VuZXRdIENhY2hlIGNsZWFyZWRcIik7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJbRG9lbmV0XSBObyBjYWNoZSBmb2xkZXIgdG8gY2xlYXJcIik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIltEb2VuZXRdIEVycm9yIGNsZWFyaW5nIGNhY2hlOlwiLCBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJEb2VuZXQgY2FjaGUgY2xlYXJlZFwiKTtcbiAgICAgICAgICB9KVxuICAgICAgKTsgIFxuICB9XG59IiwgImV4cG9ydCBmdW5jdGlvbiBidWlsZElmcmFtZVNyY2RvYyhwYXJhbXM6IHtcbiAgICBjc3M6IHN0cmluZztcbiAgICBkb2VuZXRNTDogc3RyaW5nO1xuICAgIGlkOiBzdHJpbmc7XG4gICAgc2hvd0tleWJvYXJkOiBib29sZWFuO1xuICAgIHNjcmlwdFNvdXJjZTogeyBwcmltYXJ5OiBzdHJpbmc7IGZhbGxiYWNrPzogc3RyaW5nIH07XG4gICAgbWF0aEpheFNvdXJjZTogeyBwcmltYXJ5OiBzdHJpbmc7IGZhbGxiYWNrPzogc3RyaW5nIH07XG4gICAgbW9kZTogRG9lbmV0TW9kZTtcbn0pOiBzdHJpbmcge1xuICBjb25zdCB7IGNzcywgZG9lbmV0TUwsIGlkLCBzaG93S2V5Ym9hcmQsIHNjcmlwdFNvdXJjZSwgbWF0aEpheFNvdXJjZSwgbW9kZSB9ID0gcGFyYW1zO1xuICByZXR1cm4gYFxuICA8IURPQ1RZUEUgaHRtbD5cbjxodG1sPjxoZWFkPjxtZXRhIGNoYXJzZXQ9XCJVVEYtOFwiPlxuXG5cbjxzY3JpcHQgdHlwZT1cIm1vZHVsZVwiPlxuXG5cbmFzeW5jIGZ1bmN0aW9uIGxvYWRTY3JpcHQoc3JjKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY29uc3QgcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzY3JpcHRcIik7XG4gICAgcy5zcmMgPSBzcmM7XG4gICAgcy5vbmxvYWQgPSByZXNvbHZlO1xuICAgIHMub25lcnJvciA9IHJlamVjdDtcbiAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHMpO1xuICB9KTtcbn1cblxuY29uc29sZS5sb2coXCJNb2RlOlwiLCBcIiR7bW9kZX1cIik7XG5cbmxldCBtYXRoSmF4TG9hZGVkID0gZmFsc2U7XG5cbi8vIC0tLS0tLS0tLS0tIE1hdGhKYXhcbnRyeSB7XG4gIGF3YWl0IGxvYWRTY3JpcHQoXCIke21hdGhKYXhTb3VyY2UucHJpbWFyeX1cIik7XG4gIG1hdGhKYXhMb2FkZWQgPSB0cnVlO1xufSBjYXRjaCAoZSkge1xuICAke21vZGUgPT09IFwiYXV0b1wiID8gYFxuICBjb25zb2xlLndhcm4oXCJNYXRoSmF4IHByaW1hcnkgZmFpbGVkLCB1c2luZyBmYWxsYmFja1wiKTtcbiAgYXdhaXQgbG9hZFNjcmlwdChcIiR7bWF0aEpheFNvdXJjZS5mYWxsYmFja31cIik7XG4gIG1hdGhKYXhMb2FkZWQgPSB0cnVlO1xuICBgIDogXCJcIn1cbn1cblxuPC9zY3JpcHQ+XG5cblxuPHN0eWxlPlxuJHtjc3N9XG48L3N0eWxlPlxuXG48c3R5bGU+XG4gIGJvZHkge1xuICAgIG1hcmdpbjogMDtcbiAgICBwYWRkaW5nOiAxMHB4O1xuICAgIG92ZXJmbG93OiB2aXNpYmxlO1xuICAgIGhlaWdodDogYXV0bztcbiAgfVxuXG4vKiA9PT09PT09PT09PT09IERPRU5FVCBFWENFU1NJVkUgU1BBQ0lORyBGSVggPT09PT09PT09PT09PSAqL1xuLyogSWYgbWF0aCByZW5kZXJzIHN0cmFuZ2VseSwgaXQncyBwcm9iYWJseSBzb21ldGhpbmcgaGVyZS4gKi9cbi8qIEtpbGwgdmVydGljYWwgc3RhY2tpbmcgbWFyZ2lucyAqL1xuLmRvZW5ldC12aWV3ZXIgPiBkaXYge1xuICBtYXJnaW4tdG9wOiAwICFpbXBvcnRhbnQ7XG4gIG1hcmdpbi1ib3R0b206IDAgIWltcG9ydGFudDtcbn1cbi8qIEtpbGwgZ3JhcGggY29udGFpbmVyIG1hcmdpbnMsIGh1Z2UgaW1wcm92ZW1lbnQgb24gT2JzaWRpYW4gZW1iZWRkaW5nICovXG4uanhnYm94IHtcbiAgbWFyZ2luLXRvcDogMCAhaW1wb3J0YW50O1xuICBtYXJnaW4tYm90dG9tOiAwICFpbXBvcnRhbnQ7XG59XG4vKiBSZW1vdmUgaG9yaXpvbnRhbCBwYWRkaW5nICsgd2lkdGggY2FwICovXG4uZG9lbmV0LXZpZXdlciB7XG4gIHBhZGRpbmctbGVmdDogMCAhaW1wb3J0YW50O1xuICBwYWRkaW5nLXJpZ2h0OiAwICFpbXBvcnRhbnQ7XG4gIFBhZGRpbmc6IDAgIWltcG9ydGFudDtcbiAgbWF4LXdpZHRoOiAxMDAlICFpbXBvcnRhbnQ7XG59XG4vKiBQcmV2ZW50IG5lc3RlZCB3cmFwcGVyIGJ1aWxkdXAgKi9cbiNkb2VuZXQtdmlld2VyIGRpdltzdHlsZSo9XCJtYXJnaW46IDEycHhcIl0ge1xuICBtYXJnaW46IDAgIWltcG9ydGFudDtcbn1cbi8qID09PT09PT09PT09PT0gRE9FTkVUIEdSQVBIIEFYRVMgPT09PT09PT09PT09PSAqL1xuLyogVG9vIGJvbGQgLS0gZGVlbXBoYXNpemUgdGhlbSBhIGJpdC4gKi9cbi5qeGdib3ggbGluZSB7XG4gIHN0cm9rZTogIzY2NjY2NiAhaW1wb3J0YW50O1xufVxuLyogTGlnaHQgZ3JheSBncmlkICovXG4uanhnYm94IHBhdGhbc3Ryb2tlLW9wYWNpdHk9XCIwLjVcIl0ge1xuICBzdHJva2U6ICNiYmJiYmIgIWltcG9ydGFudDtcbiAgc3Ryb2tlLW9wYWNpdHk6IDAuNTUgIWltcG9ydGFudDtcbn1cbjwvc3R5bGU+PC9oZWFkPlxuXG48Ym9keT5cblxuPGRpdiBpZD1cImFwcFwiPjwvZGl2PlxuXG5cbjxzY3JpcHQgdHlwZT1cIm1vZHVsZVwiPlxuY29uc3QgcHJpbWFyeSA9IFwiJHtzY3JpcHRTb3VyY2UucHJpbWFyeX1cIjtcbmNvbnN0IGZhbGxiYWNrID0gXCIke3NjcmlwdFNvdXJjZS5mYWxsYmFjayB8fCBcIlwifVwiO1xuY29uc3QgbW9kZSA9IFwiJHttb2RlfVwiO1xuXG5sZXQgRG9lbmV0O1xuXG50cnkge1xuICBEb2VuZXQgPSBhd2FpdCBpbXBvcnQocHJpbWFyeSk7XG4gIGNvbnNvbGUubG9nKFwiW0RvZW5ldF0gTG9hZGVkIHByaW1hcnk6XCIsIHByaW1hcnkpO1xufSBjYXRjaCAoZSkge1xuICBpZiAobW9kZSA9PT0gXCJhdXRvXCIgJiYgZmFsbGJhY2spIHtcbiAgICBjb25zb2xlLndhcm4oXCJbRG9lbmV0XSBQcmltYXJ5IGZhaWxlZCwgdXNpbmcgZmFsbGJhY2s6XCIsIGZhbGxiYWNrKTtcbiAgICBEb2VuZXQgPSBhd2FpdCBpbXBvcnQoZmFsbGJhY2spO1xuICB9IGVsc2Uge1xuICAgIHRocm93IGU7XG4gIH1cbn1cblxuY29uc3QgY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJhcHBcIik7XG5cbi8vIEluamVjdCBEb2VuZXRNTFxuY29uc3Qgc2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNjcmlwdFwiKTtcbnNjcmlwdC50eXBlID0gXCJ0ZXh0L2RvZW5ldG1sXCI7XG5zY3JpcHQudGV4dENvbnRlbnQgPSAke0pTT04uc3RyaW5naWZ5KGRvZW5ldE1MKX07XG5jb250YWluZXIuYXBwZW5kQ2hpbGQoc2NyaXB0KTtcblxuRG9lbmV0LnJlbmRlckRvZW5ldFZpZXdlclRvQ29udGFpbmVyKFxuICBjb250YWluZXIsXG4gIG51bGwsXG4gIHsgYWRkVmlydHVhbEtleWJvYXJkOiAke3Nob3dLZXlib2FyZH0gfVxuKTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFJFU0laSU5HIE9GIElGUkFNRSBUTyBGSVQgQ09OVEVOVCBIRUlHSFRcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5mdW5jdGlvbiBzZW5kU2l6ZSgpIHtcbiAgY29uc3QgaGVpZ2h0ID0gZG9jdW1lbnQuYm9keS5zY3JvbGxIZWlnaHQ7XG5cbiAgcGFyZW50LnBvc3RNZXNzYWdlKHtcbiAgICB0eXBlOiBcImRvZW5ldC1yZXNpemVcIixcbiAgICBpZDogXCIke2lkfVwiLFxuICAgIGhlaWdodFxuICB9LCBcIipcIik7XG59XG5cbi8vIFJ1biBhZnRlciBEb2VuZXQgc3RhcnRzIHJlbmRlcmluZ1xucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHNlbmRTaXplKTtcbn0pO1xuXG4vLyBPYnNlcnZlIEFGVEVSIGNvbnRlbnQgZXhpc3RzXG5jb25zdCBvYnNlcnZlciA9IG5ldyBSZXNpemVPYnNlcnZlcigoKSA9PiB7XG4gIHNlbmRTaXplKCk7XG59KTtcbm9ic2VydmVyLm9ic2VydmUoZG9jdW1lbnQuYm9keSk7XG5cbi8vIEZpbmFsIHNhZmV0eSBwYXNzXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgc2VuZFNpemUpO1xuXG48L3NjcmlwdD5cbjwvYm9keT5cbjwvaHRtbD5cbmA7XG59IiwgImltcG9ydCB0eXBlIHsgRG9lbmV0TW9kZSwgRG9lbmV0VmVyc2lvbiB9IGZyb20gXCIuL3R5cGVzXCI7XG5pbXBvcnQgeyBQbHVnaW4gYXMgT2JzaWRpYW5QbHVnaW4gfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IEFwcCB9IGZyb20gXCJvYnNpZGlhblwiOyAvL05FV1xuXG5hc3luYyBmdW5jdGlvbiBsb2FkU2NyaXB0KHNyYzogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY29uc3QgZXhpc3RpbmcgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGBzY3JpcHRbc3JjPVwiJHtzcmN9XCJdYCk7XG5cbiAgICAvLyBQcmV2ZW50IGR1cGxpY2F0ZSBsb2Fkc1xuICAgIGlmIChleGlzdGluZykge1xuICAgICAgcmVzb2x2ZSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzY3JpcHRcIik7XG4gICAgc2NyaXB0LnNyYyA9IHNyYztcbiAgICBzY3JpcHQuYXN5bmMgPSB0cnVlO1xuXG4gICAgc2NyaXB0Lm9ubG9hZCA9ICgpID0+IHJlc29sdmUoKTtcbiAgICBzY3JpcHQub25lcnJvciA9ICgpID0+IHJlamVjdChuZXcgRXJyb3IoYEZhaWxlZCB0byBsb2FkICR7c3JjfWApKTtcblxuICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQoc2NyaXB0KTtcbiAgfSk7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVEb2VuZXRTY3JpcHQoXG4gIG1vZGU6IERvZW5ldE1vZGUsXG4gIHZlcnNpb246IERvZW5ldFZlcnNpb24sXG4gIGFwcDogQXBwLFxuICBwbHVnaW46IE9ic2lkaWFuUGx1Z2luXG4pOiB7IHByaW1hcnk6IHN0cmluZzsgZmFsbGJhY2s/OiBzdHJpbmcgfSB7XG5cbiAgY29uc3QgY2RuVmVyc2lvbiA9IHZlcnNpb24gPT09IFwiZGV2XCIgPyBcImRldlwiIDogXCJsYXRlc3RcIjtcblxuICBjb25zdCBsb2NhbCA9IGFwcC52YXVsdC5hZGFwdGVyLmdldFJlc291cmNlUGF0aChcbiAgICBwbHVnaW4ubWFuaWZlc3QuZGlyICsgYC92ZW5kb3IvZG9lbmV0L2RvZW5ldC1zdGFuZGFsb25lLSR7Y2RuVmVyc2lvbn0uanNgXG4gICk7XG5cbiAgY29uc3QgY2RuID0gYGh0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9ucG0vQGRvZW5ldC9zdGFuZGFsb25lQCR7Y2RuVmVyc2lvbn0vZG9lbmV0LXN0YW5kYWxvbmUuanNgO1xuXG4gIGlmIChtb2RlID09PSBcImxvY2FsXCIpIHJldHVybiB7IHByaW1hcnk6IGxvY2FsIH07XG4gIGlmIChtb2RlID09PSBcImNkblwiKSByZXR1cm4geyBwcmltYXJ5OiBjZG4gfTtcblxuICAvLyBhdXRvXG4gIHJldHVybiB7IHByaW1hcnk6IGNkbiwgZmFsbGJhY2s6IGxvY2FsIH07XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVNYXRoSmF4U2NyaXB0KFxuICBtb2RlOiBEb2VuZXRNb2RlLFxuICBhcHA6IEFwcCxcbiAgcGx1Z2luOiBPYnNpZGlhblBsdWdpblxuKTogeyBwcmltYXJ5OiBzdHJpbmc7IGZhbGxiYWNrPzogc3RyaW5nIH0ge1xuXG4gIGNvbnN0IGxvY2FsID0gYXBwLnZhdWx0LmFkYXB0ZXIuZ2V0UmVzb3VyY2VQYXRoKFxuICAgIHBsdWdpbi5tYW5pZmVzdC5kaXIgKyBcIi92ZW5kb3IvbWF0aGpheC9lczUvdGV4LW1tbC1jaHRtbC5qc1wiXG4gICk7XG5cbiAgY29uc3QgY2RuID0gXCJodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL21hdGhqYXhANC4xLjAvdGV4LW1tbC1jaHRtbC5qc1wiO1xuXG4gIGlmIChtb2RlID09PSBcImxvY2FsXCIpIHJldHVybiB7IHByaW1hcnk6IGxvY2FsIH07XG4gIGlmIChtb2RlID09PSBcImNkblwiKSByZXR1cm4geyBwcmltYXJ5OiBjZG4gfTtcblxuICByZXR1cm4geyBwcmltYXJ5OiBjZG4sIGZhbGxiYWNrOiBsb2NhbCB9O1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlRG9lbmV0Q1NTKFxuICBtb2RlOiBEb2VuZXRNb2RlLFxuICBhcHA6IEFwcCxcbiAgcGx1Z2luOiBPYnNpZGlhblBsdWdpblxuKTogeyBwcmltYXJ5OiBzdHJpbmc7IGZhbGxiYWNrPzogc3RyaW5nIH0ge1xuXG4gIGNvbnN0IGxvY2FsID0gYXBwLnZhdWx0LmFkYXB0ZXIuZ2V0UmVzb3VyY2VQYXRoKFxuICAgIHBsdWdpbi5tYW5pZmVzdC5kaXIgKyBcIi92ZW5kb3IvZG9lbmV0L3N0eWxlLmNzc1wiXG4gICk7XG5cbiAgY29uc3QgY2RuID0gXCJodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL0Bkb2VuZXQvc3RhbmRhbG9uZUBsYXRlc3Qvc3R5bGUuY3NzXCI7XG5cbiAgaWYgKG1vZGUgPT09IFwibG9jYWxcIikgcmV0dXJuIHsgcHJpbWFyeTogbG9jYWwgfTtcbiAgaWYgKG1vZGUgPT09IFwiY2RuXCIpIHJldHVybiB7IHByaW1hcnk6IGNkbiB9O1xuXG4gIHJldHVybiB7IHByaW1hcnk6IGNkbiwgZmFsbGJhY2s6IGxvY2FsIH07XG59Il0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHNCQUF5QztBQUN6QyxJQUFBQSxtQkFBdUQ7OztBQ0RoRCxTQUFTLGtCQUFrQixRQVF2QjtB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QVMsZ0JBQWdCO0FBQ3JDLGNBQU0sS0FBSyxPQUFPLGFBQWE7QUFBQSxNQUNqQyxDQUFDO0FBQUEsSUFDTDtBQUtOLFFBQUkseUJBQVEsV0FBVyxFQUNwQixRQUFRLHNCQUFzQixFQUM5QixRQUFRLDBEQUEwRCxFQUNsRTtBQUFBLE1BQVUsWUFDVCxPQUNHLFNBQVMsS0FBSyxPQUFPLFNBQVMsV0FBVyxFQUN6QyxTQUFTLE9BQU8sVUFBVTtBQUN6QixhQUFLLE9BQU8sU0FBUyxjQUFjO0FBQ25DLGNBQU0sS0FBSyxPQUFPLGFBQWE7QUFFL0IsYUFBSyxRQUFRO0FBQUEsTUFDZixDQUFDO0FBQUEsSUFDTDtBQUtGLFFBQUkseUJBQVEsV0FBVyxFQUNwQixRQUFRLDBCQUEwQixFQUNsQyxRQUFRLDJEQUEyRCxFQUNuRSxRQUFRLFVBQVE7QUFDZixXQUNHLGVBQWUsTUFBTSxFQUNyQixTQUFTLE9BQU8sS0FBSyxPQUFPLFNBQVMsUUFBUSxDQUFDLEVBQzlDLFlBQVksQ0FBQyxLQUFLLE9BQU8sU0FBUyxXQUFXLEVBQzdDLFNBQVMsT0FBTyxVQUFVO0FBQ3pCLGNBQU0sTUFBTSxTQUFTLEtBQUs7QUFDMUIsYUFBSyxPQUFPLFNBQVMsV0FBVyxNQUFNLEdBQUcsSUFBSSxPQUFPO0FBQ3BELGNBQU0sS0FBSyxPQUFPLGFBQWE7QUFBQSxNQUNqQyxDQUFDO0FBQUEsSUFDTCxDQUFDO0FBSUgsUUFBSSx5QkFBUSxXQUFXLEVBQ3BCLFFBQVEsYUFBYSxFQUNyQixRQUFRLHlDQUF5QyxFQUNqRDtBQUFBLE1BQVUsWUFDVCxPQUNHLGNBQWMsT0FBTyxFQUNyQixXQUFXLEVBQ1gsUUFBUSxZQUFZO0FBQ25CLGNBQU0sTUFBTSxHQUFHLEtBQUssT0FBTyxTQUFTLEdBQUc7QUFFdkMsWUFBSTtBQUNGLGNBQUksTUFBTSxLQUFLLE9BQU8sSUFBSSxNQUFNLFFBQVEsT0FBTyxHQUFHLEdBQUc7QUFDbkQsa0JBQU0sS0FBSyxPQUFPLElBQUksTUFBTSxRQUFRLE1BQU0sS0FBSyxJQUFJO0FBQ25ELG9CQUFRLElBQUksd0JBQXdCO0FBQUEsVUFDdEMsT0FBTztBQUNMLG9CQUFRLElBQUksbUNBQW1DO0FBQUEsVUFDakQ7QUFBQSxRQUNGLFNBQVMsR0FBRztBQUNWLGtCQUFRLE1BQU0sa0NBQWtDLENBQUM7QUFBQSxRQUNuRDtBQUNBLFlBQUksd0JBQU8sc0JBQXNCO0FBQUEsTUFDbkMsQ0FBQztBQUFBLElBQ0w7QUFBQSxFQUNKO0FBQ0Y7IiwKICAibmFtZXMiOiBbImltcG9ydF9vYnNpZGlhbiIsICJPYnNpZGlhblBsdWdpbiJdCn0K

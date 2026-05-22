var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => DoenetPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");

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
function resolveDoenetScript(mode, app, plugin) {
  const local = app.vault.adapter.getResourcePath(
    plugin.manifest.dir + "/vendor/doenet/doenet-standalone.js"
  );
  const cdn = "https://cdn.jsdelivr.net/npm/@doenet/standalone@latest/doenet-standalone.js";
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
  enableCache: false,
  cacheTTL: 1440
  // 24 hours
};
var CacheManager = class {
  constructor(plugin) {
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
    this.cssCache = null;
    this.cachedMode = null;
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
    iframe.style.display = "block";
    iframe.style.overflow = "visible";
    iframe.style.height = options.height || "300px";
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
        iframe.style.height = event.data.height + "px";
      }
    };
    window.addEventListener("message", listener);
    this.register(() => {
      window.removeEventListener("message", listener);
    });
  }
};
var DoenetSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Doenet Settings" });
    new import_obsidian.Setting(containerEl).setName("Doenet loading mode").setDesc(
      "Choose how Doenet, MathJax, and Doenet CSS are loaded (CDN = best performance, Local = offline, Auto = CDN with fallback)"
    ).addDropdown(
      (drop) => drop.addOption("cdn", "CDN (fast, requires internet)").addOption("local", "Local (offline, uses bundled files)").addOption("auto", "Auto (CDN with local fallback)").setValue(this.plugin.settings.mode).onChange(async (value) => {
        this.plugin.settings.mode = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Enable local caching").setDesc("Cache remotely fetched files locally for faster loading.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.enableCache).onChange(async (value) => {
        this.plugin.settings.enableCache = value;
        await this.plugin.saveSettings();
        this.display();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Cache duration (minutes)").setDesc("How long cached files should be reused before refetching.").addText((text) => {
      text.setPlaceholder("1440").setValue(String(this.plugin.settings.cacheTTL)).setDisabled(!this.plugin.settings.enableCache).onChange(async (value) => {
        const num = parseInt(value);
        this.plugin.settings.cacheTTL = isNaN(num) ? 1440 : num;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Clear cache").setDesc("Delete all locally cached Doenet files.").addButton(
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
        new import_obsidian.Notice("Doenet cache cleared");
      })
    );
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2lmcmFtZVNyY2RvYy50cyIsICJzcmMvbG9hZGVyLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBQbHVnaW4sIFBsdWdpblNldHRpbmdUYWIsIEFwcCwgU2V0dGluZywgTm90aWNlIH0gZnJvbSBcIm9ic2lkaWFuXCI7IC8vTkVXXG5pbXBvcnQgeyBidWlsZElmcmFtZVNyY2RvYyB9IGZyb20gXCIuL2lmcmFtZVNyY2RvY1wiO1xuaW1wb3J0IHsgcmVzb2x2ZURvZW5ldFNjcmlwdCwgcmVzb2x2ZU1hdGhKYXhTY3JpcHQsIHJlc29sdmVEb2VuZXRDU1MgfSBmcm9tIFwiLi9sb2FkZXJcIjtcblxuLy8gU28gbWFueSByZW5kZXIgbGF5ZXJzLCBidXQgaXQgd29ya3MgYXMgd2VsbCBhc1xuLy8gb25lIG1pZ2h0IHBvc3NpYmx5IGhvcGUuXG4vLyBPYnNpZGlhbiBcdTIxOTIgaWZyYW1lIFx1MjE5MiBEb2VuZXQgXHUyMTkyIEpTWEdyYXBoIFx1MjE5MiBTVkdcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmludGVyZmFjZSBEb2VuZXRPcHRpb25zIHtcbiAgd2lkdGg/OiBzdHJpbmc7XG4gIGhlaWdodD86IHN0cmluZztcbiAgc2hvd2tleWJvYXJkPzogc3RyaW5nO1xuICBzb3VyY2U/OiBcInVybFwiIHwgXCJpbmxpbmVcIjtcbiAgZXJyb3I/OiBib29sZWFuO1xuICBtZXNzYWdlPzogc3RyaW5nO1xuICBba2V5OiBzdHJpbmddOiBzdHJpbmcgfCBib29sZWFuIHwgdW5kZWZpbmVkO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAgTkVXXG50eXBlIERvZW5ldE1vZGUgPSBcImNkblwiIHwgXCJsb2NhbFwiIHwgXCJhdXRvXCI7XG5cbmludGVyZmFjZSBEb2VuZXRQbHVnaW5TZXR0aW5ncyB7XG4gIG1vZGU6IERvZW5ldE1vZGU7XG4gIGVuYWJsZUNhY2hlOiBib29sZWFuO1xuICBjYWNoZVRUTDogbnVtYmVyO1xufVxuXG5jb25zdCBERUZBVUxUX1NFVFRJTkdTOiBEb2VuZXRQbHVnaW5TZXR0aW5ncyA9IHtcbiAgbW9kZTogXCJhdXRvXCIsXG4gIGVuYWJsZUNhY2hlOiBmYWxzZSxcbiAgY2FjaGVUVEw6IDE0NDAsIC8vIDI0IGhvdXJzXG59O1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBORVdcbmNsYXNzIENhY2hlTWFuYWdlciB7XG4gIHBsdWdpbjogRG9lbmV0UGx1Z2luO1xuXG4gIGNvbnN0cnVjdG9yKHBsdWdpbjogRG9lbmV0UGx1Z2luKSB7XG4gICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gIH1cbiAgXG4gIHByaXZhdGUgYXN5bmMgZ2V0Q2FjaGVQYXRoKHVybDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBjb25zdCBoYXNoID0gYXdhaXQgdGhpcy5oYXNoU3RyaW5nKHVybCk7XG4gICAgcmV0dXJuIGAke3RoaXMucGx1Z2luLm1hbmlmZXN0LmRpcn0vY2FjaGUvJHtoYXNofS5qc29uYDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZW5zdXJlQ2FjaGVGb2xkZXIoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZGlyID0gYCR7dGhpcy5wbHVnaW4ubWFuaWZlc3QuZGlyfS9jYWNoZWA7XG5cbiAgICBpZiAoIShhd2FpdCB0aGlzLnBsdWdpbi5hcHAudmF1bHQuYWRhcHRlci5leGlzdHMoZGlyKSkpIHtcbiAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmFwcC52YXVsdC5hZGFwdGVyLm1rZGlyKGRpcik7XG4gICAgfVxuICB9XG4gIFxuICAvLyAtLS0tLS0tLS0tLSBVcGRhdGVkIHdpdGggZGVidWcgb3V0cHV0LlxuICBhc3luYyBnZXQodXJsOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcbiAgICBpZiAoIXRoaXMucGx1Z2luLnNldHRpbmdzLmVuYWJsZUNhY2hlKSB7XG4gICAgICBjb25zb2xlLmxvZyhcIltEb2VuZXRdIENhY2hlIGRpc2FibGVkXCIpO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgcGF0aCA9IGF3YWl0IHRoaXMuZ2V0Q2FjaGVQYXRoKHVybCk7IC8vIFVQREFURUQgdG8gYXN5bmNcblxuICAgIGlmICghKGF3YWl0IHRoaXMucGx1Z2luLmFwcC52YXVsdC5hZGFwdGVyLmV4aXN0cyhwYXRoKSkpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiW0RvZW5ldF0gQ2FjaGUgbWlzcyAobm8gZmlsZSk6XCIsIHVybCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgcmF3ID0gYXdhaXQgdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmFkYXB0ZXIucmVhZChwYXRoKTtcbiAgICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKHJhdyk7XG5cbiAgICAgIGNvbnN0IGFnZU1pbnV0ZXMgPVxuICAgICAgICAoRGF0ZS5ub3coKSAtIGRhdGEudGltZXN0YW1wKSAvICgxMDAwICogNjApO1xuXG4gICAgICBpZiAoYWdlTWludXRlcyA+IHRoaXMucGx1Z2luLnNldHRpbmdzLmNhY2hlVFRMKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiW0RvZW5ldF0gQ2FjaGUgZXhwaXJlZDpcIiwgdXJsKTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIGNvbnNvbGUubG9nKFwiW0RvZW5ldF0gQ2FjaGUgSElUOlwiLCBkYXRhLnVybCk7XG4gICAgICByZXR1cm4gZGF0YS5jb250ZW50O1xuXG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc29sZS5lcnJvcihcIltEb2VuZXRdIENhY2hlIHJlYWQgZXJyb3I6XCIsIGUpO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgc2V0KHVybDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMucGx1Z2luLnNldHRpbmdzLmVuYWJsZUNhY2hlKSByZXR1cm47XG5cbiAgICBjb25zdCBwYXRoID0gYXdhaXQgdGhpcy5nZXRDYWNoZVBhdGgodXJsKTsgLy8gVVBEQVRFRCB0byBhc3luY1xuXG4gICAgYXdhaXQgdGhpcy5lbnN1cmVDYWNoZUZvbGRlcigpO1xuXG4gICAgY29uc3QgZGF0YSA9IHtcbiAgICAgIHVybCwgXG4gICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXG4gICAgICBjb250ZW50LFxuICAgIH07XG5cbiAgICB0cnkge1xuICAgICAgY29uc29sZS5sb2coXCJbRG9lbmV0XSBDYWNoaW5nIHJlc3BvbnNlOlwiLCB1cmwpO1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmFkYXB0ZXIud3JpdGUoXG4gICAgICAgIHBhdGgsXG4gICAgICAgIEpTT04uc3RyaW5naWZ5KGRhdGEpXG4gICAgICApO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJDYWNoZSB3cml0ZSBlcnJvcjpcIiwgZSk7XG4gICAgfVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tIE5FV1xuICBwcml2YXRlIGFzeW5jIGhhc2hTdHJpbmcoaW5wdXQ6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3QgZW5jb2RlciA9IG5ldyBUZXh0RW5jb2RlcigpO1xuICAgIGNvbnN0IGRhdGEgPSBlbmNvZGVyLmVuY29kZShpbnB1dCk7XG5cbiAgICBjb25zdCBoYXNoQnVmZmVyID0gYXdhaXQgY3J5cHRvLnN1YnRsZS5kaWdlc3QoXCJTSEEtMjU2XCIsIGRhdGEpO1xuICAgIGNvbnN0IGhhc2hBcnJheSA9IEFycmF5LmZyb20obmV3IFVpbnQ4QXJyYXkoaGFzaEJ1ZmZlcikpO1xuXG4gICAgcmV0dXJuIGhhc2hBcnJheS5tYXAoYiA9PiBiLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCBcIjBcIikpLmpvaW4oXCJcIik7XG4gIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIERvZW5ldFBsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gIHNldHRpbmdzOiBEb2VuZXRQbHVnaW5TZXR0aW5ncztcbiAgcHJpdmF0ZSBjc3NDYWNoZTogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgY2FjaGVkTW9kZTogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gIFxuICBhc3luYyBvbmxvYWQoKSB7XG4gICAgY29uc29sZS5sb2coXCJEb2VuZXQgcGx1Z2luIChpZnJhbWUgbW9kZSkgbG9hZGVkXCIpO1xuXG4gICAgYXdhaXQgdGhpcy5sb2FkU2V0dGluZ3MoKTsgIC8vIE5FV1xuICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgRG9lbmV0U2V0dGluZ1RhYih0aGlzLmFwcCwgdGhpcykpOyAvLyBORVdcblxuXG4gICAgdGhpcy5yZWdpc3Rlck1hcmtkb3duQ29kZUJsb2NrUHJvY2Vzc29yKFxuICAgICAgXCJkb2VuZXRcIixcbiAgICAgIGFzeW5jIChzb3VyY2UgOiBzdHJpbmcsIGVsOiBIVE1MRWxlbWVudCkgPT4ge1xuICAgICAgICBhd2FpdCB0aGlzLnJlbmRlckRvZW5ldElmcmFtZShzb3VyY2UsIGVsKTtcbiAgICAgIH1cbiAgICApO1xuICB9XG5cbiAgYXN5bmMgbG9hZERvZW5ldENTUygpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGlmICh0aGlzLmNzc0NhY2hlICYmIHRoaXMuY2FjaGVkTW9kZSA9PT0gdGhpcy5zZXR0aW5ncy5tb2RlKSB7XG4gICAgICBjb25zb2xlLmxvZyhcIltEb2VuZXRdIENTUyBjYWNoZSAobWVtb3J5KSBoaXRcIik7XG4gICAgICByZXR1cm4gdGhpcy5jc3NDYWNoZTtcbiAgICB9XG5cbiAgICBjb25zdCBjc3NTb3VyY2UgPSByZXNvbHZlRG9lbmV0Q1NTKFxuICAgICAgdGhpcy5zZXR0aW5ncy5tb2RlLFxuICAgICAgdGhpcy5hcHAsXG4gICAgICB0aGlzXG4gICAgKTtcblxuICAgIGxldCByYXdDU1M6IHN0cmluZztcblxuICAgIHRyeSB7XG4gICAgICByYXdDU1MgPSBhd2FpdCBmZXRjaChjc3NTb3VyY2UucHJpbWFyeSkudGhlbihyID0+IHIudGV4dCgpKTtcbiAgICAgIGNvbnNvbGUubG9nKFwiW0RvZW5ldF0gQ1NTIGxvYWRlZCBmcm9tIHByaW1hcnk6XCIsIGNzc1NvdXJjZS5wcmltYXJ5KTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoY3NzU291cmNlLmZhbGxiYWNrKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcIltEb2VuZXRdIENTUyBmYWxsYmFjayB0byBsb2NhbFwiKTtcbiAgICAgICAgcmF3Q1NTID0gYXdhaXQgZmV0Y2goY3NzU291cmNlLmZhbGxiYWNrKS50aGVuKHIgPT4gci50ZXh0KCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmNzc0NhY2hlID0gcmF3Q1NTO1xuICAgIHRoaXMuY2FjaGVkTW9kZSA9IHRoaXMuc2V0dGluZ3MubW9kZTtcblxuICAgIHJldHVybiByYXdDU1M7XG4gIH1cblxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIE5FV1xuXG4gIGFzeW5jIGxvYWRTZXR0aW5ncygpIHtcbiAgICB0aGlzLnNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgREVGQVVMVF9TRVRUSU5HUywgYXdhaXQgdGhpcy5sb2FkRGF0YSgpKTtcbiAgfVxuXG4gIGFzeW5jIHNhdmVTZXR0aW5ncygpIHtcbiAgICBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpO1xuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgYXN5bmMgcGFyc2VGaXJzdExpbmVPcHRpb25zKHNvdXJjZSA6IHN0cmluZyk6IFByb21pc2U8e1xuICAgIGRvZW5ldE1MOiBzdHJpbmc7IFxuICAgIG9wdGlvbnM6IERvZW5ldE9wdGlvbnNcbiAgfT4ge1xuICAgIGNvbnN0IHRyaW1tZWRTb3VyY2UgPSBzb3VyY2UudHJpbSgpO1xuICAgIGNvbnN0IGxpbmVzID0gdHJpbW1lZFNvdXJjZS5zcGxpdChcIlxcblwiKTtcbiAgICBjb25zdCBvcHRpb25zOiBEb2VuZXRPcHRpb25zID0ge307XG4gICAgbGV0IHN0YXJ0SW5kZXggPSAwO1xuXG4gICAgLy8gU3RyaXBzIGZpcnN0LWxpbmUgb3B0aW9ucyBhbmQgcmV0dXJucyB0aGVtLFxuICAgIC8vIGFsb25nIHdpdGggdGhlIHJlbWFpbmluZyBEb2VuZXRNTCBjb250ZW50LlxuICAgIGlmIChsaW5lc1swXT8udHJpbSgpLnN0YXJ0c1dpdGgoXCIjXCIpKSB7XG4gICAgICBjb25zdCBkaXJlY3RpdmUgPSBsaW5lc1swXSEudHJpbSgpLnN1YnN0cmluZygxKS50cmltKCk7XG5cbiAgICAgIGRpcmVjdGl2ZS5zcGxpdCgvXFxzKy8pLmZvckVhY2goKHBhaXIpID0+IHtcbiAgICAgICAgY29uc3QgW2tleSwgdmFsdWVdID0gcGFpci5zcGxpdChcIj1cIik7XG4gICAgICAgIGlmIChrZXkgJiYgdmFsdWUpIHtcbiAgICAgICAgICBvcHRpb25zW2tleS50cmltKCldID0gdmFsdWUudHJpbSgpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgc3RhcnRJbmRleCA9IDE7XG4gICAgfVxuICAgIGxldCBkb2VuZXRNTCA9IGxpbmVzLnNsaWNlKHN0YXJ0SW5kZXgpLmpvaW4oXCJcXG5cIikudHJpbSgpO1xuXG4gICAgLy8gUHJvY2VzcyBjb250ZW50LCBpZiB1cmwsIGZldGNoIGNvbnRlbnQsIGlmIGlubGluZSwgdXNlIGFzLWlzLlxuICAgIGNvbnN0IGlzVVJMID0gL15odHRwcz86XFwvXFwvXFxTKyQvLnRlc3QoZG9lbmV0TUwpO1xuICAgIGlmIChpc1VSTCkge1xuICAgICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIE5FV1xuICAgICAgY29uc3QgY2FjaGUgPSBuZXcgQ2FjaGVNYW5hZ2VyKHRoaXMpO1xuXG4gICAgICAvLyBUcnkgY2FjaGUgZmlyc3RcbiAgICAgIGNvbnN0IGNhY2hlZCA9IGF3YWl0IGNhY2hlLmdldChkb2VuZXRNTCk7XG4gICAgICBpZiAoY2FjaGVkKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgZG9lbmV0TUw6IGNhY2hlZCxcbiAgICAgICAgICBvcHRpb25zOiB7IC4uLm9wdGlvbnMsIHNvdXJjZTogXCJ1cmxcIiB9XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIFRpbWVvdXQgYWZ0ZXIgOCBzZWNvbmRzIHRvIHByZXZlbnQgaGFuZ2luZyBvbiBiYWQgVVJMcy5cbiAgICAgICAgY29uc3QgY29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgICAgICAgY29uc3QgdGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiBjb250cm9sbGVyLmFib3J0KCksIDgwMDApOyAvLyA4cyB0aW1lb3V0XG4gICAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKGRvZW5ldE1MICsgXCI/dD1cIiArIERhdGUubm93KCksIHtcbiAgICAgICAgICBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsXG4gICAgICAgIH0pO1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcblxuICAgICAgICAvLyBDaGVjayBmb3IgSFRUUCBlcnJvcnNcbiAgICAgICAgaWYgKCFyZXMub2spIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZldGNoIGZhaWxlZCB3aXRoIHN0YXR1cyAke3Jlcy5zdGF0dXN9ICR7cmVzLnN0YXR1c1RleHR9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBmZXRjaGVkVGV4dCA9IGF3YWl0IHJlcy50ZXh0KCk7XG4gICAgICAgIGF3YWl0IGNhY2hlLnNldChkb2VuZXRNTCwgZmV0Y2hlZFRleHQpO1xuXG4gICAgICAgIC8vIFZhbGlkYXRlIHJlc3BvbnNlIGlzIG5vbi1lbXB0eS5cbiAgICAgICAgaWYgKCFmZXRjaGVkVGV4dCB8fCAhZmV0Y2hlZFRleHQudHJpbSgpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmV0Y2hlZCBjb250ZW50IGlzIGVtcHR5XCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmV0dXJuIERvZW5ldE1MIHdpdGggc291cmNlIGluZm8gZm9yIGRlYnVnZ2luZy5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBkb2VuZXRNTDogZmV0Y2hlZFRleHQudHJpbSgpLFxuICAgICAgICAgIG9wdGlvbnM6IHsgLi4ub3B0aW9ucywgc291cmNlOiBcInVybFwiIH1cbiAgICAgICAgfTtcblxuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBmZXRjaGluZyBEb2VuZXRNTCBmcm9tIFVSTDpcIiwgZXJyKTtcblxuICAgICAgICBjb25zdCBlcnJvciA9IGVyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyIDogbmV3IEVycm9yKFwiVW5rbm93biBlcnJvclwiKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGRvZW5ldE1MOiBcIlwiLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgICBzb3VyY2U6IFwidXJsXCIsXG4gICAgICAgICAgICBlcnJvcjogdHJ1ZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yLm5hbWUgPT09IFwiQWJvcnRFcnJvclwiXG4gICAgICAgICAgICAgID8gXCJSZXF1ZXN0IHRpbWVkIG91dCB3aGlsZSBmZXRjaGluZyBVUkxcIlxuICAgICAgICAgICAgICA6IGVycm9yLm1lc3NhZ2UgfHwgXCJVbmtub3duIGZldGNoIGVycm9yXCJcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuICAgIC8vIFJldHVybiBpbmxpbmUgRG9lbmV0TUwgd2l0aCBhbnkgcHJvY2Vzc2VkIG9wdGlvbnMuXG4gICAgcmV0dXJuIHsgZG9lbmV0TUwsIG9wdGlvbnMgfTtcbiAgfVxuXG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgYXN5bmMgcmVuZGVyRG9lbmV0SWZyYW1lKHNvdXJjZSA6IHN0cmluZywgZWw6IEhUTUxFbGVtZW50KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgeyBkb2VuZXRNTCwgb3B0aW9ucyB9ID0gYXdhaXQgdGhpcy5wYXJzZUZpcnN0TGluZU9wdGlvbnMoc291cmNlKTtcbiAgICBjb25zdCBzaG93S2V5Ym9hcmQgPSBvcHRpb25zLnNob3drZXlib2FyZCA9PT0gXCJmYWxzZVwiO1xuICAgIGNvbnN0IHJhd0NTUyA9IGF3YWl0IHRoaXMubG9hZERvZW5ldENTUygpO1xuICAgIGNvbnN0IGNzcyA9IHJhd0NTUyArIFwiXFxuLyojIHNvdXJjZVVSTD1kb2VuZXQuY3NzICovXCI7XG4gICAgY29uc3QgaWZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlmcmFtZVwiKTtcbiAgICBjb25zdCBpZCA9IFwiZG9lbmV0LVwiICsgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMik7XG5cbiAgICBjb25zdCBzY3JpcHRTb3VyY2UgPSByZXNvbHZlRG9lbmV0U2NyaXB0KFxuICAgICAgdGhpcy5zZXR0aW5ncy5tb2RlLFxuICAgICAgdGhpcy5hcHAsXG4gICAgICB0aGlzXG4gICAgKTtcblxuICAgIGNvbnN0IG1hdGhKYXhTb3VyY2UgPSByZXNvbHZlTWF0aEpheFNjcmlwdChcbiAgICAgIHRoaXMuc2V0dGluZ3MubW9kZSxcbiAgICAgIHRoaXMuYXBwLFxuICAgICAgdGhpc1xuICAgICk7XG5cbiAgICAvLyBTZXQgaWZyYW1lIGF0dHJpYnV0ZXMgYW5kIHN0eWxlcyBmb3Igb3B0aW1hbCBEb2VuZXQgcmVuZGVyaW5nXG4gICAgaWZyYW1lLmRhdGFzZXQuZG9lbmV0SWQgPSBpZDtcbiAgICBpZnJhbWUuc3R5bGUud2lkdGggPSBvcHRpb25zLndpZHRoIHx8IFwiMTAwJVwiOyAvLyBGdWxsIHdpZHRoIGJ5IGRlZmF1bHRcbiAgICBpZnJhbWUuc3R5bGUuYm9yZGVyID0gXCJub25lXCI7IC8vIFJlbW92ZSBkZWZhdWx0IGJvcmRlclxuICAgIGlmcmFtZS5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiOyAvLyBSZW1vdmUgZGVmYXVsdCBpbmxpbmUgc3BhY2luZ1xuICAgIGlmcmFtZS5zdHlsZS5vdmVyZmxvdyA9IFwidmlzaWJsZVwiOyAvLyBBbGxvdyBpZnJhbWUgdG8gZXhwYW5kIHdpdGggY29udGVudFxuICAgIGlmcmFtZS5zdHlsZS5oZWlnaHQgPSBvcHRpb25zLmhlaWdodCB8fCBcIjMwMHB4XCI7IC8vIFByZXZlbnQgY29sbGFwc2VcbiAgICBlbC5hcHBlbmRDaGlsZChpZnJhbWUpOyAvLyBBZGQgaWZyYW1lIHRvIERPTSBiZWZvcmUgc2V0dGluZyBzcmNkb2MgZm9yIGJldHRlciBwZXJmb3JtYW5jZVxuXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1JbmplY3QgRlVMTCBpZnJhbWUgY29udGVudFxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy8gU3dpdGNoIHRvIGNhbGxpbmcgZnVuY3Rpb24gdG8gYnVpbGQgZnVsbCBzcmNkb2MgY29udGVudCwgaW5jbHVkaW5nIENTUyBhbmQgRG9lbmV0TUwuXG4gICAgaWZyYW1lLnNyY2RvYyA9IGJ1aWxkSWZyYW1lU3JjZG9jKHtcbiAgICAgIGNzcyxcbiAgICAgIGRvZW5ldE1MLFxuICAgICAgaWQsXG4gICAgICBzaG93S2V5Ym9hcmQsXG4gICAgICBzY3JpcHRTb3VyY2UsXG4gICAgICBtYXRoSmF4U291cmNlLFxuICAgICAgbW9kZTogdGhpcy5zZXR0aW5ncy5tb2RlXG4gICAgfSk7XG5cbiAgICAvLyBTYWZlIEhlaWdodCBGYWxsYmFjaz8gSXMgdGhpcyBzdGlsbCBuZWNlc3Nhcnk/XG4gICAgaWZyYW1lLm9ubG9hZCA9ICgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGRvYyA9IGlmcmFtZS5jb250ZW50RG9jdW1lbnQ7XG4gICAgICAgIGlmIChkb2M/LmJvZHkpIHtcbiAgICAgICAgICBjb25zdCByZXNpemUgPSAoKSA9PiB7XG4gICAgICAgICAgICBpZnJhbWUuc3R5bGUuaGVpZ2h0ID0gZG9jLmJvZHkuc2Nyb2xsSGVpZ2h0ICsgXCJweFwiO1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICByZXNpemUoKTsgLy8gaW5pdGlhbFxuICAgICAgICAgIG5ldyBSZXNpemVPYnNlcnZlcihyZXNpemUpLm9ic2VydmUoZG9jLmJvZHkpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7fVxuICAgIH07XG5cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vIFBhcmVudCByZXNpemUgbGlzdGVuZXIgKFVOQ0hBTkdFRClcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIGNvbnN0IGxpc3RlbmVyID0gKGV2ZW50OiBNZXNzYWdlRXZlbnQpID0+IHtcbiAgICAvLyAgY29uc29sZS5sb2coXCJNRVNTQUdFIFJFQ0VJVkVEOlwiLCB7XG4gICAgLy8gICAgZGF0YTogZXZlbnQuZGF0YSxcbiAgICAvLyAgICBvcmlnaW46IGV2ZW50Lm9yaWdpbixcbiAgICAvLyAgICBzb3VyY2VNYXRjaGVzOiBldmVudC5zb3VyY2UgPT09IGlmcmFtZS5jb250ZW50V2luZG93XG4gICAgLy8gIH0pO1xuXG4gICAgICBpZiAoXG4gICAgICAgIGV2ZW50LnNvdXJjZSA9PT0gaWZyYW1lLmNvbnRlbnRXaW5kb3cgJiZcbiAgICAgICAgZXZlbnQuZGF0YT8udHlwZSA9PT0gXCJkb2VuZXQtcmVzaXplXCIgJiZcbiAgICAgICAgZXZlbnQuZGF0YS5pZCA9PT0gaWRcbiAgICAgICkge1xuICAgICAgICBpZnJhbWUuc3R5bGUuaGVpZ2h0ID0gZXZlbnQuZGF0YS5oZWlnaHQgKyBcInB4XCI7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBsaXN0ZW5lcik7XG5cbiAgICAvLyBDbGVhbnVwXG4gICAgdGhpcy5yZWdpc3RlcigoKSA9PiB7XG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgbGlzdGVuZXIpO1xuICAgIH0pO1xuICB9XG59O1xuXG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICBORVdcbmNsYXNzIERvZW5ldFNldHRpbmdUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcbiAgcGx1Z2luOiBEb2VuZXRQbHVnaW47XG5cbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogRG9lbmV0UGx1Z2luKSB7XG4gICAgc3VwZXIoYXBwLCBwbHVnaW4pO1xuICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICB9XG5cbiAgZGlzcGxheSgpOiB2b2lkIHtcbiAgICBjb25zdCB7IGNvbnRhaW5lckVsIH0gPSB0aGlzO1xuICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XG5cbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCJEb2VuZXQgU2V0dGluZ3NcIiB9KTtcblxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyBFbmFibGUgbG9hZCBmcm9tIExvY2FsLCBDRE4sIG9yIEF1dG8gKENETiB3aXRoIExvY2FsIGZhbGxiYWNrKVxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiRG9lbmV0IGxvYWRpbmcgbW9kZVwiKVxuICAgICAgLnNldERlc2MoXG4gICAgICAgIFwiQ2hvb3NlIGhvdyBEb2VuZXQsIE1hdGhKYXgsIGFuZCBEb2VuZXQgQ1NTIGFyZSBsb2FkZWQgKENETiA9IGJlc3QgcGVyZm9ybWFuY2UsIExvY2FsID0gb2ZmbGluZSwgQXV0byA9IENETiB3aXRoIGZhbGxiYWNrKVwiXG4gICAgICApXG4gICAgICAuYWRkRHJvcGRvd24oZHJvcCA9PlxuICAgICAgICBkcm9wXG4gICAgICAgICAgLmFkZE9wdGlvbihcImNkblwiLCBcIkNETiAoZmFzdCwgcmVxdWlyZXMgaW50ZXJuZXQpXCIpXG4gICAgICAgICAgLmFkZE9wdGlvbihcImxvY2FsXCIsIFwiTG9jYWwgKG9mZmxpbmUsIHVzZXMgYnVuZGxlZCBmaWxlcylcIilcbiAgICAgICAgICAuYWRkT3B0aW9uKFwiYXV0b1wiLCBcIkF1dG8gKENETiB3aXRoIGxvY2FsIGZhbGxiYWNrKVwiKVxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5tb2RlKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWU6IFwiY2RuXCIgfCBcImxvY2FsXCIgfCBcImF1dG9cIikgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MubW9kZSA9IHZhbHVlO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgfSlcbiAgICAgICk7XG5cblxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyBFbmFibGUgQ2FjaGUgVG9nZ2xlXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJFbmFibGUgbG9jYWwgY2FjaGluZ1wiKVxuICAgICAgLnNldERlc2MoXCJDYWNoZSByZW1vdGVseSBmZXRjaGVkIGZpbGVzIGxvY2FsbHkgZm9yIGZhc3RlciBsb2FkaW5nLlwiKVxuICAgICAgLmFkZFRvZ2dsZSh0b2dnbGUgPT5cbiAgICAgICAgdG9nZ2xlXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmVuYWJsZUNhY2hlKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmVuYWJsZUNhY2hlID0gdmFsdWU7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcblxuICAgICAgICAgICAgdGhpcy5kaXNwbGF5KCk7IC8vIHJlZnJlc2ggVUlcbiAgICAgICAgICB9KVxuICAgICAgKTtcblxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyBDYWNoZSBUVEwgSW5wdXRcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkNhY2hlIGR1cmF0aW9uIChtaW51dGVzKVwiKVxuICAgICAgLnNldERlc2MoXCJIb3cgbG9uZyBjYWNoZWQgZmlsZXMgc2hvdWxkIGJlIHJldXNlZCBiZWZvcmUgcmVmZXRjaGluZy5cIilcbiAgICAgIC5hZGRUZXh0KHRleHQgPT4ge1xuICAgICAgICB0ZXh0XG4gICAgICAgICAgLnNldFBsYWNlaG9sZGVyKFwiMTQ0MFwiKVxuICAgICAgICAgIC5zZXRWYWx1ZShTdHJpbmcodGhpcy5wbHVnaW4uc2V0dGluZ3MuY2FjaGVUVEwpKVxuICAgICAgICAgIC5zZXREaXNhYmxlZCghdGhpcy5wbHVnaW4uc2V0dGluZ3MuZW5hYmxlQ2FjaGUpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbnVtID0gcGFyc2VJbnQodmFsdWUpO1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuY2FjaGVUVEwgPSBpc05hTihudW0pID8gMTQ0MCA6IG51bTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vIENsZWFyIENhY2hlIEJ1dHRvblxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQ2xlYXIgY2FjaGVcIilcbiAgICAgIC5zZXREZXNjKFwiRGVsZXRlIGFsbCBsb2NhbGx5IGNhY2hlZCBEb2VuZXQgZmlsZXMuXCIpXG4gICAgICAuYWRkQnV0dG9uKGJ1dHRvbiA9PlxuICAgICAgICBidXR0b25cbiAgICAgICAgICAuc2V0QnV0dG9uVGV4dChcIkNsZWFyXCIpXG4gICAgICAgICAgLnNldFdhcm5pbmcoKVxuICAgICAgICAgIC5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGRpciA9IGAke3RoaXMucGx1Z2luLm1hbmlmZXN0LmRpcn0vY2FjaGVgO1xuXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBpZiAoYXdhaXQgdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmFkYXB0ZXIuZXhpc3RzKGRpcikpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5hcHAudmF1bHQuYWRhcHRlci5ybWRpcihkaXIsIHRydWUpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiW0RvZW5ldF0gQ2FjaGUgY2xlYXJlZFwiKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIltEb2VuZXRdIE5vIGNhY2hlIGZvbGRlciB0byBjbGVhclwiKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiW0RvZW5ldF0gRXJyb3IgY2xlYXJpbmcgY2FjaGU6XCIsIGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV3IE5vdGljZShcIkRvZW5ldCBjYWNoZSBjbGVhcmVkXCIpO1xuICAgICAgICAgIH0pXG4gICAgICApOyAgXG4gIH1cbn0iLCAiZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkSWZyYW1lU3JjZG9jKHBhcmFtczoge1xuICAgIGNzczogc3RyaW5nO1xuICAgIGRvZW5ldE1MOiBzdHJpbmc7XG4gICAgaWQ6IHN0cmluZztcbiAgICBzaG93S2V5Ym9hcmQ6IGJvb2xlYW47XG4gICAgc2NyaXB0U291cmNlOiB7IHByaW1hcnk6IHN0cmluZzsgZmFsbGJhY2s/OiBzdHJpbmcgfTtcbiAgICBtYXRoSmF4U291cmNlOiB7IHByaW1hcnk6IHN0cmluZzsgZmFsbGJhY2s/OiBzdHJpbmcgfTtcbiAgICBtb2RlOiBEb2VuZXRNb2RlO1xufSk6IHN0cmluZyB7XG4gIGNvbnN0IHsgY3NzLCBkb2VuZXRNTCwgaWQsIHNob3dLZXlib2FyZCwgc2NyaXB0U291cmNlLCBtYXRoSmF4U291cmNlLCBtb2RlIH0gPSBwYXJhbXM7XG4gIHJldHVybiBgXG4gIDwhRE9DVFlQRSBodG1sPlxuPGh0bWw+PGhlYWQ+PG1ldGEgY2hhcnNldD1cIlVURi04XCI+XG5cblxuPHNjcmlwdCB0eXBlPVwibW9kdWxlXCI+XG5cblxuYXN5bmMgZnVuY3Rpb24gbG9hZFNjcmlwdChzcmMpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjb25zdCBzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNjcmlwdFwiKTtcbiAgICBzLnNyYyA9IHNyYztcbiAgICBzLm9ubG9hZCA9IHJlc29sdmU7XG4gICAgcy5vbmVycm9yID0gcmVqZWN0O1xuICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQocyk7XG4gIH0pO1xufVxuXG5jb25zb2xlLmxvZyhcIk1vZGU6XCIsIFwiJHttb2RlfVwiKTtcblxubGV0IG1hdGhKYXhMb2FkZWQgPSBmYWxzZTtcblxuLy8gLS0tLS0tLS0tLS0gTWF0aEpheFxudHJ5IHtcbiAgYXdhaXQgbG9hZFNjcmlwdChcIiR7bWF0aEpheFNvdXJjZS5wcmltYXJ5fVwiKTtcbiAgbWF0aEpheExvYWRlZCA9IHRydWU7XG59IGNhdGNoIChlKSB7XG4gICR7bW9kZSA9PT0gXCJhdXRvXCIgPyBgXG4gIGNvbnNvbGUud2FybihcIk1hdGhKYXggcHJpbWFyeSBmYWlsZWQsIHVzaW5nIGZhbGxiYWNrXCIpO1xuICBhd2FpdCBsb2FkU2NyaXB0KFwiJHttYXRoSmF4U291cmNlLmZhbGxiYWNrfVwiKTtcbiAgbWF0aEpheExvYWRlZCA9IHRydWU7XG4gIGAgOiBcIlwifVxufVxuXG48L3NjcmlwdD5cblxuXG48c3R5bGU+XG4ke2Nzc31cbjwvc3R5bGU+XG5cbjxzdHlsZT5cbiAgYm9keSB7XG4gICAgbWFyZ2luOiAwO1xuICAgIHBhZGRpbmc6IDEwcHg7XG4gICAgb3ZlcmZsb3c6IHZpc2libGU7XG4gICAgaGVpZ2h0OiBhdXRvO1xuICB9XG5cbi8qID09PT09PT09PT09PT0gRE9FTkVUIEVYQ0VTU0lWRSBTUEFDSU5HIEZJWCA9PT09PT09PT09PT09ICovXG4vKiBJZiBtYXRoIHJlbmRlcnMgc3RyYW5nZWx5LCBpdCdzIHByb2JhYmx5IHNvbWV0aGluZyBoZXJlLiAqL1xuLyogS2lsbCB2ZXJ0aWNhbCBzdGFja2luZyBtYXJnaW5zICovXG4uZG9lbmV0LXZpZXdlciA+IGRpdiB7XG4gIG1hcmdpbi10b3A6IDAgIWltcG9ydGFudDtcbiAgbWFyZ2luLWJvdHRvbTogMCAhaW1wb3J0YW50O1xufVxuLyogS2lsbCBncmFwaCBjb250YWluZXIgbWFyZ2lucywgaHVnZSBpbXByb3ZlbWVudCBvbiBPYnNpZGlhbiBlbWJlZGRpbmcgKi9cbi5qeGdib3gge1xuICBtYXJnaW4tdG9wOiAwICFpbXBvcnRhbnQ7XG4gIG1hcmdpbi1ib3R0b206IDAgIWltcG9ydGFudDtcbn1cbi8qIFJlbW92ZSBob3Jpem9udGFsIHBhZGRpbmcgKyB3aWR0aCBjYXAgKi9cbi5kb2VuZXQtdmlld2VyIHtcbiAgcGFkZGluZy1sZWZ0OiAwICFpbXBvcnRhbnQ7XG4gIHBhZGRpbmctcmlnaHQ6IDAgIWltcG9ydGFudDtcbiAgUGFkZGluZzogMCAhaW1wb3J0YW50O1xuICBtYXgtd2lkdGg6IDEwMCUgIWltcG9ydGFudDtcbn1cbi8qIFByZXZlbnQgbmVzdGVkIHdyYXBwZXIgYnVpbGR1cCAqL1xuI2RvZW5ldC12aWV3ZXIgZGl2W3N0eWxlKj1cIm1hcmdpbjogMTJweFwiXSB7XG4gIG1hcmdpbjogMCAhaW1wb3J0YW50O1xufVxuLyogPT09PT09PT09PT09PSBET0VORVQgR1JBUEggQVhFUyA9PT09PT09PT09PT09ICovXG4vKiBUb28gYm9sZCAtLSBkZWVtcGhhc2l6ZSB0aGVtIGEgYml0LiAqL1xuLmp4Z2JveCBsaW5lIHtcbiAgc3Ryb2tlOiAjNjY2NjY2ICFpbXBvcnRhbnQ7XG59XG4vKiBMaWdodCBncmF5IGdyaWQgKi9cbi5qeGdib3ggcGF0aFtzdHJva2Utb3BhY2l0eT1cIjAuNVwiXSB7XG4gIHN0cm9rZTogI2JiYmJiYiAhaW1wb3J0YW50O1xuICBzdHJva2Utb3BhY2l0eTogMC41NSAhaW1wb3J0YW50O1xufVxuPC9zdHlsZT48L2hlYWQ+XG5cbjxib2R5PlxuXG48ZGl2IGlkPVwiYXBwXCI+PC9kaXY+XG5cblxuPHNjcmlwdCB0eXBlPVwibW9kdWxlXCI+XG5jb25zdCBwcmltYXJ5ID0gXCIke3NjcmlwdFNvdXJjZS5wcmltYXJ5fVwiO1xuY29uc3QgZmFsbGJhY2sgPSBcIiR7c2NyaXB0U291cmNlLmZhbGxiYWNrIHx8IFwiXCJ9XCI7XG5jb25zdCBtb2RlID0gXCIke21vZGV9XCI7XG5cbmxldCBEb2VuZXQ7XG5cbnRyeSB7XG4gIERvZW5ldCA9IGF3YWl0IGltcG9ydChwcmltYXJ5KTtcbiAgY29uc29sZS5sb2coXCJbRG9lbmV0XSBMb2FkZWQgcHJpbWFyeTpcIiwgcHJpbWFyeSk7XG59IGNhdGNoIChlKSB7XG4gIGlmIChtb2RlID09PSBcImF1dG9cIiAmJiBmYWxsYmFjaykge1xuICAgIGNvbnNvbGUud2FybihcIltEb2VuZXRdIFByaW1hcnkgZmFpbGVkLCB1c2luZyBmYWxsYmFjazpcIiwgZmFsbGJhY2spO1xuICAgIERvZW5ldCA9IGF3YWl0IGltcG9ydChmYWxsYmFjayk7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgZTtcbiAgfVxufVxuXG5jb25zdCBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImFwcFwiKTtcblxuLy8gSW5qZWN0IERvZW5ldE1MXG5jb25zdCBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2NyaXB0XCIpO1xuc2NyaXB0LnR5cGUgPSBcInRleHQvZG9lbmV0bWxcIjtcbnNjcmlwdC50ZXh0Q29udGVudCA9ICR7SlNPTi5zdHJpbmdpZnkoZG9lbmV0TUwpfTtcbmNvbnRhaW5lci5hcHBlbmRDaGlsZChzY3JpcHQpO1xuXG5Eb2VuZXQucmVuZGVyRG9lbmV0Vmlld2VyVG9Db250YWluZXIoXG4gIGNvbnRhaW5lcixcbiAgbnVsbCxcbiAgeyBhZGRWaXJ0dWFsS2V5Ym9hcmQ6ICR7c2hvd0tleWJvYXJkfSB9XG4pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gUkVTSVpJTkcgT0YgSUZSQU1FIFRPIEZJVCBDT05URU5UIEhFSUdIVFxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmZ1bmN0aW9uIHNlbmRTaXplKCkge1xuICBjb25zdCBoZWlnaHQgPSBkb2N1bWVudC5ib2R5LnNjcm9sbEhlaWdodDtcblxuICBwYXJlbnQucG9zdE1lc3NhZ2Uoe1xuICAgIHR5cGU6IFwiZG9lbmV0LXJlc2l6ZVwiLFxuICAgIGlkOiBcIiR7aWR9XCIsXG4gICAgaGVpZ2h0XG4gIH0sIFwiKlwiKTtcbn1cblxuLy8gUnVuIGFmdGVyIERvZW5ldCBzdGFydHMgcmVuZGVyaW5nXG5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoc2VuZFNpemUpO1xufSk7XG5cbi8vIE9ic2VydmUgQUZURVIgY29udGVudCBleGlzdHNcbmNvbnN0IG9ic2VydmVyID0gbmV3IFJlc2l6ZU9ic2VydmVyKCgpID0+IHtcbiAgc2VuZFNpemUoKTtcbn0pO1xub2JzZXJ2ZXIub2JzZXJ2ZShkb2N1bWVudC5ib2R5KTtcblxuLy8gRmluYWwgc2FmZXR5IHBhc3NcbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCBzZW5kU2l6ZSk7XG5cbjwvc2NyaXB0PlxuPC9ib2R5PlxuPC9odG1sPlxuYDtcbn0iLCAiXG5hc3luYyBmdW5jdGlvbiBsb2FkU2NyaXB0KHNyYzogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY29uc3QgZXhpc3RpbmcgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGBzY3JpcHRbc3JjPVwiJHtzcmN9XCJdYCk7XG5cbiAgICAvLyBQcmV2ZW50IGR1cGxpY2F0ZSBsb2Fkc1xuICAgIGlmIChleGlzdGluZykge1xuICAgICAgcmVzb2x2ZSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzY3JpcHRcIik7XG4gICAgc2NyaXB0LnNyYyA9IHNyYztcbiAgICBzY3JpcHQuYXN5bmMgPSB0cnVlO1xuXG4gICAgc2NyaXB0Lm9ubG9hZCA9ICgpID0+IHJlc29sdmUoKTtcbiAgICBzY3JpcHQub25lcnJvciA9ICgpID0+IHJlamVjdChuZXcgRXJyb3IoYEZhaWxlZCB0byBsb2FkICR7c3JjfWApKTtcblxuICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQoc2NyaXB0KTtcbiAgfSk7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVEb2VuZXRTY3JpcHQoXG4gIG1vZGU6IERvZW5ldE1vZGUsXG4gIGFwcDogQXBwLFxuICBwbHVnaW46IFBsdWdpblxuKTogeyBwcmltYXJ5OiBzdHJpbmc7IGZhbGxiYWNrPzogc3RyaW5nIH0ge1xuXG4gIGNvbnN0IGxvY2FsID0gYXBwLnZhdWx0LmFkYXB0ZXIuZ2V0UmVzb3VyY2VQYXRoKFxuICAgIHBsdWdpbi5tYW5pZmVzdC5kaXIgKyBcIi92ZW5kb3IvZG9lbmV0L2RvZW5ldC1zdGFuZGFsb25lLmpzXCJcbiAgKTtcblxuICBjb25zdCBjZG4gPSBcImh0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9ucG0vQGRvZW5ldC9zdGFuZGFsb25lQGxhdGVzdC9kb2VuZXQtc3RhbmRhbG9uZS5qc1wiO1xuXG4gIGlmIChtb2RlID09PSBcImxvY2FsXCIpIHJldHVybiB7IHByaW1hcnk6IGxvY2FsIH07XG4gIGlmIChtb2RlID09PSBcImNkblwiKSByZXR1cm4geyBwcmltYXJ5OiBjZG4gfTtcblxuICAvLyBhdXRvXG4gIHJldHVybiB7IHByaW1hcnk6IGNkbiwgZmFsbGJhY2s6IGxvY2FsIH07XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVNYXRoSmF4U2NyaXB0KFxuICBtb2RlOiBEb2VuZXRNb2RlLFxuICBhcHA6IEFwcCxcbiAgcGx1Z2luOiBQbHVnaW5cbik6IHsgcHJpbWFyeTogc3RyaW5nOyBmYWxsYmFjaz86IHN0cmluZyB9IHtcblxuICBjb25zdCBsb2NhbCA9IGFwcC52YXVsdC5hZGFwdGVyLmdldFJlc291cmNlUGF0aChcbiAgICBwbHVnaW4ubWFuaWZlc3QuZGlyICsgXCIvdmVuZG9yL21hdGhqYXgvZXM1L3RleC1tbWwtY2h0bWwuanNcIlxuICApO1xuXG4gIGNvbnN0IGNkbiA9IFwiaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9tYXRoamF4QDQuMS4wL3RleC1tbWwtY2h0bWwuanNcIjtcblxuICBpZiAobW9kZSA9PT0gXCJsb2NhbFwiKSByZXR1cm4geyBwcmltYXJ5OiBsb2NhbCB9O1xuICBpZiAobW9kZSA9PT0gXCJjZG5cIikgcmV0dXJuIHsgcHJpbWFyeTogY2RuIH07XG5cbiAgcmV0dXJuIHsgcHJpbWFyeTogY2RuLCBmYWxsYmFjazogbG9jYWwgfTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZURvZW5ldENTUyhcbiAgbW9kZTogRG9lbmV0TW9kZSxcbiAgYXBwOiBBcHAsXG4gIHBsdWdpbjogUGx1Z2luXG4pOiB7IHByaW1hcnk6IHN0cmluZzsgZmFsbGJhY2s/OiBzdHJpbmcgfSB7XG5cbiAgY29uc3QgbG9jYWwgPSBhcHAudmF1bHQuYWRhcHRlci5nZXRSZXNvdXJjZVBhdGgoXG4gICAgcGx1Z2luLm1hbmlmZXN0LmRpciArIFwiL3ZlbmRvci9kb2VuZXQvc3R5bGUuY3NzXCJcbiAgKTtcblxuICBjb25zdCBjZG4gPSBcImh0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9ucG0vQGRvZW5ldC9zdGFuZGFsb25lQGxhdGVzdC9zdHlsZS5jc3NcIjtcblxuICBpZiAobW9kZSA9PT0gXCJsb2NhbFwiKSByZXR1cm4geyBwcmltYXJ5OiBsb2NhbCB9O1xuICBpZiAobW9kZSA9PT0gXCJjZG5cIikgcmV0dXJuIHsgcHJpbWFyeTogY2RuIH07XG5cbiAgcmV0dXJuIHsgcHJpbWFyeTogY2RuLCBmYWxsYmFjazogbG9jYWwgfTtcbn0iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHNCQUErRDs7O0FDQXhELFNBQVMsa0JB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

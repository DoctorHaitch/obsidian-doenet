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
  const { css, doenetML, id, showKeyboard } = params;
  return `
  <!DOCTYPE html>
<html><head><meta charset="UTF-8">

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
import * as Doenet from "https://cdn.jsdelivr.net/npm/@doenet/standalone@latest/doenet-standalone.js";

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

// src/main.ts
var DEFAULT_SETTINGS = {
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
  // NEW
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
    const rawCSS = await fetch(
      "https://cdn.jsdelivr.net/npm/@doenet/standalone@latest/style.css"
    ).then((r) => r.text());
    const css = rawCSS + "\n/*# sourceURL=doenet.css */";
    const iframe = document.createElement("iframe");
    const id = "doenet-" + Math.random().toString(36).slice(2);
    iframe.dataset.doenetId = id;
    iframe.style.width = options.width || "100%";
    iframe.style.border = "none";
    iframe.style.display = "block";
    iframe.style.overflow = "visible";
    iframe.style.height = options.height || "300px";
    el.appendChild(iframe);
    iframe.srcdoc = buildIframeSrcdoc({ css, doenetML, id, showKeyboard });
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2lmcmFtZVNyY2RvYy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgUGx1Z2luLCBQbHVnaW5TZXR0aW5nVGFiLCBBcHAsIFNldHRpbmcsIE5vdGljZSB9IGZyb20gXCJvYnNpZGlhblwiOyAvL05FV1xuaW1wb3J0IHsgYnVpbGRJZnJhbWVTcmNkb2MgfSBmcm9tIFwiLi9pZnJhbWVTcmNkb2NcIjtcblxuLy8gU28gbWFueSByZW5kZXIgbGF5ZXJzLCBidXQgaXQgd29ya3MgYXMgd2VsbCBhc1xuLy8gb25lIG1pZ2h0IHBvc3NpYmx5IGhvcGUuXG4vLyBPYnNpZGlhbiBcdTIxOTIgaWZyYW1lIFx1MjE5MiBEb2VuZXQgXHUyMTkyIEpTWEdyYXBoIFx1MjE5MiBTVkdcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmludGVyZmFjZSBEb2VuZXRPcHRpb25zIHtcbiAgd2lkdGg/OiBzdHJpbmc7XG4gIGhlaWdodD86IHN0cmluZztcbiAgc2hvd2tleWJvYXJkPzogc3RyaW5nO1xuICBzb3VyY2U/OiBcInVybFwiIHwgXCJpbmxpbmVcIjtcbiAgZXJyb3I/OiBib29sZWFuO1xuICBtZXNzYWdlPzogc3RyaW5nO1xuICBba2V5OiBzdHJpbmddOiBzdHJpbmcgfCBib29sZWFuIHwgdW5kZWZpbmVkO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAgTkVXXG5pbnRlcmZhY2UgRG9lbmV0UGx1Z2luU2V0dGluZ3Mge1xuICBlbmFibGVDYWNoZTogYm9vbGVhbjtcbiAgY2FjaGVUVEw6IG51bWJlcjtcbn1cblxuY29uc3QgREVGQVVMVF9TRVRUSU5HUzogRG9lbmV0UGx1Z2luU2V0dGluZ3MgPSB7XG4gIGVuYWJsZUNhY2hlOiBmYWxzZSxcbiAgY2FjaGVUVEw6IDE0NDAsIC8vIDI0IGhvdXJzXG59O1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBORVdcbmNsYXNzIENhY2hlTWFuYWdlciB7XG4gIHBsdWdpbjogRG9lbmV0UGx1Z2luO1xuXG4gIGNvbnN0cnVjdG9yKHBsdWdpbjogRG9lbmV0UGx1Z2luKSB7XG4gICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gIH1cbiAgXG4gIHByaXZhdGUgYXN5bmMgZ2V0Q2FjaGVQYXRoKHVybDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBjb25zdCBoYXNoID0gYXdhaXQgdGhpcy5oYXNoU3RyaW5nKHVybCk7XG4gICAgcmV0dXJuIGAke3RoaXMucGx1Z2luLm1hbmlmZXN0LmRpcn0vY2FjaGUvJHtoYXNofS5qc29uYDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZW5zdXJlQ2FjaGVGb2xkZXIoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZGlyID0gYCR7dGhpcy5wbHVnaW4ubWFuaWZlc3QuZGlyfS9jYWNoZWA7XG5cbiAgICBpZiAoIShhd2FpdCB0aGlzLnBsdWdpbi5hcHAudmF1bHQuYWRhcHRlci5leGlzdHMoZGlyKSkpIHtcbiAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmFwcC52YXVsdC5hZGFwdGVyLm1rZGlyKGRpcik7XG4gICAgfVxuICB9XG4gIFxuICAvLyAtLS0tLS0tLS0tLSBVcGRhdGVkIHdpdGggZGVidWcgb3V0cHV0LlxuICBhc3luYyBnZXQodXJsOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcbiAgICBpZiAoIXRoaXMucGx1Z2luLnNldHRpbmdzLmVuYWJsZUNhY2hlKSB7XG4gICAgICBjb25zb2xlLmxvZyhcIltEb2VuZXRdIENhY2hlIGRpc2FibGVkXCIpO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgcGF0aCA9IGF3YWl0IHRoaXMuZ2V0Q2FjaGVQYXRoKHVybCk7IC8vIFVQREFURUQgdG8gYXN5bmNcblxuICAgIGlmICghKGF3YWl0IHRoaXMucGx1Z2luLmFwcC52YXVsdC5hZGFwdGVyLmV4aXN0cyhwYXRoKSkpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiW0RvZW5ldF0gQ2FjaGUgbWlzcyAobm8gZmlsZSk6XCIsIHVybCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgcmF3ID0gYXdhaXQgdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmFkYXB0ZXIucmVhZChwYXRoKTtcbiAgICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKHJhdyk7XG5cbiAgICAgIGNvbnN0IGFnZU1pbnV0ZXMgPVxuICAgICAgICAoRGF0ZS5ub3coKSAtIGRhdGEudGltZXN0YW1wKSAvICgxMDAwICogNjApO1xuXG4gICAgICBpZiAoYWdlTWludXRlcyA+IHRoaXMucGx1Z2luLnNldHRpbmdzLmNhY2hlVFRMKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiW0RvZW5ldF0gQ2FjaGUgZXhwaXJlZDpcIiwgdXJsKTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIGNvbnNvbGUubG9nKFwiW0RvZW5ldF0gQ2FjaGUgSElUOlwiLCBkYXRhLnVybCk7XG4gICAgICByZXR1cm4gZGF0YS5jb250ZW50O1xuXG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc29sZS5lcnJvcihcIltEb2VuZXRdIENhY2hlIHJlYWQgZXJyb3I6XCIsIGUpO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgc2V0KHVybDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMucGx1Z2luLnNldHRpbmdzLmVuYWJsZUNhY2hlKSByZXR1cm47XG5cbiAgICBjb25zdCBwYXRoID0gYXdhaXQgdGhpcy5nZXRDYWNoZVBhdGgodXJsKTsgLy8gVVBEQVRFRCB0byBhc3luY1xuXG4gICAgYXdhaXQgdGhpcy5lbnN1cmVDYWNoZUZvbGRlcigpO1xuXG4gICAgY29uc3QgZGF0YSA9IHtcbiAgICAgIHVybCwgXG4gICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXG4gICAgICBjb250ZW50LFxuICAgIH07XG5cbiAgICB0cnkge1xuICAgICAgY29uc29sZS5sb2coXCJbRG9lbmV0XSBDYWNoaW5nIHJlc3BvbnNlOlwiLCB1cmwpO1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmFkYXB0ZXIud3JpdGUoXG4gICAgICAgIHBhdGgsXG4gICAgICAgIEpTT04uc3RyaW5naWZ5KGRhdGEpXG4gICAgICApO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJDYWNoZSB3cml0ZSBlcnJvcjpcIiwgZSk7XG4gICAgfVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tIE5FV1xuICBwcml2YXRlIGFzeW5jIGhhc2hTdHJpbmcoaW5wdXQ6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3QgZW5jb2RlciA9IG5ldyBUZXh0RW5jb2RlcigpO1xuICAgIGNvbnN0IGRhdGEgPSBlbmNvZGVyLmVuY29kZShpbnB1dCk7XG5cbiAgICBjb25zdCBoYXNoQnVmZmVyID0gYXdhaXQgY3J5cHRvLnN1YnRsZS5kaWdlc3QoXCJTSEEtMjU2XCIsIGRhdGEpO1xuICAgIGNvbnN0IGhhc2hBcnJheSA9IEFycmF5LmZyb20obmV3IFVpbnQ4QXJyYXkoaGFzaEJ1ZmZlcikpO1xuXG4gICAgcmV0dXJuIGhhc2hBcnJheS5tYXAoYiA9PiBiLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCBcIjBcIikpLmpvaW4oXCJcIik7XG4gIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIERvZW5ldFBsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gIHNldHRpbmdzOiBEb2VuZXRQbHVnaW5TZXR0aW5nczsgLy8gTkVXXG4gIFxuICBhc3luYyBvbmxvYWQoKSB7XG4gICAgY29uc29sZS5sb2coXCJEb2VuZXQgcGx1Z2luIChpZnJhbWUgbW9kZSkgbG9hZGVkXCIpO1xuXG4gICAgYXdhaXQgdGhpcy5sb2FkU2V0dGluZ3MoKTsgIC8vIE5FV1xuICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgRG9lbmV0U2V0dGluZ1RhYih0aGlzLmFwcCwgdGhpcykpOyAvLyBORVdcblxuXG4gICAgdGhpcy5yZWdpc3Rlck1hcmtkb3duQ29kZUJsb2NrUHJvY2Vzc29yKFxuICAgICAgXCJkb2VuZXRcIixcbiAgICAgIGFzeW5jIChzb3VyY2UgOiBzdHJpbmcsIGVsOiBIVE1MRWxlbWVudCkgPT4ge1xuICAgICAgICBhd2FpdCB0aGlzLnJlbmRlckRvZW5ldElmcmFtZShzb3VyY2UsIGVsKTtcbiAgICAgIH1cbiAgICApO1xuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gTkVXXG5cbiAgYXN5bmMgbG9hZFNldHRpbmdzKCkge1xuICAgIHRoaXMuc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBERUZBVUxUX1NFVFRJTkdTLCBhd2FpdCB0aGlzLmxvYWREYXRhKCkpO1xuICB9XG5cbiAgYXN5bmMgc2F2ZVNldHRpbmdzKCkge1xuICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7XG4gIH1cblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBhc3luYyBwYXJzZUZpcnN0TGluZU9wdGlvbnMoc291cmNlIDogc3RyaW5nKTogUHJvbWlzZTx7XG4gICAgZG9lbmV0TUw6IHN0cmluZzsgXG4gICAgb3B0aW9uczogRG9lbmV0T3B0aW9uc1xuICB9PiB7XG4gICAgY29uc3QgdHJpbW1lZFNvdXJjZSA9IHNvdXJjZS50cmltKCk7XG4gICAgY29uc3QgbGluZXMgPSB0cmltbWVkU291cmNlLnNwbGl0KFwiXFxuXCIpO1xuICAgIGNvbnN0IG9wdGlvbnM6IERvZW5ldE9wdGlvbnMgPSB7fTtcbiAgICBsZXQgc3RhcnRJbmRleCA9IDA7XG5cbiAgICAvLyBTdHJpcHMgZmlyc3QtbGluZSBvcHRpb25zIGFuZCByZXR1cm5zIHRoZW0sXG4gICAgLy8gYWxvbmcgd2l0aCB0aGUgcmVtYWluaW5nIERvZW5ldE1MIGNvbnRlbnQuXG4gICAgaWYgKGxpbmVzWzBdPy50cmltKCkuc3RhcnRzV2l0aChcIiNcIikpIHtcbiAgICAgIGNvbnN0IGRpcmVjdGl2ZSA9IGxpbmVzWzBdIS50cmltKCkuc3Vic3RyaW5nKDEpLnRyaW0oKTtcblxuICAgICAgZGlyZWN0aXZlLnNwbGl0KC9cXHMrLykuZm9yRWFjaCgocGFpcikgPT4ge1xuICAgICAgICBjb25zdCBba2V5LCB2YWx1ZV0gPSBwYWlyLnNwbGl0KFwiPVwiKTtcbiAgICAgICAgaWYgKGtleSAmJiB2YWx1ZSkge1xuICAgICAgICAgIG9wdGlvbnNba2V5LnRyaW0oKV0gPSB2YWx1ZS50cmltKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBzdGFydEluZGV4ID0gMTtcbiAgICB9XG4gICAgbGV0IGRvZW5ldE1MID0gbGluZXMuc2xpY2Uoc3RhcnRJbmRleCkuam9pbihcIlxcblwiKS50cmltKCk7XG5cbiAgICAvLyBQcm9jZXNzIGNvbnRlbnQsIGlmIHVybCwgZmV0Y2ggY29udGVudCwgaWYgaW5saW5lLCB1c2UgYXMtaXMuXG4gICAgY29uc3QgaXNVUkwgPSAvXmh0dHBzPzpcXC9cXC9cXFMrJC8udGVzdChkb2VuZXRNTCk7XG4gICAgaWYgKGlzVVJMKSB7XG4gICAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gTkVXXG4gICAgICBjb25zdCBjYWNoZSA9IG5ldyBDYWNoZU1hbmFnZXIodGhpcyk7XG5cbiAgICAgIC8vIFRyeSBjYWNoZSBmaXJzdFxuICAgICAgY29uc3QgY2FjaGVkID0gYXdhaXQgY2FjaGUuZ2V0KGRvZW5ldE1MKTtcbiAgICAgIGlmIChjYWNoZWQpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBkb2VuZXRNTDogY2FjaGVkLFxuICAgICAgICAgIG9wdGlvbnM6IHsgLi4ub3B0aW9ucywgc291cmNlOiBcInVybFwiIH1cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gVGltZW91dCBhZnRlciA4IHNlY29uZHMgdG8gcHJldmVudCBoYW5naW5nIG9uIGJhZCBVUkxzLlxuICAgICAgICBjb25zdCBjb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuICAgICAgICBjb25zdCB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KCgpID0+IGNvbnRyb2xsZXIuYWJvcnQoKSwgODAwMCk7IC8vIDhzIHRpbWVvdXRcbiAgICAgICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goZG9lbmV0TUwgKyBcIj90PVwiICsgRGF0ZS5ub3coKSwge1xuICAgICAgICAgIHNpZ25hbDogY29udHJvbGxlci5zaWduYWxcbiAgICAgICAgfSk7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuXG4gICAgICAgIC8vIENoZWNrIGZvciBIVFRQIGVycm9yc1xuICAgICAgICBpZiAoIXJlcy5vaykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRmV0Y2ggZmFpbGVkIHdpdGggc3RhdHVzICR7cmVzLnN0YXR1c30gJHtyZXMuc3RhdHVzVGV4dH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGZldGNoZWRUZXh0ID0gYXdhaXQgcmVzLnRleHQoKTtcbiAgICAgICAgYXdhaXQgY2FjaGUuc2V0KGRvZW5ldE1MLCBmZXRjaGVkVGV4dCk7XG5cbiAgICAgICAgLy8gVmFsaWRhdGUgcmVzcG9uc2UgaXMgbm9uLWVtcHR5LlxuICAgICAgICBpZiAoIWZldGNoZWRUZXh0IHx8ICFmZXRjaGVkVGV4dC50cmltKCkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGZXRjaGVkIGNvbnRlbnQgaXMgZW1wdHlcIik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZXR1cm4gRG9lbmV0TUwgd2l0aCBzb3VyY2UgaW5mbyBmb3IgZGVidWdnaW5nLlxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGRvZW5ldE1MOiBmZXRjaGVkVGV4dC50cmltKCksXG4gICAgICAgICAgb3B0aW9uczogeyAuLi5vcHRpb25zLCBzb3VyY2U6IFwidXJsXCIgfVxuICAgICAgICB9O1xuXG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkVycm9yIGZldGNoaW5nIERvZW5ldE1MIGZyb20gVVJMOlwiLCBlcnIpO1xuXG4gICAgICAgIGNvbnN0IGVycm9yID0gZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIgOiBuZXcgRXJyb3IoXCJVbmtub3duIGVycm9yXCIpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgZG9lbmV0TUw6IFwiXCIsXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgIHNvdXJjZTogXCJ1cmxcIixcbiAgICAgICAgICAgIGVycm9yOiB0cnVlLFxuICAgICAgICAgICAgbWVzc2FnZTogZXJyb3IubmFtZSA9PT0gXCJBYm9ydEVycm9yXCJcbiAgICAgICAgICAgICAgPyBcIlJlcXVlc3QgdGltZWQgb3V0IHdoaWxlIGZldGNoaW5nIFVSTFwiXG4gICAgICAgICAgICAgIDogZXJyb3IubWVzc2FnZSB8fCBcIlVua25vd24gZmV0Y2ggZXJyb3JcIlxuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gUmV0dXJuIGlubGluZSBEb2VuZXRNTCB3aXRoIGFueSBwcm9jZXNzZWQgb3B0aW9ucy5cbiAgICByZXR1cm4geyBkb2VuZXRNTCwgb3B0aW9ucyB9O1xuICB9XG5cblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBhc3luYyByZW5kZXJEb2VuZXRJZnJhbWUoc291cmNlIDogc3RyaW5nLCBlbDogSFRNTEVsZW1lbnQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB7IGRvZW5ldE1MLCBvcHRpb25zIH0gPSBhd2FpdCB0aGlzLnBhcnNlRmlyc3RMaW5lT3B0aW9ucyhzb3VyY2UpO1xuICAgIGNvbnN0IHNob3dLZXlib2FyZCA9IG9wdGlvbnMuc2hvd2tleWJvYXJkID09PSBcImZhbHNlXCI7XG4gICAgY29uc3QgcmF3Q1NTID0gYXdhaXQgZmV0Y2goXG4gICAgICBcImh0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9ucG0vQGRvZW5ldC9zdGFuZGFsb25lQGxhdGVzdC9zdHlsZS5jc3NcIlxuICAgICkudGhlbihyID0+IHIudGV4dCgpKTtcbiAgICBjb25zdCBjc3MgPSByYXdDU1MgKyBcIlxcbi8qIyBzb3VyY2VVUkw9ZG9lbmV0LmNzcyAqL1wiO1xuICAgIGNvbnN0IGlmcmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpZnJhbWVcIik7XG4gICAgY29uc3QgaWQgPSBcImRvZW5ldC1cIiArIE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnNsaWNlKDIpO1xuXG4gICAgLy8gU2V0IGlmcmFtZSBhdHRyaWJ1dGVzIGFuZCBzdHlsZXMgZm9yIG9wdGltYWwgRG9lbmV0IHJlbmRlcmluZ1xuICAgIGlmcmFtZS5kYXRhc2V0LmRvZW5ldElkID0gaWQ7XG4gICAgaWZyYW1lLnN0eWxlLndpZHRoID0gb3B0aW9ucy53aWR0aCB8fCBcIjEwMCVcIjsgLy8gRnVsbCB3aWR0aCBieSBkZWZhdWx0XG4gICAgaWZyYW1lLnN0eWxlLmJvcmRlciA9IFwibm9uZVwiOyAvLyBSZW1vdmUgZGVmYXVsdCBib3JkZXJcbiAgICBpZnJhbWUuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjsgLy8gUmVtb3ZlIGRlZmF1bHQgaW5saW5lIHNwYWNpbmdcbiAgICBpZnJhbWUuc3R5bGUub3ZlcmZsb3cgPSBcInZpc2libGVcIjsgLy8gQWxsb3cgaWZyYW1lIHRvIGV4cGFuZCB3aXRoIGNvbnRlbnRcbiAgICBpZnJhbWUuc3R5bGUuaGVpZ2h0ID0gb3B0aW9ucy5oZWlnaHQgfHwgXCIzMDBweFwiOyAvLyBQcmV2ZW50IGNvbGxhcHNlXG4gICAgZWwuYXBwZW5kQ2hpbGQoaWZyYW1lKTsgLy8gQWRkIGlmcmFtZSB0byBET00gYmVmb3JlIHNldHRpbmcgc3JjZG9jIGZvciBiZXR0ZXIgcGVyZm9ybWFuY2VcblxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tSW5qZWN0IEZVTEwgaWZyYW1lIGNvbnRlbnRcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vIFN3aXRjaCB0byBjYWxsaW5nIGZ1bmN0aW9uIHRvIGJ1aWxkIGZ1bGwgc3JjZG9jIGNvbnRlbnQsIGluY2x1ZGluZyBDU1MgYW5kIERvZW5ldE1MLlxuICAgIGlmcmFtZS5zcmNkb2MgPSBidWlsZElmcmFtZVNyY2RvYyh7IGNzcywgZG9lbmV0TUwsIGlkLCBzaG93S2V5Ym9hcmQgfSk7XG5cbiAgICAvLyBTYWZlIEhlaWdodCBGYWxsYmFjaz8gSXMgdGhpcyBzdGlsbCBuZWNlc3Nhcnk/XG4gICAgaWZyYW1lLm9ubG9hZCA9ICgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGRvYyA9IGlmcmFtZS5jb250ZW50RG9jdW1lbnQ7XG4gICAgICAgIGlmIChkb2M/LmJvZHkpIHtcbiAgICAgICAgICBjb25zdCByZXNpemUgPSAoKSA9PiB7XG4gICAgICAgICAgICBpZnJhbWUuc3R5bGUuaGVpZ2h0ID0gZG9jLmJvZHkuc2Nyb2xsSGVpZ2h0ICsgXCJweFwiO1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICByZXNpemUoKTsgLy8gaW5pdGlhbFxuICAgICAgICAgIG5ldyBSZXNpemVPYnNlcnZlcihyZXNpemUpLm9ic2VydmUoZG9jLmJvZHkpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7fVxuICAgIH07XG5cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vIFBhcmVudCByZXNpemUgbGlzdGVuZXIgKFVOQ0hBTkdFRClcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIGNvbnN0IGxpc3RlbmVyID0gKGV2ZW50OiBNZXNzYWdlRXZlbnQpID0+IHtcbiAgICAvLyAgY29uc29sZS5sb2coXCJNRVNTQUdFIFJFQ0VJVkVEOlwiLCB7XG4gICAgLy8gICAgZGF0YTogZXZlbnQuZGF0YSxcbiAgICAvLyAgICBvcmlnaW46IGV2ZW50Lm9yaWdpbixcbiAgICAvLyAgICBzb3VyY2VNYXRjaGVzOiBldmVudC5zb3VyY2UgPT09IGlmcmFtZS5jb250ZW50V2luZG93XG4gICAgLy8gIH0pO1xuXG4gICAgICBpZiAoXG4gICAgICAgIGV2ZW50LnNvdXJjZSA9PT0gaWZyYW1lLmNvbnRlbnRXaW5kb3cgJiZcbiAgICAgICAgZXZlbnQuZGF0YT8udHlwZSA9PT0gXCJkb2VuZXQtcmVzaXplXCIgJiZcbiAgICAgICAgZXZlbnQuZGF0YS5pZCA9PT0gaWRcbiAgICAgICkge1xuICAgICAgICBpZnJhbWUuc3R5bGUuaGVpZ2h0ID0gZXZlbnQuZGF0YS5oZWlnaHQgKyBcInB4XCI7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBsaXN0ZW5lcik7XG5cbiAgICAvLyBDbGVhbnVwXG4gICAgdGhpcy5yZWdpc3RlcigoKSA9PiB7XG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgbGlzdGVuZXIpO1xuICAgIH0pO1xuICB9XG59O1xuXG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICBORVdcbmNsYXNzIERvZW5ldFNldHRpbmdUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcbiAgcGx1Z2luOiBEb2VuZXRQbHVnaW47XG5cbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogRG9lbmV0UGx1Z2luKSB7XG4gICAgc3VwZXIoYXBwLCBwbHVnaW4pO1xuICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICB9XG5cbiAgZGlzcGxheSgpOiB2b2lkIHtcbiAgICBjb25zdCB7IGNvbnRhaW5lckVsIH0gPSB0aGlzO1xuICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XG5cbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCJEb2VuZXQgU2V0dGluZ3NcIiB9KTtcblxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyBFbmFibGUgQ2FjaGUgVG9nZ2xlXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJFbmFibGUgbG9jYWwgY2FjaGluZ1wiKVxuICAgICAgLnNldERlc2MoXCJDYWNoZSByZW1vdGVseSBmZXRjaGVkIGZpbGVzIGxvY2FsbHkgZm9yIGZhc3RlciBsb2FkaW5nLlwiKVxuICAgICAgLmFkZFRvZ2dsZSh0b2dnbGUgPT5cbiAgICAgICAgdG9nZ2xlXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmVuYWJsZUNhY2hlKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmVuYWJsZUNhY2hlID0gdmFsdWU7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcblxuICAgICAgICAgICAgdGhpcy5kaXNwbGF5KCk7IC8vIHJlZnJlc2ggVUlcbiAgICAgICAgICB9KVxuICAgICAgKTtcblxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyBDYWNoZSBUVEwgSW5wdXRcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkNhY2hlIGR1cmF0aW9uIChtaW51dGVzKVwiKVxuICAgICAgLnNldERlc2MoXCJIb3cgbG9uZyBjYWNoZWQgZmlsZXMgc2hvdWxkIGJlIHJldXNlZCBiZWZvcmUgcmVmZXRjaGluZy5cIilcbiAgICAgIC5hZGRUZXh0KHRleHQgPT4ge1xuICAgICAgICB0ZXh0XG4gICAgICAgICAgLnNldFBsYWNlaG9sZGVyKFwiMTQ0MFwiKVxuICAgICAgICAgIC5zZXRWYWx1ZShTdHJpbmcodGhpcy5wbHVnaW4uc2V0dGluZ3MuY2FjaGVUVEwpKVxuICAgICAgICAgIC5zZXREaXNhYmxlZCghdGhpcy5wbHVnaW4uc2V0dGluZ3MuZW5hYmxlQ2FjaGUpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbnVtID0gcGFyc2VJbnQodmFsdWUpO1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuY2FjaGVUVEwgPSBpc05hTihudW0pID8gMTQ0MCA6IG51bTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vIENsZWFyIENhY2hlIEJ1dHRvblxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQ2xlYXIgY2FjaGVcIilcbiAgICAgIC5zZXREZXNjKFwiRGVsZXRlIGFsbCBsb2NhbGx5IGNhY2hlZCBEb2VuZXQgZmlsZXMuXCIpXG4gICAgICAuYWRkQnV0dG9uKGJ1dHRvbiA9PlxuICAgICAgICBidXR0b25cbiAgICAgICAgICAuc2V0QnV0dG9uVGV4dChcIkNsZWFyXCIpXG4gICAgICAgICAgLnNldFdhcm5pbmcoKVxuICAgICAgICAgIC5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGRpciA9IGAke3RoaXMucGx1Z2luLm1hbmlmZXN0LmRpcn0vY2FjaGVgO1xuXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBpZiAoYXdhaXQgdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmFkYXB0ZXIuZXhpc3RzKGRpcikpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5hcHAudmF1bHQuYWRhcHRlci5ybWRpcihkaXIsIHRydWUpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiW0RvZW5ldF0gQ2FjaGUgY2xlYXJlZFwiKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIltEb2VuZXRdIE5vIGNhY2hlIGZvbGRlciB0byBjbGVhclwiKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiW0RvZW5ldF0gRXJyb3IgY2xlYXJpbmcgY2FjaGU6XCIsIGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV3IE5vdGljZShcIkRvZW5ldCBjYWNoZSBjbGVhcmVkXCIpO1xuICAgICAgICAgIH0pXG4gICAgICApOyAgXG4gIH1cbn0iLCAiZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkSWZyYW1lU3JjZG9jKHBhcmFtczoge1xuICAgIGNzczogc3RyaW5nO1xuICAgIGRvZW5ldE1MOiBzdHJpbmc7XG4gICAgaWQ6IHN0cmluZztcbiAgICBzaG93S2V5Ym9hcmQ6IGJvb2xlYW47XG59KTogc3RyaW5nIHtcbiAgY29uc3QgeyBjc3MsIGRvZW5ldE1MLCBpZCwgc2hvd0tleWJvYXJkIH0gPSBwYXJhbXM7XG4gIHJldHVybiBgXG4gIDwhRE9DVFlQRSBodG1sPlxuPGh0bWw+PGhlYWQ+PG1ldGEgY2hhcnNldD1cIlVURi04XCI+XG5cbjxzdHlsZT5cbiR7Y3NzfVxuPC9zdHlsZT5cblxuPHN0eWxlPlxuICBib2R5IHtcbiAgICBtYXJnaW46IDA7XG4gICAgcGFkZGluZzogMTBweDtcbiAgICBvdmVyZmxvdzogdmlzaWJsZTtcbiAgICBoZWlnaHQ6IGF1dG87XG4gIH1cblxuLyogPT09PT09PT09PT09PSBET0VORVQgRVhDRVNTSVZFIFNQQUNJTkcgRklYID09PT09PT09PT09PT0gKi9cbi8qIElmIG1hdGggcmVuZGVycyBzdHJhbmdlbHksIGl0J3MgcHJvYmFibHkgc29tZXRoaW5nIGhlcmUuICovXG4vKiBLaWxsIHZlcnRpY2FsIHN0YWNraW5nIG1hcmdpbnMgKi9cbi5kb2VuZXQtdmlld2VyID4gZGl2IHtcbiAgbWFyZ2luLXRvcDogMCAhaW1wb3J0YW50O1xuICBtYXJnaW4tYm90dG9tOiAwICFpbXBvcnRhbnQ7XG59XG4vKiBLaWxsIGdyYXBoIGNvbnRhaW5lciBtYXJnaW5zLCBodWdlIGltcHJvdmVtZW50IG9uIE9ic2lkaWFuIGVtYmVkZGluZyAqL1xuLmp4Z2JveCB7XG4gIG1hcmdpbi10b3A6IDAgIWltcG9ydGFudDtcbiAgbWFyZ2luLWJvdHRvbTogMCAhaW1wb3J0YW50O1xufVxuLyogUmVtb3ZlIGhvcml6b250YWwgcGFkZGluZyArIHdpZHRoIGNhcCAqL1xuLmRvZW5ldC12aWV3ZXIge1xuICBwYWRkaW5nLWxlZnQ6IDAgIWltcG9ydGFudDtcbiAgcGFkZGluZy1yaWdodDogMCAhaW1wb3J0YW50O1xuICBQYWRkaW5nOiAwICFpbXBvcnRhbnQ7XG4gIG1heC13aWR0aDogMTAwJSAhaW1wb3J0YW50O1xufVxuLyogUHJldmVudCBuZXN0ZWQgd3JhcHBlciBidWlsZHVwICovXG4jZG9lbmV0LXZpZXdlciBkaXZbc3R5bGUqPVwibWFyZ2luOiAxMnB4XCJdIHtcbiAgbWFyZ2luOiAwICFpbXBvcnRhbnQ7XG59XG4vKiA9PT09PT09PT09PT09IERPRU5FVCBHUkFQSCBBWEVTID09PT09PT09PT09PT0gKi9cbi8qIFRvbyBib2xkIC0tIGRlZW1waGFzaXplIHRoZW0gYSBiaXQuICovXG4uanhnYm94IGxpbmUge1xuICBzdHJva2U6ICM2NjY2NjYgIWltcG9ydGFudDtcbn1cbi8qIExpZ2h0IGdyYXkgZ3JpZCAqL1xuLmp4Z2JveCBwYXRoW3N0cm9rZS1vcGFjaXR5PVwiMC41XCJdIHtcbiAgc3Ryb2tlOiAjYmJiYmJiICFpbXBvcnRhbnQ7XG4gIHN0cm9rZS1vcGFjaXR5OiAwLjU1ICFpbXBvcnRhbnQ7XG59XG48L3N0eWxlPjwvaGVhZD5cblxuPGJvZHk+XG5cbjxkaXYgaWQ9XCJhcHBcIj48L2Rpdj5cblxuPHNjcmlwdCB0eXBlPVwibW9kdWxlXCI+XG5pbXBvcnQgKiBhcyBEb2VuZXQgZnJvbSBcImh0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9ucG0vQGRvZW5ldC9zdGFuZGFsb25lQGxhdGVzdC9kb2VuZXQtc3RhbmRhbG9uZS5qc1wiO1xuXG5jb25zdCBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImFwcFwiKTtcblxuLy8gSW5qZWN0IERvZW5ldE1MXG5jb25zdCBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2NyaXB0XCIpO1xuc2NyaXB0LnR5cGUgPSBcInRleHQvZG9lbmV0bWxcIjtcbnNjcmlwdC50ZXh0Q29udGVudCA9ICR7SlNPTi5zdHJpbmdpZnkoZG9lbmV0TUwpfTtcbmNvbnRhaW5lci5hcHBlbmRDaGlsZChzY3JpcHQpO1xuXG5Eb2VuZXQucmVuZGVyRG9lbmV0Vmlld2VyVG9Db250YWluZXIoXG4gIGNvbnRhaW5lcixcbiAgbnVsbCxcbiAgeyBhZGRWaXJ0dWFsS2V5Ym9hcmQ6ICR7c2hvd0tleWJvYXJkfSB9XG4pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gUkVTSVpJTkcgT0YgSUZSQU1FIFRPIEZJVCBDT05URU5UIEhFSUdIVFxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmZ1bmN0aW9uIHNlbmRTaXplKCkge1xuICBjb25zdCBoZWlnaHQgPSBkb2N1bWVudC5ib2R5LnNjcm9sbEhlaWdodDtcblxuICBwYXJlbnQucG9zdE1lc3NhZ2Uoe1xuICAgIHR5cGU6IFwiZG9lbmV0LXJlc2l6ZVwiLFxuICAgIGlkOiBcIiR7aWR9XCIsXG4gICAgaGVpZ2h0XG4gIH0sIFwiKlwiKTtcbn1cblxuLy8gUnVuIGFmdGVyIERvZW5ldCBzdGFydHMgcmVuZGVyaW5nXG5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoc2VuZFNpemUpO1xufSk7XG5cbi8vIE9ic2VydmUgQUZURVIgY29udGVudCBleGlzdHNcbmNvbnN0IG9ic2VydmVyID0gbmV3IFJlc2l6ZU9ic2VydmVyKCgpID0+IHtcbiAgc2VuZFNpemUoKTtcbn0pO1xub2JzZXJ2ZXIub2JzZXJ2ZShkb2N1bWVudC5ib2R5KTtcblxuLy8gRmluYWwgc2FmZXR5IHBhc3NcbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCBzZW5kU2l6ZSk7XG5cbjwvc2NyaXB0PlxuPC9ib2R5PlxuPC9odG1sPlxuYDtcbn0iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHNCQUErRDs7O0FDQXhELFNBQVMsa0JBQWtCLFFBS3ZCO0FBQ1QsUUFBTSxFQUFFLEtBQUssVUFBVSxJQUFJLGFBQWEsSUFBSTtBQUM1QyxTQUFPO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFB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QUFZLElBQUk7QUFDeEIsZ0JBQVksTUFBTTtBQUVsQixnQkFBWSxTQUFTLE1BQU0sRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBS3RELFFBQUksd0JBQVEsV0FBVyxFQUNwQixRQUFRLHNCQUFzQixFQUM5QixRQUFRLDBEQUEwRCxFQUNsRTtBQUFBLE1BQVUsWUFDVCxPQUNHLFNBQVMsS0FBSyxPQUFPLFNBQVMsV0FBVyxFQUN6QyxTQUFTLE9BQU8sVUFBVTtBQUN6QixhQUFLLE9BQU8sU0FBUyxjQUFjO0FBQ25DLGNBQU0sS0FBSyxPQUFPLGFBQWE7QUFFL0IsYUFBSyxRQUFRO0FBQUEsTUFDZixDQUFDO0FBQUEsSUFDTDtBQUtGLFFBQUksd0JBQVEsV0FBVyxFQUNwQixRQUFRLDBCQUEwQixFQUNsQyxRQUFRLDJEQUEyRCxFQUNuRSxRQUFRLFVBQVE7QUFDZixXQUNHLGVBQWUsTUFBTSxFQUNyQixTQUFTLE9BQU8sS0FBSyxPQUFPLFNBQVMsUUFBUSxDQUFDLEVBQzlDLFlBQVksQ0FBQyxLQUFLLE9BQU8sU0FBUyxXQUFXLEVBQzdDLFNBQVMsT0FBTyxVQUFVO0FBQ3pCLGNBQU0sTUFBTSxTQUFTLEtBQUs7QUFDMUIsYUFBSyxPQUFPLFNBQVMsV0FBVyxNQUFNLEdBQUcsSUFBSSxPQUFPO0FBQ3BELGNBQU0sS0FBSyxPQUFPLGFBQWE7QUFBQSxNQUNqQyxDQUFDO0FBQUEsSUFDTCxDQUFDO0FBSUgsUUFBSSx3QkFBUSxXQUFXLEVBQ3BCLFFBQVEsYUFBYSxFQUNyQixRQUFRLHlDQUF5QyxFQUNqRDtBQUFBLE1BQVUsWUFDVCxPQUNHLGNBQWMsT0FBTyxFQUNyQixXQUFXLEVBQ1gsUUFBUSxZQUFZO0FBQ25CLGNBQU0sTUFBTSxHQUFHLEtBQUssT0FBTyxTQUFTLEdBQUc7QUFFdkMsWUFBSTtBQUNGLGNBQUksTUFBTSxLQUFLLE9BQU8sSUFBSSxNQUFNLFFBQVEsT0FBTyxHQUFHLEdBQUc7QUFDbkQsa0JBQU0sS0FBSyxPQUFPLElBQUksTUFBTSxRQUFRLE1BQU0sS0FBSyxJQUFJO0FBQ25ELG9CQUFRLElBQUksd0JBQXdCO0FBQUEsVUFDdEMsT0FBTztBQUNMLG9CQUFRLElBQUksbUNBQW1DO0FBQUEsVUFDakQ7QUFBQSxRQUNGLFNBQVMsR0FBRztBQUNWLGtCQUFRLE1BQU0sa0NBQWtDLENBQUM7QUFBQSxRQUNuRDtBQUNBLFlBQUksdUJBQU8sc0JBQXNCO0FBQUEsTUFDbkMsQ0FBQztBQUFBLElBQ0w7QUFBQSxFQUNKO0FBQ0Y7IiwKICAibmFtZXMiOiBbXQp9Cg==

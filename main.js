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

// 
// const showKeyboard = "${showKeyboard}"; // Obsolete, now passed via options object

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
var DoenetPlugin = class extends import_obsidian.Plugin {
  async onload() {
    console.log("Doenet plugin (iframe mode) loaded");
    this.registerMarkdownCodeBlockProcessor(
      "doenet",
      async (source, el) => {
        await this.renderDoenetIframe(source, el);
      }
    );
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2lmcmFtZVNyY2RvYy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgUGx1Z2luIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgeyBidWlsZElmcmFtZVNyY2RvYyB9IGZyb20gXCIuL2lmcmFtZVNyY2RvY1wiO1xuXG4vLyBTbyBtYW55IHJlbmRlciBsYXllcnMsIGJ1dCBpdCB3b3JrcyBhcyB3ZWxsIGFzXG4vLyBvbmUgbWlnaHQgcG9zc2libHkgaG9wZS5cbi8vIE9ic2lkaWFuIFx1MjE5MiBpZnJhbWUgXHUyMTkyIERvZW5ldCBcdTIxOTIgSlNYR3JhcGggXHUyMTkyIFNWR1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuaW50ZXJmYWNlIERvZW5ldE9wdGlvbnMge1xuICB3aWR0aD86IHN0cmluZztcbiAgaGVpZ2h0Pzogc3RyaW5nO1xuICBzaG93a2V5Ym9hcmQ/OiBzdHJpbmc7XG4gIHNvdXJjZT86IFwidXJsXCIgfCBcImlubGluZVwiO1xuICBlcnJvcj86IGJvb2xlYW47XG4gIG1lc3NhZ2U/OiBzdHJpbmc7XG4gIFtrZXk6IHN0cmluZ106IHN0cmluZyB8IGJvb2xlYW4gfCB1bmRlZmluZWQ7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBEb2VuZXRQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuXG4gIGFzeW5jIG9ubG9hZCgpIHtcbiAgICBjb25zb2xlLmxvZyhcIkRvZW5ldCBwbHVnaW4gKGlmcmFtZSBtb2RlKSBsb2FkZWRcIik7XG5cbiAgICB0aGlzLnJlZ2lzdGVyTWFya2Rvd25Db2RlQmxvY2tQcm9jZXNzb3IoXG4gICAgICBcImRvZW5ldFwiLFxuICAgICAgYXN5bmMgKHNvdXJjZSA6IHN0cmluZywgZWw6IEhUTUxFbGVtZW50KSA9PiB7XG4gICAgICAgIGF3YWl0IHRoaXMucmVuZGVyRG9lbmV0SWZyYW1lKHNvdXJjZSwgZWwpO1xuICAgICAgfVxuICAgICk7XG4gIH1cblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBhc3luYyBwYXJzZUZpcnN0TGluZU9wdGlvbnMoc291cmNlIDogc3RyaW5nKTogUHJvbWlzZTx7XG4gICAgZG9lbmV0TUw6IHN0cmluZzsgXG4gICAgb3B0aW9uczogRG9lbmV0T3B0aW9uc1xuICB9PiB7XG4gICAgY29uc3QgdHJpbW1lZFNvdXJjZSA9IHNvdXJjZS50cmltKCk7XG4gICAgY29uc3QgbGluZXMgPSB0cmltbWVkU291cmNlLnNwbGl0KFwiXFxuXCIpO1xuICAgIGNvbnN0IG9wdGlvbnM6IERvZW5ldE9wdGlvbnMgPSB7fTtcbiAgICBsZXQgc3RhcnRJbmRleCA9IDA7XG5cbiAgICAvLyBTdHJpcHMgZmlyc3QtbGluZSBvcHRpb25zIGFuZCByZXR1cm5zIHRoZW0sXG4gICAgLy8gYWxvbmcgd2l0aCB0aGUgcmVtYWluaW5nIERvZW5ldE1MIGNvbnRlbnQuXG4gICAgaWYgKGxpbmVzWzBdPy50cmltKCkuc3RhcnRzV2l0aChcIiNcIikpIHtcbiAgICAgIGNvbnN0IGRpcmVjdGl2ZSA9IGxpbmVzWzBdIS50cmltKCkuc3Vic3RyaW5nKDEpLnRyaW0oKTtcblxuICAgICAgZGlyZWN0aXZlLnNwbGl0KC9cXHMrLykuZm9yRWFjaCgocGFpcikgPT4ge1xuICAgICAgICBjb25zdCBba2V5LCB2YWx1ZV0gPSBwYWlyLnNwbGl0KFwiPVwiKTtcbiAgICAgICAgaWYgKGtleSAmJiB2YWx1ZSkge1xuICAgICAgICAgIG9wdGlvbnNba2V5LnRyaW0oKV0gPSB2YWx1ZS50cmltKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBzdGFydEluZGV4ID0gMTtcbiAgICB9XG4gICAgbGV0IGRvZW5ldE1MID0gbGluZXMuc2xpY2Uoc3RhcnRJbmRleCkuam9pbihcIlxcblwiKS50cmltKCk7XG5cbiAgICAvLyBQcm9jZXNzIGNvbnRlbnQsIGlmIHVybCwgZmV0Y2ggY29udGVudCwgaWYgaW5saW5lLCB1c2UgYXMtaXMuXG4gICAgY29uc3QgaXNVUkwgPSAvXmh0dHBzPzpcXC9cXC9cXFMrJC8udGVzdChkb2VuZXRNTCk7XG4gICAgaWYgKGlzVVJMKSB7XG4gICAgICB0cnkge1xuICAgICAgICAvLyBUaW1lb3V0IGFmdGVyIDggc2Vjb25kcyB0byBwcmV2ZW50IGhhbmdpbmcgb24gYmFkIFVSTHMuXG4gICAgICAgIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG4gICAgICAgIGNvbnN0IHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoKCkgPT4gY29udHJvbGxlci5hYm9ydCgpLCA4MDAwKTsgLy8gOHMgdGltZW91dFxuICAgICAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaChkb2VuZXRNTCArIFwiP3Q9XCIgKyBEYXRlLm5vdygpLCB7XG4gICAgICAgICAgc2lnbmFsOiBjb250cm9sbGVyLnNpZ25hbFxuICAgICAgICB9KTtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIEhUVFAgZXJyb3JzXG4gICAgICAgIGlmICghcmVzLm9rKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGZXRjaCBmYWlsZWQgd2l0aCBzdGF0dXMgJHtyZXMuc3RhdHVzfSAke3Jlcy5zdGF0dXNUZXh0fWApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZmV0Y2hlZFRleHQgPSBhd2FpdCByZXMudGV4dCgpO1xuXG4gICAgICAgIC8vIFZhbGlkYXRlIHJlc3BvbnNlIGlzIG5vbi1lbXB0eS5cbiAgICAgICAgaWYgKCFmZXRjaGVkVGV4dCB8fCAhZmV0Y2hlZFRleHQudHJpbSgpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmV0Y2hlZCBjb250ZW50IGlzIGVtcHR5XCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmV0dXJuIERvZW5ldE1MIHdpdGggc291cmNlIGluZm8gZm9yIGRlYnVnZ2luZy5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBkb2VuZXRNTDogZmV0Y2hlZFRleHQudHJpbSgpLFxuICAgICAgICAgIG9wdGlvbnM6IHsgLi4ub3B0aW9ucywgc291cmNlOiBcInVybFwiIH1cbiAgICAgICAgfTtcblxuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBmZXRjaGluZyBEb2VuZXRNTCBmcm9tIFVSTDpcIiwgZXJyKTtcblxuICAgICAgICBjb25zdCBlcnJvciA9IGVyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyIDogbmV3IEVycm9yKFwiVW5rbm93biBlcnJvclwiKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGRvZW5ldE1MOiBcIlwiLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgICBzb3VyY2U6IFwidXJsXCIsXG4gICAgICAgICAgICBlcnJvcjogdHJ1ZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yLm5hbWUgPT09IFwiQWJvcnRFcnJvclwiXG4gICAgICAgICAgICAgID8gXCJSZXF1ZXN0IHRpbWVkIG91dCB3aGlsZSBmZXRjaGluZyBVUkxcIlxuICAgICAgICAgICAgICA6IGVycm9yLm1lc3NhZ2UgfHwgXCJVbmtub3duIGZldGNoIGVycm9yXCJcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuICAgIC8vIFJldHVybiBpbmxpbmUgRG9lbmV0TUwgd2l0aCBhbnkgcHJvY2Vzc2VkIG9wdGlvbnMuXG4gICAgcmV0dXJuIHsgZG9lbmV0TUwsIG9wdGlvbnMgfTtcbiAgfVxuXG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgYXN5bmMgcmVuZGVyRG9lbmV0SWZyYW1lKHNvdXJjZSA6IHN0cmluZywgZWw6IEhUTUxFbGVtZW50KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgeyBkb2VuZXRNTCwgb3B0aW9ucyB9ID0gYXdhaXQgdGhpcy5wYXJzZUZpcnN0TGluZU9wdGlvbnMoc291cmNlKTtcbiAgICBjb25zdCBzaG93S2V5Ym9hcmQgPSBvcHRpb25zLnNob3drZXlib2FyZCA9PT0gXCJmYWxzZVwiO1xuICAgIGNvbnN0IHJhd0NTUyA9IGF3YWl0IGZldGNoKFxuICAgICAgXCJodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL0Bkb2VuZXQvc3RhbmRhbG9uZUBsYXRlc3Qvc3R5bGUuY3NzXCJcbiAgICApLnRoZW4ociA9PiByLnRleHQoKSk7XG4gICAgY29uc3QgY3NzID0gcmF3Q1NTICsgXCJcXG4vKiMgc291cmNlVVJMPWRvZW5ldC5jc3MgKi9cIjtcbiAgICBjb25zdCBpZnJhbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaWZyYW1lXCIpO1xuICAgIGNvbnN0IGlkID0gXCJkb2VuZXQtXCIgKyBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zbGljZSgyKTtcblxuICAgIC8vIFNldCBpZnJhbWUgYXR0cmlidXRlcyBhbmQgc3R5bGVzIGZvciBvcHRpbWFsIERvZW5ldCByZW5kZXJpbmdcbiAgICBpZnJhbWUuZGF0YXNldC5kb2VuZXRJZCA9IGlkO1xuICAgIGlmcmFtZS5zdHlsZS53aWR0aCA9IG9wdGlvbnMud2lkdGggfHwgXCIxMDAlXCI7IC8vIEZ1bGwgd2lkdGggYnkgZGVmYXVsdFxuICAgIGlmcmFtZS5zdHlsZS5ib3JkZXIgPSBcIm5vbmVcIjsgLy8gUmVtb3ZlIGRlZmF1bHQgYm9yZGVyXG4gICAgaWZyYW1lLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7IC8vIFJlbW92ZSBkZWZhdWx0IGlubGluZSBzcGFjaW5nXG4gICAgaWZyYW1lLnN0eWxlLm92ZXJmbG93ID0gXCJ2aXNpYmxlXCI7IC8vIEFsbG93IGlmcmFtZSB0byBleHBhbmQgd2l0aCBjb250ZW50XG4gICAgaWZyYW1lLnN0eWxlLmhlaWdodCA9IG9wdGlvbnMuaGVpZ2h0IHx8IFwiMzAwcHhcIjsgLy8gUHJldmVudCBjb2xsYXBzZVxuICAgIGVsLmFwcGVuZENoaWxkKGlmcmFtZSk7IC8vIEFkZCBpZnJhbWUgdG8gRE9NIGJlZm9yZSBzZXR0aW5nIHNyY2RvYyBmb3IgYmV0dGVyIHBlcmZvcm1hbmNlXG5cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLUluamVjdCBGVUxMIGlmcmFtZSBjb250ZW50XG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyBTd2l0Y2ggdG8gY2FsbGluZyBmdW5jdGlvbiB0byBidWlsZCBmdWxsIHNyY2RvYyBjb250ZW50LCBpbmNsdWRpbmcgQ1NTIGFuZCBEb2VuZXRNTC5cbiAgICBpZnJhbWUuc3JjZG9jID0gYnVpbGRJZnJhbWVTcmNkb2MoeyBjc3MsIGRvZW5ldE1MLCBpZCwgc2hvd0tleWJvYXJkIH0pO1xuXG4gICAgLy8gU2FmZSBIZWlnaHQgRmFsbGJhY2s/IElzIHRoaXMgc3RpbGwgbmVjZXNzYXJ5P1xuICAgIGlmcmFtZS5vbmxvYWQgPSAoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBkb2MgPSBpZnJhbWUuY29udGVudERvY3VtZW50O1xuICAgICAgICBpZiAoZG9jPy5ib2R5KSB7XG4gICAgICAgICAgY29uc3QgcmVzaXplID0gKCkgPT4ge1xuICAgICAgICAgICAgaWZyYW1lLnN0eWxlLmhlaWdodCA9IGRvYy5ib2R5LnNjcm9sbEhlaWdodCArIFwicHhcIjtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgcmVzaXplKCk7IC8vIGluaXRpYWxcbiAgICAgICAgICBuZXcgUmVzaXplT2JzZXJ2ZXIocmVzaXplKS5vYnNlcnZlKGRvYy5ib2R5KTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge31cbiAgICB9O1xuXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyBQYXJlbnQgcmVzaXplIGxpc3RlbmVyIChVTkNIQU5HRUQpXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBjb25zdCBsaXN0ZW5lciA9IChldmVudDogTWVzc2FnZUV2ZW50KSA9PiB7XG4gICAgLy8gIGNvbnNvbGUubG9nKFwiTUVTU0FHRSBSRUNFSVZFRDpcIiwge1xuICAgIC8vICAgIGRhdGE6IGV2ZW50LmRhdGEsXG4gICAgLy8gICAgb3JpZ2luOiBldmVudC5vcmlnaW4sXG4gICAgLy8gICAgc291cmNlTWF0Y2hlczogZXZlbnQuc291cmNlID09PSBpZnJhbWUuY29udGVudFdpbmRvd1xuICAgIC8vICB9KTtcblxuICAgICAgaWYgKFxuICAgICAgICBldmVudC5zb3VyY2UgPT09IGlmcmFtZS5jb250ZW50V2luZG93ICYmXG4gICAgICAgIGV2ZW50LmRhdGE/LnR5cGUgPT09IFwiZG9lbmV0LXJlc2l6ZVwiICYmXG4gICAgICAgIGV2ZW50LmRhdGEuaWQgPT09IGlkXG4gICAgICApIHtcbiAgICAgICAgaWZyYW1lLnN0eWxlLmhlaWdodCA9IGV2ZW50LmRhdGEuaGVpZ2h0ICsgXCJweFwiO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgbGlzdGVuZXIpO1xuXG4gICAgLy8gQ2xlYW51cFxuICAgIHRoaXMucmVnaXN0ZXIoKCkgPT4ge1xuICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGxpc3RlbmVyKTtcbiAgICB9KTtcbiAgfVxufTsiLCAiZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkSWZyYW1lU3JjZG9jKHBhcmFtczoge1xuICAgIGNzczogc3RyaW5nO1xuICAgIGRvZW5ldE1MOiBzdHJpbmc7XG4gICAgaWQ6IHN0cmluZztcbiAgICBzaG93S2V5Ym9hcmQ6IGJvb2xlYW47XG59KTogc3RyaW5nIHtcbiAgY29uc3QgeyBjc3MsIGRvZW5ldE1MLCBpZCwgc2hvd0tleWJvYXJkIH0gPSBwYXJhbXM7XG4gIHJldHVybiBgXG4gIDwhRE9DVFlQRSBodG1sPlxuPGh0bWw+PGhlYWQ+PG1ldGEgY2hhcnNldD1cIlVURi04XCI+XG5cbjxzdHlsZT5cbiR7Y3NzfVxuPC9zdHlsZT5cblxuPHN0eWxlPlxuICBib2R5IHtcbiAgICBtYXJnaW46IDA7XG4gICAgcGFkZGluZzogMTBweDtcbiAgICBvdmVyZmxvdzogdmlzaWJsZTtcbiAgICBoZWlnaHQ6IGF1dG87XG4gIH1cblxuLyogPT09PT09PT09PT09PSBET0VORVQgRVhDRVNTSVZFIFNQQUNJTkcgRklYID09PT09PT09PT09PT0gKi9cbi8qIElmIG1hdGggcmVuZGVycyBzdHJhbmdlbHksIGl0J3MgcHJvYmFibHkgc29tZXRoaW5nIGhlcmUuICovXG4vKiBLaWxsIHZlcnRpY2FsIHN0YWNraW5nIG1hcmdpbnMgKi9cbi5kb2VuZXQtdmlld2VyID4gZGl2IHtcbiAgbWFyZ2luLXRvcDogMCAhaW1wb3J0YW50O1xuICBtYXJnaW4tYm90dG9tOiAwICFpbXBvcnRhbnQ7XG59XG4vKiBLaWxsIGdyYXBoIGNvbnRhaW5lciBtYXJnaW5zLCBodWdlIGltcHJvdmVtZW50IG9uIE9ic2lkaWFuIGVtYmVkZGluZyAqL1xuLmp4Z2JveCB7XG4gIG1hcmdpbi10b3A6IDAgIWltcG9ydGFudDtcbiAgbWFyZ2luLWJvdHRvbTogMCAhaW1wb3J0YW50O1xufVxuLyogUmVtb3ZlIGhvcml6b250YWwgcGFkZGluZyArIHdpZHRoIGNhcCAqL1xuLmRvZW5ldC12aWV3ZXIge1xuICBwYWRkaW5nLWxlZnQ6IDAgIWltcG9ydGFudDtcbiAgcGFkZGluZy1yaWdodDogMCAhaW1wb3J0YW50O1xuICBQYWRkaW5nOiAwICFpbXBvcnRhbnQ7XG4gIG1heC13aWR0aDogMTAwJSAhaW1wb3J0YW50O1xufVxuLyogUHJldmVudCBuZXN0ZWQgd3JhcHBlciBidWlsZHVwICovXG4jZG9lbmV0LXZpZXdlciBkaXZbc3R5bGUqPVwibWFyZ2luOiAxMnB4XCJdIHtcbiAgbWFyZ2luOiAwICFpbXBvcnRhbnQ7XG59XG4vKiA9PT09PT09PT09PT09IERPRU5FVCBHUkFQSCBBWEVTID09PT09PT09PT09PT0gKi9cbi8qIFRvbyBib2xkIC0tIGRlZW1waGFzaXplIHRoZW0gYSBiaXQuICovXG4uanhnYm94IGxpbmUge1xuICBzdHJva2U6ICM2NjY2NjYgIWltcG9ydGFudDtcbn1cbi8qIExpZ2h0IGdyYXkgZ3JpZCAqL1xuLmp4Z2JveCBwYXRoW3N0cm9rZS1vcGFjaXR5PVwiMC41XCJdIHtcbiAgc3Ryb2tlOiAjYmJiYmJiICFpbXBvcnRhbnQ7XG4gIHN0cm9rZS1vcGFjaXR5OiAwLjU1ICFpbXBvcnRhbnQ7XG59XG48L3N0eWxlPjwvaGVhZD5cblxuPGJvZHk+XG5cbjxkaXYgaWQ9XCJhcHBcIj48L2Rpdj5cblxuPHNjcmlwdCB0eXBlPVwibW9kdWxlXCI+XG5pbXBvcnQgKiBhcyBEb2VuZXQgZnJvbSBcImh0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9ucG0vQGRvZW5ldC9zdGFuZGFsb25lQGxhdGVzdC9kb2VuZXQtc3RhbmRhbG9uZS5qc1wiO1xuXG5jb25zdCBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImFwcFwiKTtcblxuLy8gSW5qZWN0IERvZW5ldE1MXG5jb25zdCBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2NyaXB0XCIpO1xuc2NyaXB0LnR5cGUgPSBcInRleHQvZG9lbmV0bWxcIjtcbnNjcmlwdC50ZXh0Q29udGVudCA9ICR7SlNPTi5zdHJpbmdpZnkoZG9lbmV0TUwpfTtcbmNvbnRhaW5lci5hcHBlbmRDaGlsZChzY3JpcHQpO1xuXG4vLyBcbi8vIGNvbnN0IHNob3dLZXlib2FyZCA9IFwiJHtzaG93S2V5Ym9hcmR9XCI7IC8vIE9ic29sZXRlLCBub3cgcGFzc2VkIHZpYSBvcHRpb25zIG9iamVjdFxuXG5Eb2VuZXQucmVuZGVyRG9lbmV0Vmlld2VyVG9Db250YWluZXIoXG4gIGNvbnRhaW5lcixcbiAgbnVsbCxcbiAgeyBhZGRWaXJ0dWFsS2V5Ym9hcmQ6ICR7c2hvd0tleWJvYXJkfSB9XG4pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gUkVTSVpJTkcgT0YgSUZSQU1FIFRPIEZJVCBDT05URU5UIEhFSUdIVFxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmZ1bmN0aW9uIHNlbmRTaXplKCkge1xuICBjb25zdCBoZWlnaHQgPSBkb2N1bWVudC5ib2R5LnNjcm9sbEhlaWdodDtcblxuICBwYXJlbnQucG9zdE1lc3NhZ2Uoe1xuICAgIHR5cGU6IFwiZG9lbmV0LXJlc2l6ZVwiLFxuICAgIGlkOiBcIiR7aWR9XCIsXG4gICAgaGVpZ2h0XG4gIH0sIFwiKlwiKTtcbn1cblxuLy8gUnVuIGFmdGVyIERvZW5ldCBzdGFydHMgcmVuZGVyaW5nXG5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoc2VuZFNpemUpO1xufSk7XG5cbi8vIE9ic2VydmUgQUZURVIgY29udGVudCBleGlzdHNcbmNvbnN0IG9ic2VydmVyID0gbmV3IFJlc2l6ZU9ic2VydmVyKCgpID0+IHtcbiAgc2VuZFNpemUoKTtcbn0pO1xub2JzZXJ2ZXIub2JzZXJ2ZShkb2N1bWVudC5ib2R5KTtcblxuLy8gRmluYWwgc2FmZXR5IHBhc3NcbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCBzZW5kU2l6ZSk7XG5cbjwvc2NyaXB0PlxuPC9ib2R5PlxuPC9odG1s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

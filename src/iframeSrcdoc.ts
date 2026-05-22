export function buildIframeSrcdoc(params: {
    css: string;
    doenetML: string;
    id: string;
    showKeyboard: boolean;
    scriptSource: { primary: string; fallback?: string };
    mathJaxSource: { primary: string; fallback?: string };
    mode: DoenetMode;
}): string {
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

</script>


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

</script>
</body>
</html>
`;
}
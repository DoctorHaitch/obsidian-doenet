import { Plugin } from "obsidian";
import { buildIframeSrcdoc } from "./iframeSrcdoc";

// So many render layers, but it works as well as
// one might possibly hope.
// Obsidian → iframe → Doenet → JSXGraph → SVG

// --------------------------------------------------
interface DoenetOptions {
  width?: string;
  height?: string;
  showkeyboard?: string;
  source?: "url" | "inline";
  error?: boolean;
  message?: string;
  [key: string]: string | boolean | undefined;
}

// --------------------------------------------------
export default class DoenetPlugin extends Plugin {

  async onload() {
    console.log("Doenet plugin (iframe mode) loaded");

    this.registerMarkdownCodeBlockProcessor(
      "doenet",
      async (source : string, el: HTMLElement) => {
        await this.renderDoenetIframe(source, el);
      }
    );
  }

  // --------------------------------------------------
  async parseFirstLineOptions(source : string): Promise<{
    doenetML: string; 
    options: DoenetOptions
  }> {
    const trimmedSource = source.trim();
    const lines = trimmedSource.split("\n");
    const options: DoenetOptions = {};
    let startIndex = 0;

    // Strips first-line options and returns them,
    // along with the remaining DoenetML content.
    if (lines[0]?.trim().startsWith("#")) {
      const directive = lines[0]!.trim().substring(1).trim();

      directive.split(/\s+/).forEach((pair) => {
        const [key, value] = pair.split("=");
        if (key && value) {
          options[key.trim()] = value.trim();
        }
      });

      startIndex = 1;
    }
    let doenetML = lines.slice(startIndex).join("\n").trim();

    // Process content, if url, fetch content, if inline, use as-is.
    const isURL = /^https?:\/\/\S+$/.test(doenetML);
    if (isURL) {
      try {
        // Timeout after 8 seconds to prevent hanging on bad URLs.
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
        const res = await fetch(doenetML + "?t=" + Date.now(), {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        // Check for HTTP errors
        if (!res.ok) {
          throw new Error(`Fetch failed with status ${res.status} ${res.statusText}`);
        }

        const fetchedText = await res.text();

        // Validate response is non-empty.
        if (!fetchedText || !fetchedText.trim()) {
          throw new Error("Fetched content is empty");
        }

        // Return DoenetML with source info for debugging.
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
            message: error.name === "AbortError"
              ? "Request timed out while fetching URL"
              : error.message || "Unknown fetch error"
          }
        };
      }
    }
    // Return inline DoenetML with any processed options.
    return { doenetML, options };
  }


  // --------------------------------------------------
  async renderDoenetIframe(source : string, el: HTMLElement): Promise<void> {
    const { doenetML, options } = await this.parseFirstLineOptions(source);
    const showKeyboard = options.showkeyboard === "false";
    const rawCSS = await fetch(
      "https://cdn.jsdelivr.net/npm/@doenet/standalone@latest/style.css"
    ).then(r => r.text());
    const css = rawCSS + "\n/*# sourceURL=doenet.css */";
    const iframe = document.createElement("iframe");
    const id = "doenet-" + Math.random().toString(36).slice(2);

    // Set iframe attributes and styles for optimal Doenet rendering
    iframe.dataset.doenetId = id;
    iframe.style.width = options.width || "100%"; // Full width by default
    iframe.style.border = "none"; // Remove default border
    iframe.style.display = "block"; // Remove default inline spacing
    iframe.style.overflow = "visible"; // Allow iframe to expand with content
    iframe.style.height = options.height || "300px"; // Prevent collapse
    el.appendChild(iframe); // Add iframe to DOM before setting srcdoc for better performance

    // --------------------------------------------------
    // ------------------------Inject FULL iframe content
    // --------------------------------------------------
    // Switch to calling function to build full srcdoc content, including CSS and DoenetML.
    iframe.srcdoc = buildIframeSrcdoc({ css, doenetML, id, showKeyboard });

    // Safe Height Fallback? Is this still necessary?
    iframe.onload = () => {
      try {
        const doc = iframe.contentDocument;
        if (doc?.body) {
          const resize = () => {
            iframe.style.height = doc.body.scrollHeight + "px";
          };

          resize(); // initial
          new ResizeObserver(resize).observe(doc.body);
        }
      } catch (e) {}
    };

    // --------------------------------------------------
    // Parent resize listener (UNCHANGED)
    // --------------------------------------------------
    const listener = (event: MessageEvent) => {
    //  console.log("MESSAGE RECEIVED:", {
    //    data: event.data,
    //    origin: event.origin,
    //    sourceMatches: event.source === iframe.contentWindow
    //  });

      if (
        event.source === iframe.contentWindow &&
        event.data?.type === "doenet-resize" &&
        event.data.id === id
      ) {
        iframe.style.height = event.data.height + "px";
      }
    };

    window.addEventListener("message", listener);

    // Cleanup
    this.register(() => {
      window.removeEventListener("message", listener);
    });
  }
};
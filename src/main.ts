import { Plugin, PluginSettingTab, App, Setting, Notice } from "obsidian"; //NEW
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

// --------------------------------------------------  NEW
interface DoenetPluginSettings {
  enableCache: boolean;
  cacheTTL: number;
}

const DEFAULT_SETTINGS: DoenetPluginSettings = {
  enableCache: false,
  cacheTTL: 1440, // 24 hours
};

// -------------------------------------------------- NEW
class CacheManager {
  plugin: DoenetPlugin;

  constructor(plugin: DoenetPlugin) {
    this.plugin = plugin;
  }
  
  private async getCachePath(url: string): Promise<string> {
    const hash = await this.hashString(url);
    return `${this.plugin.manifest.dir}/cache/${hash}.json`;
  }

  private async ensureCacheFolder(): Promise<void> {
    const dir = `${this.plugin.manifest.dir}/cache`;

    if (!(await this.plugin.app.vault.adapter.exists(dir))) {
      await this.plugin.app.vault.adapter.mkdir(dir);
    }
  }
  
  // ----------- Updated with debug output.
  async get(url: string): Promise<string | null> {
    if (!this.plugin.settings.enableCache) {
      console.log("[Doenet] Cache disabled");
      return null;
    }

    const path = await this.getCachePath(url); // UPDATED to async

    if (!(await this.plugin.app.vault.adapter.exists(path))) {
      console.log("[Doenet] Cache miss (no file):", url);
      return null;
    }

    try {
      const raw = await this.plugin.app.vault.adapter.read(path);
      const data = JSON.parse(raw);

      const ageMinutes =
        (Date.now() - data.timestamp) / (1000 * 60);

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

  async set(url: string, content: string): Promise<void> {
    if (!this.plugin.settings.enableCache) return;

    const path = await this.getCachePath(url); // UPDATED to async

    await this.ensureCacheFolder();

    const data = {
      url, 
      timestamp: Date.now(),
      content,
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
  private async hashString(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);

    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }
}

// --------------------------------------------------
export default class DoenetPlugin extends Plugin {
  settings: DoenetPluginSettings; // NEW
  
  async onload() {
    console.log("Doenet plugin (iframe mode) loaded");

    await this.loadSettings();  // NEW
    this.addSettingTab(new DoenetSettingTab(this.app, this)); // NEW


    this.registerMarkdownCodeBlockProcessor(
      "doenet",
      async (source : string, el: HTMLElement) => {
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
      // ------------------------------ NEW
      const cache = new CacheManager(this);

      // Try cache first
      const cached = await cache.get(doenetML);
      if (cached) {
        return {
          doenetML: cached,
          options: { ...options, source: "url" }
        };
      }
      // ------------------------------
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
        await cache.set(doenetML, fetchedText);

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


// --------------------------------------------------  NEW
class DoenetSettingTab extends PluginSettingTab {
  plugin: DoenetPlugin;

  constructor(app: App, plugin: DoenetPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Doenet Settings" });

    // ----------------------
    // Enable Cache Toggle
    // ----------------------
    new Setting(containerEl)
      .setName("Enable local caching")
      .setDesc("Cache remotely fetched files locally for faster loading.")
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.enableCache)
          .onChange(async (value) => {
            this.plugin.settings.enableCache = value;
            await this.plugin.saveSettings();

            this.display(); // refresh UI
          })
      );

    // ----------------------
    // Cache TTL Input
    // ----------------------
    new Setting(containerEl)
      .setName("Cache duration (minutes)")
      .setDesc("How long cached files should be reused before refetching.")
      .addText(text => {
        text
          .setPlaceholder("1440")
          .setValue(String(this.plugin.settings.cacheTTL))
          .setDisabled(!this.plugin.settings.enableCache)
          .onChange(async (value) => {
            const num = parseInt(value);
            this.plugin.settings.cacheTTL = isNaN(num) ? 1440 : num;
            await this.plugin.saveSettings();
          });
      });
    // ----------------------
    // Clear Cache Button
    // ----------------------
    new Setting(containerEl)
      .setName("Clear cache")
      .setDesc("Delete all locally cached Doenet files.")
      .addButton(button =>
        button
          .setButtonText("Clear")
          .setWarning()
          .onClick(async () => {
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
            new Notice("Doenet cache cleared");
          })
      );  
  }
}
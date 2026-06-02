# Obsidian Doenet Plugin

_Quick and dirty version written during the workshop. I'll expand this when time permits._

A minimal Obsidian plugin for integrating Doenet content into your vault.

## Installation (Manual)

1. Go to your vault’s plugins folder:

    ```text
    <your-vault>/.obsidian/plugins/
    ```

2. Create a new folder:

    ```text
    obsidian-doenet
    ```

3. Download or copy the following files into that folder:

    ```text
    main.js
    manifest.json
    styles.css
    ```

4. Restart Obsidian (or reload plugins).

5. Enable the plugin:
   - Open **Settings → Community Plugins**
   - Turn off **Safe Mode** (blocks all plugins, must explicitly be enabled for any plugin)
   - Find **Obsidian Doenet** and enable it

## Required Files

At minimum, the plugin folder must contain:

- `manifest.json` — plugin metadata  
- `main.js` — compiled plugin code  

Optional:
- `styles.css` — custom styling

## Development Notes

If building from source:

1. Clone the repo  
2. Install dependencies  
3. Build to generate `main.js`  (`npm run build`)
4. Copy build output into the plugin folder above

---

That’s it — once enabled, the plugin should be functional.


-- ================================
-- Global counter
-- ================================
doenet_counter = 0

-- ================================
-- Helpers
-- ================================
local function is_url(text)
  if not text then return false end
  return text:match("^https?://") ~= nil
end

local function fetch_url(url)
  local ok, result = pcall(function()
    return pandoc.pipe("curl", {"-L", url}, "")
  end)
  if not ok then return nil, "curl failed" end
  return result
end

local function strip_leading_metadata(text)
  text = text:gsub("\r\n", "\n")

  while true do
    local trimmed = text:match("^%s*(.*)")
    if trimmed:match("^<!%-%-") then
      local after = text:gsub("^%s*<!%-%-.-%-%->%s*", "", 1)
      if after == text then break end
      text = after
    else
      break
    end
  end

  local cleaned = {}
  local skipping = true

  for line in text:gmatch("[^\n]*\n?") do
    local trimmed = line:match("^%s*(.-)%s*$")
    if skipping then
      if trimmed == "" or trimmed:match("^#") then
        -- skip
      else
        skipping = false
        table.insert(cleaned, line)
      end
    else
      table.insert(cleaned, line)
    end
  end

  return table.concat(cleaned, "")
end

-- ================================
-- Base64 encoder
-- ================================
local b='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function base64_encode(data)
  return ((data:gsub('.', function(x)
      local r,bits='',x:byte()
      for i=8,1,-1 do
        r = r .. (bits % 2^i - bits % 2^(i-1) > 0 and '1' or '0')
      end
      return r
    end)..'0000'):gsub('%d%d%d?%d?%d?%d?', function(x)
      if (#x < 6) then return '' end
      local c=0
      for i=1,6 do
        c = c + (x:sub(i,i) == '1' and 2^(6-i) or 0)
      end
      return b:sub(c+1,c+1)
    end)..({ '', '==', '=' })[#data % 3 + 1])
end

-- ================================
-- Main filter
-- ================================
function CodeBlock(el)
  if not el.classes:includes("doenet") then
    return nil
  end

  local raw = el.text:gsub("^%s+", ""):gsub("%s+$","")
  local content = ""

  if is_url(raw) then
    local fetched, err = fetch_url(raw)
    if not fetched then
      return pandoc.RawBlock("html",
        "<p>Failed to fetch DoenetML (" .. err .. ")</p>")
    end
    content = strip_leading_metadata(fetched)
  else
    content = strip_leading_metadata(raw)
  end

  -- ✅ encode DoenetML safely (critical fix)
  local b64_content = base64_encode(content)

  doenet_counter = doenet_counter + 1
  local frame_id = "doenet-frame-" .. doenet_counter

  local html = [[
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link rel="stylesheet"
href="https://cdn.jsdelivr.net/npm/@doenet/standalone@latest/style.css">
<style>
body { margin:0; padding:0; }
html, body {
  height:auto !important;
  min-height:0 !important;
  overflow:visible !important;
}
</style>
</head>

<body>

<div id="app"></div>

<script type="module">
import { renderDoenetViewerToContainer }
from "https://cdn.jsdelivr.net/npm/@doenet/standalone@latest/doenet-standalone.js";

const container = document.getElementById("app");

// ✅ decode base64 safely (no JS/Lua breakage)
const decoded = atob("]] .. b64_content .. [[");

const s = document.createElement("script");
s.type = "text/doenetml";
s.textContent = decoded;

container.appendChild(s);

// ✅ single render
renderDoenetViewerToContainer(
  container,
  null,
  { addVirtualKeyboard: false }
);
</script>

<script>
const root = document.getElementById("app");
let lastSent = 0;

function sendHeight(h) {
  parent.postMessage({
    doenetHeight: Math.ceil(h),
    frameId: "]] .. frame_id .. [["
  }, "*");
}

const ro = new ResizeObserver(entries => {
  const h = entries[0].contentRect.height;
  if (Math.abs(h - lastSent) > 6) {
    lastSent = h;
    sendHeight(h);
  }
});

ro.observe(root);

window.addEventListener("load", () => {
  setTimeout(() => sendHeight(root.scrollHeight), 100);
  setTimeout(() => sendHeight(root.scrollHeight), 500);
});
</script>

</body>
</html>
]]

  local encoded = base64_encode(html)

  -- ================================
  -- Create iframe
  -- ================================
local iframe = '<iframe id="' .. frame_id .. '" class="doenet-frame" style="width:100%; border:none; min-height:50px; display:block;" sandbox="allow-scripts allow-same-origin" src="data:text/html;base64,' .. encoded .. '"></iframe>'

  return pandoc.RawBlock("html", iframe)

end

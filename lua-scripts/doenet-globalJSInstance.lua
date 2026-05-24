
local function is_url(text)
  return text:match("^https?://")
end

-- ================================
-- Strip metadata at top of file
-- ================================

local function strip_leading_metadata(text)
  -- Normalize line endings
  text = text:gsub("\r\n", "\n")

  -- ================================
  -- Step 1: Remove leading HTML comments (multi-line aware)
  -- ================================
  while true do
    local trimmed = text:match("^%s*(.*)")

    -- If it starts with <!--
    if trimmed:match("^<!%-%-") then
      -- Remove everything up to the closing -->
      local after = text:gsub("^%s*<!%-%-.-%-%->%s*", "", 1)

      -- If nothing changed, break (safety)
      if after == text then break end

      text = after
    else
      break
    end
  end

  -- ================================
  -- Step 2: Remove leading # options and blank lines
  -- ================================
  local lines = {}
  for line in text:gmatch("[^\n]*\n?") do
    if line ~= "" then
      table.insert(lines, line)
    end
  end

  local cleaned = {}
  local skipping = true

  for _, line in ipairs(lines) do
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
-- Auto-name unnamed <graph> tags
-- ================================
local doenet_counter = 0

local function uniquify_graph_names(text, prefix)
  local graph_index = 0

  text = text:gsub("<graph([^>]*)>", function(attrs)
    -- If already has a name attribute → preserve it
    if attrs:match("name%s*=") then
      return "<graph" .. attrs .. ">"
    end

    -- Otherwise assign a unique name
    graph_index = graph_index + 1
    return '<graph name="' .. prefix .. '_graph' .. graph_index .. '"' .. attrs .. ">"
  end)

  return text
end

-- ================================
-- Fetch using curl
-- ================================
local function fetch_url(url)
  local ok, result = pcall(function()
    return pandoc.pipe("curl", {"-L", url}, "")
  end)

  if not ok then
    return nil, "curl failed"
  end

  return result
end

-- ================================
-- Main filter
-- ================================
function CodeBlock(el)
  if not el.classes:includes("doenet") then
    return nil
  end

  local raw = el.text:gsub("^%s+", ""):gsub("%s+$", "")
  local content = ""

  if is_url(raw) then
    local fetched, err = fetch_url(raw)

    if not fetched then
      content = "<p>Failed to fetch DoenetML (" .. err .. ")</p>"
    else
      content = strip_leading_metadata(fetched)
    end
  else
    content = strip_leading_metadata(raw)
  end

  -- ✅ Generate unique prefix per block
  doenet_counter = doenet_counter + 1
  local prefix = "doenet" .. doenet_counter

  -- ✅ Apply graph auto-naming
  content = uniquify_graph_names(content, prefix)

local html = [[
<div class="doenetml-viewer">
  <script type="text/doenetml">
]] .. content .. [[
  </script>
</div>
]]

  return pandoc.RawBlock("html", html)
end
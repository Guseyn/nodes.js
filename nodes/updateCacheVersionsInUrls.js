import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

import defaultSrcMapper from '#nodes/defaultSrcMapper.js'
import pathByUrl from '#nodes/pathByUrl.js'

/**********************************************************************
 * getFileHash()
 * ---------------------------------------------------------------
 * Computes short stable hash based on file contents.
 **********************************************************************/
async function getFileHash(filePath) {
  const buffer = await fs.readFile(filePath)
  const hash = crypto.createHash('sha256').update(buffer).digest('hex')
  return hash.slice(0, 8)
}

/**********************************************************************
 * processUrlsInHtmlOrMd()
 * ---------------------------------------------------------------
 * Processes HTML or Markdown files:
 *  - Skips code blocks and import maps
 *  - Finds URLs in <img>, <script>, <link>, etc.
 *  - Appends or updates ?v=<hash> based on file content checksum
 **********************************************************************/
async function processUrlsInHtmlOrMd(content, baseFolder, srcMapper, importMap) {
  // ─────────────────────────────────────────────────────────────
  // Step 1: Skip code blocks enclosed by triple backticks
  // ─────────────────────────────────────────────────────────────
  global.log('📝 Step 1: Skipping code blocks...')
  const codeBlocks = []
  content = content.replace(/```[\s\S]*?```|`[^`]*`/g, (codeBlock) => {
    codeBlocks.push(codeBlock)
    return `___CODE_BLOCK_${codeBlocks.length - 1}___`
  })

  // ─────────────────────────────────────────────────────────────
  // Step 2: Handle <script type="importmap"> blocks
  // ─────────────────────────────────────────────────────────────
  global.log('📝 Step 2: Processing <script type="importmap"> blocks...')
  const importmapRegex = /^([ \t]*)<script\s+type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/gim
  let importMatch
  while ((importMatch = importmapRegex.exec(content)) !== null) {
    const outerIndent = importMatch[1] || ''
    const fullBlock = importMatch[0]
    const jsonContent = importMatch[2]
    try {
      const parsed = JSON.parse(jsonContent)
      if (parsed.imports && typeof parsed.imports === 'object') {
        const updatedImports = {}
        for (const [key, url] of Object.entries(parsed.imports)) {
          updatedImports[key] = await maybeVersionUrl(url, baseFolder, srcMapper)
        }
        parsed.imports = updatedImports
        const updatedJson = JSON.stringify(parsed, null, 2)
          .split('\n')
          .map(line => outerIndent + '  ' + line)
          .join('\n')
        const newBlock = `${outerIndent}<script type="importmap">\n${updatedJson}\n${outerIndent}</script>`
        content = content.replace(fullBlock, newBlock)
      }
    } catch (err) {
      global.log(`⚠️  Failed to parse importmap JSON: ${err.message}`)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Step 3: Handle <script type="module"> blocks
  // ─────────────────────────────────────────────────────────────
  global.log('📝 Step 3: Processing <script type="module"> blocks...')
  const moduleRegex = /^([ \t]*)<script\s+type=["']module["'][^>]*>([\s\S]*?)<\/script>/gim
  const importModuleRegex = /import(\s+)['"]([\s\S]*.js\?v=(\S+))['"]/i
  let moduleMatch
  while ((moduleMatch = moduleRegex.exec(content)) !== null) {
    const outerIndent = moduleMatch[1] || ''
    const fullBlock = moduleMatch[0]
    const moduleCodeContent = moduleMatch[2]
    try {
      const lines = moduleCodeContent.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const importMatch = importModuleRegex.exec(lines[i])
        if (importMatch === null) {
          continue
        }
        const importUrl = importMatch[2]
        const resolved = resolveImport(importUrl, baseFolder, srcMapper, importMap)
        const hash = await getFileHash(resolved)        
        const newImportUrl = urlWithBustedVersion(importUrl, hash)
        lines[i] = lines[i].replace(importUrl, newImportUrl)
        global.log(`✨ Versioned URL: ${importUrl} → ${newImportUrl}`)
      }
      const newModuleCodeContent = lines.join('\n')
      const newBlock = `${outerIndent}<script type="module">${newModuleCodeContent}</script>`.replaceAll('\n\n', '\n')
      content = content.replace(fullBlock, newBlock)
    } catch (err) {
      global.log(`⚠ Failed to parse script with type "module": ${err.message}`)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Step 4: Process URLs in HTML or Markdown
  // ─────────────────────────────────────────────────────────────
  global.log('🔗 Step 4: Processing URLs in HTML or Markdown...')
  const regex = /<(img|script|e-html|e-json|e-svg|e-markdown|template\s+is="e-json-map"|template\s+is="e-wrapper"|link(?:\s+rel="preload")?)\s+[^>]*(src|href|data-src)="([^"]+)"/g
  let match
  
  while ((match = regex.exec(content)) !== null) {
    const tagName = match[1].toLowerCase()
    const attribute = match[2]
    let url = match[3]

    const toBeProcessed = url &&
      !/template\s+is="e-json-map"/.test(tagName) &&
      tagName !== 'e-json' &&
      tagName !== 'a' &&
      !url.startsWith('http') &&
      !url.startsWith('mailto') &&
      !url.startsWith('tel') &&
      !url.startsWith('data:') &&
      !/\$\{[^}]+\}/.test(url) &&
      !/\{\{[^}]+\}\}/.test(url)

    if (toBeProcessed) {
      const filePath = pathByUrl(url, srcMapper, baseFolder)
      try {
        const fileHash = await getFileHash(filePath)
        const versionedUrl = urlWithBustedVersion(url, fileHash)

        global.log(`✨ Versioned URL: ${url} → ${versionedUrl}`)

        const escapedUrl = url.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
        const globalRegex = new RegExp(escapedUrl, 'g')
        content = content.replace(globalRegex, versionedUrl)
      } catch (err) {
        global.log(`File not found for ${url}:`, err.message)
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Step 5: Restore skipped code blocks
  // ─────────────────────────────────────────────────────────────
  global.log('🔄 Step 5: Restoring skipped code blocks...')
  codeBlocks.forEach((codeBlock, index) => {
    content = content.replace(`___CODE_BLOCK_${index}___`, codeBlock)
  })

  return content
}

function urlWithBustedVersion(url, newVersion) {
  return url.includes('?v=')
      ? url.replace(/(\?v=)[^&#]*/, `$1${newVersion}`)
      : `${url}${url.includes('?') ? '&' : '?'}v=${newVersion}`
}

/**********************************************************************
 * processDirectoryWithHTMLAndMDFiles()
 * ---------------------------------------------------------------
 * Recursively processes directories:
 *  - Finds HTML/MD
 *  - Applies versioning updates
 *  - Recurses into subdirectories
 **********************************************************************/
async function processDirectoryWithHTMLAndMDFiles(baseFolder, folderPath, srcMapper, importMap) {
  global.log(`📂 Processing directory: ${folderPath}`)
  const files = await fs.readdir(folderPath)
  const htmlFiles = files.filter(file => file.endsWith('.html') || file.endsWith('.md'))

  // HTML / Markdown
  for (const file of htmlFiles) {
    const filePath = path.join(folderPath, file)
    let content = await fs.readFile(filePath, 'utf-8')
    global.log(`-> Updating: ${file}`)
    content = await processUrlsInHtmlOrMd(content, baseFolder, srcMapper, importMap)
    await fs.writeFile(filePath, content, 'utf-8')
    global.log(`✅ Updated: ${file}`)
  }

  // Recurse into subdirectories
  for (const file of files) {
    const filePath = path.join(folderPath, file)
    const stats = await fs.stat(filePath)
    if (stats.isDirectory()) {
      global.log(`📁 Entering subdirectory: ${filePath}`)
      await processDirectoryWithHTMLAndMDFiles(baseFolder, filePath, srcMapper, importMap)
    }
  }
}


/**********************************************************************
 * 🚀 processJSEntryFile()
 * ---------------------------------------------------------------
 * Builds dependency tree and updates all files bottom-up.
 **********************************************************************/
export async function processJSEntryFile(entryPath, baseFolder, srcMapper, importMap = {}) {
  global.log(`🧩 Building dependency tree for ${entryPath}`)
  const tree = await buildDependencyTree(entryPath, baseFolder, srcMapper, importMap)
  global.log('🌳 Dependency tree built, computing hashes...')
  await computeHashesBottomUp(tree)
  global.log('✅ All imports versioned successfully.')
}

/**********************************************************************
 * maybeVersionUrl()
 * ---------------------------------------------------------------
 * Returns versioned URL with ?v=<hash> if applicable.
 * Skips external, dynamic, or invalid URLs.
 **********************************************************************/
async function maybeVersionUrl(url, baseFolder, srcMapper) {
  if (
    !url ||
    url.startsWith('http') ||
    url.startsWith('mailto') ||
    url.startsWith('tel') ||
    url.startsWith('data:') ||
    /\$\{[^}]+\}/.test(url) ||
    /\{\{[^}]+\}\}/.test(url)
  ) {
    return url
  }
  if (url.endsWith('/')) {
    return url
  }

  const filePath = pathByUrl(url, srcMapper, baseFolder)
  try {
    const fileHash = await getFileHash(filePath)
    return urlWithBustedVersion(url, fileHash)
  } catch (err) {
    global.log(`❌ File not found for ${url}:`, err.message)
    return url
  }
}

/**********************************************************************
 * 🧭 resolveImport()
 * ---------------------------------------------------------------
 * Applies import map and srcMapper to resolve an import path
 **********************************************************************/
function resolveImport(spec, baseFolder, srcMapper, importMap) {
  for (const [prefix, target] of Object.entries(importMap || {})) {
    if (prefix.endsWith('/') && spec.startsWith(prefix)) {
      spec = spec.replace(prefix, target)
    } else if (spec === prefix) {
      spec = target
    }
  }
  if (spec.startsWith('http') || spec.startsWith('data:') || spec.includes('${')) {
    return null
  }
  if (!spec.startsWith('.') && !spec.startsWith('/') && !spec.startsWith('../') && !spec.startsWith('./')) {
    return null
  }
  return pathByUrl(spec, srcMapper, baseFolder)
}

/**********************************************************************
 * 🌲 buildDependencyTree()
 * ---------------------------------------------------------------
 * Recursively scans a JS file for its imports and builds a tree:
 * {
 *   filePath: string,
 *   imports: [ childNodes... ],
 *   hash: string | null
 * }
 **********************************************************************/
async function buildDependencyTree(filePath, baseFolder, srcMapper, importMap, visited = new Map()) {
  if (visited.has(filePath)) {
    return visited.get(filePath)
  }

  let content
  try {
    content = await fs.readFile(filePath, 'utf-8')
  } catch {
    global.log(`❌ Cannot read file: ${filePath}`)
    return null
  }

  const node = { filePath, imports: [], hash: null }
  visited.set(filePath, node)

  const importRegexes = [
    /import\s+[^'"]*?from\s+(['"])([^'"]+)\1/g,
    /export\s+[^'"]*?from\s+(['"])([^'"]+)\1/g,
    /import\s+(['"])([^'"]+)\1/g,
    /import\s*\(\s*(['"])([^'"]+)\1\s*\)/g
  ]

  const specs = new Set()
  for (const re of importRegexes) {
    for (const m of content.matchAll(re)) {
      if (m && m[2]) {
        specs.add(m[2])
      }
    }
  }

  for (const spec of specs) {
    const resolved = resolveImport(spec, baseFolder, srcMapper, importMap)
    if (!resolved) {
      continue
    }
    const child = await buildDependencyTree(resolved, baseFolder, srcMapper, importMap, visited)
    if (child) {
      node.imports.push({ spec, node: child })
    }
  }

  return node
}


/**********************************************************************
 * 🧮 computeHashesBottomUp()
 * ---------------------------------------------------------------
 * Recursively computes hashes for dependency tree nodes.
 *
 * 🧠 Strategy:
 *  1. Traverse the dependency tree depth-first (post-order).
 *  2. Compute and propagate hashes bottom-up:
 *     - First, compute all child hashes.
 *     - Then, update parent imports to include ?v=<hash> for each child.
 *     - Finally, compute and assign parent’s own hash.
 *  3. This guarantees that every file’s hash reflects its
 *     dependencies’ final content and version identifiers.
 *
 * 🪜 Flow Example:
 *     A (entry)
 *     ├── B
 *     │   ├── C
 *     │   └── D
 *     └── E
 *  → compute C,D,E → update B → compute B → update A → compute A
 **********************************************************************/
async function computeHashesBottomUp(node, visited = new Set()) {
  if (!node) {
    // 🧩 Base case: empty node, stop recursion
    return null
  }

  // Avoid revisiting nodes or infinite loops
  if (visited.has(node.filePath)) {
    return node
  }
  visited.add(node.filePath)

  // ─────────────────────────────────────────────────────────────
  // 1️⃣ Read the current file content
  // ─────────────────────────────────────────────────────────────
  let content = await fs.readFile(node.filePath, 'utf-8')
  global.log(`📂 Processing file: ${node.filePath}`)

  // ─────────────────────────────────────────────────────────────
  // 2️⃣ Traverse all child imports first (post-order traversal)
  // ─────────────────────────────────────────────────────────────
  for (const imp of node.imports) {
    const child = await computeHashesBottomUp(imp.node)
    if (!child) {
      global.log(`⚠️  Skipped missing child import for ${imp.spec}`)
      continue
    }

    // ─────────────────────────────────────────────────────────────
    // 3️⃣ Replace child import specifier with versioned one
    // ─────────────────────────────────────────────────────────────
    const { spec } = imp

    // If import already has ?v=, replace it; otherwise append
    const newSpec = spec.includes('?v=')
      ? spec.replace(/(\?v=)[^&#]*/, `$1${child.hash}`)
      : `${spec}${spec.includes('?') ? '&' : '?'}v=${child.hash}`

    // Escape regex special characters in specifier
    const escaped = spec.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
    const quotedFind = new RegExp(`(['"])${escaped}\\1`, 'g')

    // Update content
    content = content.replace(quotedFind, `$1${newSpec}$1`)

    global.log(`🔗 Updated import in ${path.basename(node.filePath)}:`)
    global.log(`   ${spec} → ${newSpec}`)
  }

  // ─────────────────────────────────────────────────────────────
  // 4️⃣ Write updated content back to disk
  //    (all child version refs now updated)
  // ─────────────────────────────────────────────────────────────
  await fs.writeFile(node.filePath, content, 'utf-8')
  global.log(`💾 Saved updated file: ${node.filePath}`)

  // ─────────────────────────────────────────────────────────────
  // 5️⃣ Compute hash of current file after all changes
  // ─────────────────────────────────────────────────────────────
  node.hash = await getFileHash(node.filePath)
  global.log(`🧮 Hash computed for ${path.basename(node.filePath)} → ${node.hash}`)

  // Return node to parent for propagation
  return node
}

/**********************************************************************
 * updateCacheVersionsInUrls()
 * ---------------------------------------------------------------
 * Entry point: processes all files under given folder recursively.
 **********************************************************************/
export default async function updateCacheVersionsInUrls(folderPath, srcMapper) {
  global.log('🚀 Starting cache version update...')
  const baseFolder = folderPath

  const packageJSON = JSON.parse((await fs.readFile('package.json', 'utf-8')))
  const importMap = packageJSON['browser.importmap'] || {}
  const jsFileEntriesForCacheUpdates = packageJSON['jsFileEntriesForCacheUpdates'] || []
  global.log(`Found import map for browser ${JSON.stringify(importMap)}`)
  global.log(`Found js file entries for cache updates ${JSON.stringify(jsFileEntriesForCacheUpdates)}`)
  for (let jsEntry of jsFileEntriesForCacheUpdates) {
    await processJSEntryFile(jsEntry, baseFolder, srcMapper, importMap)
  }

  await processDirectoryWithHTMLAndMDFiles(baseFolder, folderPath, srcMapper, importMap)  
  global.log('🏁 Finished cache version update!')
}

import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

import pathByUrl from '#nodes/pathByUrl.js'
import { logSymbols } from '#nodes/setupFileLogging.js'
import runtime from '#nodes/runtime.js'

/**
 * @typedef {Object} DependencyNode
 * @property {string} filePath
 * @property {{ spec: string, node: DependencyNode }[]} imports
 * @property {string|null} hash
 */

/**
 * @typedef {Object.<string, string>} ImportMap
 */

/**
 * @param {import('node:fs').PathLike | import('fs/promises').FileHandle} filePath
 * @returns {string}
 */
function pathToString(filePath) {
  if (typeof filePath === 'string') {
    return filePath
  }
  if (filePath instanceof URL) {
    return filePath.pathname
  }
  return String(filePath)
}

/**
 * ********************************************************************
 * getFileHash()
 * ---------------------------------------------------------------
 * Computes short stable hash based on file contents.
 * ********************************************************************
 * @param {import("node:fs").PathLike | fs.FileHandle} filePath
 */
async function getFileHash(filePath) {
  const buffer = await fs.readFile(filePath)
  const hash = crypto.createHash('sha256').update(buffer).digest('hex')
  return hash.slice(0, 8)
}

/**
 * ********************************************************************
 * processUrlsInHtmlOrMd()
 * ---------------------------------------------------------------
 * Processes HTML or Markdown files:
 * - Skips code blocks and import maps
 * - Finds URLs in <img>, <script>, <link>, <link rel="preload|prefetch">, etc.
 * - Appends or updates 
 * ********************************************************************
 * @param {string} content
 * @param {any} baseFolder
 * @param {any} srcMapper
 * @param {any} importMap
 */
async function processUrlsInHtmlOrMd(content, baseFolder, srcMapper, importMap) {
  // ─────────────────────────────────────────────────────────────
  // Step 1: Skip code blocks enclosed by triple backticks
  // ─────────────────────────────────────────────────────────────
  runtime.log(`${logSymbols.arrow} Step 1: Skipping code blocks...`)
  /**
   * @type {string[]}
   */
  const codeBlocks = []
  content = content.replace(/```[\s\S]*?```|`[^`]*`/g, (codeBlock) => {
    codeBlocks.push(codeBlock)
    return `___CODE_BLOCK_${codeBlocks.length - 1}___`
  })

  // ─────────────────────────────────────────────────────────────
  // Step 2: Handle <script type="importmap"> blocks
  // ─────────────────────────────────────────────────────────────
  runtime.log(`${logSymbols.arrow} Step 2: Processing <script type="importmap"> blocks...`)
  const importmapRegex = /^([ \t]*)<script\s+type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/gim
  let importMatch
  while ((importMatch = importmapRegex.exec(content)) !== null) {
    const outerIndent = importMatch[1] || ''
    const fullBlock = importMatch[0]
    const jsonContent = importMatch[2]
    try {
      const parsed = JSON.parse(jsonContent)
      if (parsed.imports && typeof parsed.imports === 'object') {
        /** @type {Record<string, string>} */
        const updatedImports = {}
        for (const [key, url] of Object.entries(parsed.imports)) {
          updatedImports[key] = await maybeVersionUrl(String(url), baseFolder, srcMapper)
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
      runtime.log(`${logSymbols.warn} Failed to parse importmap JSON: ${err}`)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Step 3: Handle <script type="module"> blocks
  // ─────────────────────────────────────────────────────────────
  runtime.log(`${logSymbols.arrow} Step 3: Processing <script type="module"> blocks...`)
  const moduleRegex = /^([ \t]*)<script\s+type=["']module["'](?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gim
  const importModuleRegex = /import\s+['"]([^'"]+\.js)['"]/i
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
        const importUrl = importMatch[1]
        const resolved = resolveImport(importUrl, baseFolder, srcMapper, importMap)
        if (!resolved) {
          continue
        }
        const hash = await getFileHash(resolved)
        const newImportUrl = urlWithBustedVersion(importUrl, hash)
        lines[i] = lines[i].replace(importUrl, newImportUrl)
        runtime.log(`${logSymbols.ok} Versioned URL: ${importUrl} ${logSymbols.arrow} ${newImportUrl}`)
      }
      const newModuleCodeContent = lines.join('\n')
      const newBlock = `${outerIndent}<script type="module">${newModuleCodeContent}</script>`.replaceAll('\n\n', '\n')
      content = content.replace(fullBlock, newBlock)
    } catch (err) {
      runtime.log(`${logSymbols.warn} Failed to parse script with type "module": ${err}`)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Step 4: Process URLs in HTML or Markdown
  // ─────────────────────────────────────────────────────────────
  content = await processPreloadLinkHrefs(content, baseFolder, srcMapper)

  runtime.log(`${logSymbols.arrow} Step 4: Processing URLs in HTML or Markdown...`)
  // Skip preload/prefetch here — they are versioned in processPreloadLinkHrefs
  const regex = /<(img|script|e-html|e-json|e-svg|e-markdown|template\s+is="e-json-map"|template\s+is="e-wrapper"|link(?![^>]*\brel=["'](?:preload|prefetch)["']))\s+[^>]*(src|href|data-src)="([^"]+)"/g
  let match
  
  while ((match = regex.exec(content)) !== null) {
    const tagName = match[1].toLowerCase()
    let url = match[3]

    const toBeProcessed = shouldVersionUrl(url) &&
      !/template\s+is="e-json-map"/.test(tagName) &&
      tagName !== 'e-json' &&
      tagName !== 'a'

    if (toBeProcessed) {
      content = await versionUrlInContent(content, url, baseFolder, srcMapper)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Step 5: Restore skipped code blocks
  // ─────────────────────────────────────────────────────────────
  runtime.log(`${logSymbols.arrow} Step 5: Restoring skipped code blocks...`)
  codeBlocks.forEach((codeBlock, index) => {
    content = content.replace(`___CODE_BLOCK_${index}___`, codeBlock)
  })

  return content
}

/**
 * @param {string} url
 * @param {string} newVersion
 */
function urlWithBustedVersion(url, newVersion) {
  return url.includes('?v=')
      ? url.replace(/([\?&]v=)[^&]*/, `$1${newVersion}`)
      : `${url}${url.includes('?') ? '&' : '?'}v=${newVersion}`
}

/**
 * @param {string} url
 */
function shouldVersionUrl(url) {
  return Boolean(
    url &&
    !url.startsWith('http') &&
    !url.startsWith('mailto') &&
    !url.startsWith('tel') &&
    !url.startsWith('data:') &&
    !/\$\{[^}]+\}/.test(url) &&
    !/\{\{[^}]+\}\}/.test(url)
  )
}

/**
 * @type {string | null | undefined}
 */
let cachedPreloadOrigin

async function getPreloadOrigin() {
  if (cachedPreloadOrigin !== undefined) {
    return cachedPreloadOrigin
  }

  const environment = process.env.ENV
  if (!environment) {
    cachedPreloadOrigin = null
    return cachedPreloadOrigin
  }

  try {
    const config = JSON.parse(
      await fs.readFile(`./web-app/env/${environment}.json`, 'utf-8')
    )
    const hostPart = config.domain || config.host
    if (!hostPart) {
      cachedPreloadOrigin = null
      return cachedPreloadOrigin
    }

    const portPart = config.domain ? '' : `:${config.port}`
    cachedPreloadOrigin = `https://${hostPart}${portPart}`
    runtime.log(`${logSymbols.arrow} Preload origin from ${environment} env: ${cachedPreloadOrigin}`)
    return cachedPreloadOrigin
  } catch (err) {
    runtime.log(`${logSymbols.warn} Could not load preload origin from web-app/env/${environment}.json: ${err}`)
    cachedPreloadOrigin = null
    return cachedPreloadOrigin
  }
}

/**
 * @param {string} url
 * @param {string | null | undefined} origin
 * @returns {string}
 */
function toPathOnlyUrl(url, origin) {
  if (origin && url.startsWith(origin)) {
    const pathUrl = url.slice(origin.length)
    return pathUrl.startsWith('/') ? pathUrl : `/${pathUrl}`
  }

  if (/^https?:\/\//i.test(url)) {
    const parsed = new URL(url)
    return `${parsed.pathname}${parsed.search}`
  }

  return url
}

/**
 * @param {string} pathUrl
 * @param {any} origin
 */
function withPreloadOrigin(pathUrl, origin) {
  if (!origin) {
    return pathUrl
  }

  return `${origin}${pathUrl.startsWith('/') ? pathUrl : `/${pathUrl}`}`
}

/**
 * @param {string} content
 * @param {string} url
 * @param {string | undefined} baseFolder
 * @param {Function | undefined} srcMapper
 */
async function versionUrlInContent(content, url, baseFolder, srcMapper) {
  if (!shouldVersionUrl(url)) {
    return content
  }

  const filePath = pathByUrl(url, srcMapper, baseFolder)
  try {
    const fileHash = await getFileHash(filePath)
    const versionedUrl = urlWithBustedVersion(url, fileHash)

    runtime.log(`${logSymbols.ok} Versioned URL: ${url} ${logSymbols.arrow} ${versionedUrl}`)

    const escapedUrl = url.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
    return content.replace(new RegExp(escapedUrl, 'g'), versionedUrl)
  } catch (err) {
    runtime.log(`File not found for ${url}:`, err)
    return content
  }
}

/**
 * @param {string} content
 * @param {string | undefined} baseFolder
 * @param {Function | undefined} srcMapper
 */
async function processPreloadLinkHrefs(content, baseFolder, srcMapper) {
  runtime.log(`${logSymbols.arrow} Step 4.5: Processing <link rel="preload|prefetch"> hrefs...`)
  const origin = await getPreloadOrigin()
  const preloadTagRegex = /<link\b(?=[^>]*\brel=["']preload["'])[^>]*>/gi
  const prefetchTagRegex = /<link\b(?=[^>]*\brel=["']prefetch["'])[^>]*>/gi
  const hrefRegex = /\bhref=["']([^"']+)["']/i

  // Prefetch stays relative (host-correct everywhere). Strip any absolute origin first.
  content = content.replace(prefetchTagRegex, (tag) => {
    const href = tag.match(hrefRegex)?.[1]
    if (!href) {
      return tag
    }
    const pathUrl = toPathOnlyUrl(href, origin)
    return tag.replace(hrefRegex, `href="${pathUrl}"`)
  })

  const prefetchTags = content.match(prefetchTagRegex) || []
  const prefetchUrls = [...new Set(
    prefetchTags
      .map((tag) => tag.match(hrefRegex)?.[1])
      .filter(Boolean)
  )]
  for (const url of prefetchUrls) {
    if (url) {
      content = await versionUrlInContent(content, url, baseFolder, srcMapper)
    }
  }

  if (origin) {
    content = content.replace(preloadTagRegex, (tag) => {
      const href = tag.match(hrefRegex)?.[1]
      if (!href) {
        return tag
      }
      const pathUrl = toPathOnlyUrl(href, origin)
      return tag.replace(hrefRegex, `href="${pathUrl}"`)
    })
  }

  const preloadTags = content.match(preloadTagRegex) || []
  const urls = [...new Set(
    preloadTags
      .map((tag) => tag.match(hrefRegex)?.[1])
      .filter(Boolean)
  )]

  for (const url of urls) {
    if (url) {
      content = await versionUrlInContent(content, url, baseFolder, srcMapper)
    }
  }

  // Preload may need an absolute origin for CORS matching with as=fetch.
  if (origin) {
    content = content.replace(preloadTagRegex, (tag) => {
      const href = tag.match(hrefRegex)?.[1]
      if (!href) {
        return tag
      }
      const absoluteHref = withPreloadOrigin(href, origin)
      return tag.replace(hrefRegex, `href="${absoluteHref}"`)
    })
  }

  return content
}

/**
 * ********************************************************************
 * processDirectoryWithHTMLAndMDFiles()
 * ---------------------------------------------------------------
 * Recursively processes directories:
 * - Finds HTML/MD
 * - Applies versioning updates
 * - Recurses into subdirectories
 * ********************************************************************
 * @param {any} baseFolder
 * @param {string} folderPath
 * @param {any} srcMapper
 * @param {ImportMap} importMap
 */
async function processDirectoryWithHTMLAndMDFiles(baseFolder, folderPath, srcMapper, importMap) {
  const folder = pathToString(folderPath)
  runtime.log(`${logSymbols.arrow} Processing directory: ${folder}`)
  const files = await fs.readdir(folder)
  const htmlFiles = files.filter(file => file.endsWith('.html') || file.endsWith('.md'))

  // HTML / Markdown
  for (const file of htmlFiles) {
    const filePath = path.join(folder, file)
    let content = await fs.readFile(filePath, 'utf-8')
    runtime.log(`${logSymbols.arrow} Updating: ${file}`)
    content = await processUrlsInHtmlOrMd(content, baseFolder, srcMapper, importMap)
    await fs.writeFile(filePath, content, 'utf-8')
    runtime.log(`${logSymbols.ok} Updated: ${file}`)
  }

  // Recurse into subdirectories
  for (const file of files) {
    const filePath = path.join(folder, file)
    const stats = await fs.stat(filePath)
    if (stats.isDirectory()) {
      runtime.log(`${logSymbols.arrow} Entering subdirectory: ${filePath}`)
      await processDirectoryWithHTMLAndMDFiles(baseFolder, filePath, srcMapper, importMap)
    }
  }
}


/**
 * ********************************************************************
 * processJSEntryFile()
 * ---------------------------------------------------------------
 * Builds dependency tree and updates all files bottom-up.
 * ********************************************************************
 * @param {import('node:fs').PathLike | import('fs/promises').FileHandle} entryPath
 * @param {string} baseFolder
 * @param {any} srcMapper
 * @param {ImportMap} [importMap]
 */
export async function processJSEntryFile(entryPath, baseFolder, srcMapper, importMap = {}) {
  const entryPathString = pathToString(entryPath)
  runtime.log(`${logSymbols.arrow} Building dependency tree for ${entryPathString}`)
  const tree = await buildDependencyTree(entryPathString, baseFolder, srcMapper, importMap)
  runtime.log(`${logSymbols.arrow} Dependency tree built, computing hashes...`)
  await computeHashesBottomUp(tree)
  runtime.log(`${logSymbols.ok} All imports versioned successfully.`)
}

/**
 * ********************************************************************
 * maybeVersionUrl()
 * ---------------------------------------------------------------
 * Returns versioned URL with 
 * Skips external, dynamic, or invalid URLs.
 * ********************************************************************
 * @param {string} url
 * @param {string | undefined} baseFolder
 * @param {Function | undefined} srcMapper
 */
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
    runtime.log(`${logSymbols.err} File not found for ${url}:`, err)
    return url
  }
}

/**
 * ********************************************************************
 * resolveImport()
 * ---------------------------------------------------------------
 * Applies import map and srcMapper to resolve an import path
 * ********************************************************************
 * @param {string} spec
 * @param {string | undefined} baseFolder
 * @param {Function | undefined} srcMapper
 * @param {ImportMap} importMap
 */
function resolveImport(spec, baseFolder, srcMapper, importMap) {
  for (const [prefix, target] of Object.entries(importMap || {})) {
    if (prefix.endsWith('/') && spec.startsWith(prefix)) {
      spec = spec.replace(prefix, String(target))
    } else if (spec === prefix) {
      spec = String(target)
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

/**
 * ********************************************************************
 * buildDependencyTree()
 * ---------------------------------------------------------------
 * Recursively scans a JS file for its imports and builds a tree:
 * {
 *  filePath: string,
 *  imports: [ childNodes... ],
 *  hash: string | null
 * }
 * ********************************************************************
 * @param {string} filePath
 * @param {any} baseFolder
 * @param {any} srcMapper
 * @param {ImportMap} importMap
 * @param {Map<string, DependencyNode|null>} [visited]
 * @returns {Promise<DependencyNode|null>}
 */
async function buildDependencyTree(filePath, baseFolder, srcMapper, importMap, visited = new Map()) {
  const filePathString = pathToString(filePath)
  if (visited.has(filePathString)) {
    return visited.get(filePathString) || null
  }

  let content
  try {
    content = await fs.readFile(filePathString, 'utf-8')
  } catch {
    runtime.log(`${logSymbols.err} Cannot read file: ${filePathString}`)
    return null
  }

  /** @type {DependencyNode} */
  const node = { filePath: filePathString, imports: [], hash: null }
  visited.set(filePathString, node)

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


/**
 * ********************************************************************
 * computeHashesBottomUp()
 * ---------------------------------------------------------------
 * Recursively computes hashes for dependency tree nodes.
 * 
 * Strategy:
 * 1. Traverse the dependency tree depth-first (post-order).
 * 2. Compute and propagate hashes bottom-up:
 *    - First, compute all child hashes.
 *    - Then, update parent imports to include 
 *    - Finally, compute and assign parent’s own hash.
 * 3. This guarantees that every file’s hash reflects its
 *    dependencies’ final content and version identifiers.
 * 
 * Flow Example:
 *    A (entry)
 *    ├── B
 *    │   ├── C
 *    │   └── D
 *    └── E
 * → compute C,D,E → update B → compute B → update A → compute A
 * ********************************************************************
 * @param {DependencyNode|null|undefined} node
 * @param {Set<string>} [visited]
 * @returns {Promise<DependencyNode|null>}
 */
async function computeHashesBottomUp(node, visited = new Set()) {
  if (!node) {
    // Base case: empty node, stop recursion
    return null
  }

  // Avoid revisiting nodes or infinite loops
  if (visited.has(node.filePath)) {
    return node
  }
  visited.add(node.filePath)

  // ─────────────────────────────────────────────────────────────
  // (1) Read the current file content
  // ─────────────────────────────────────────────────────────────
  let content = await fs.readFile(node.filePath, 'utf-8')
  runtime.log(`${logSymbols.arrow} Processing file: ${node.filePath}`)

  // ─────────────────────────────────────────────────────────────
  // (2) Traverse all child imports first (post-order traversal)
  // ─────────────────────────────────────────────────────────────
  for (const imp of node.imports) {
    const child = await computeHashesBottomUp(imp.node)
    if (!child) {
      runtime.log(`${logSymbols.warn} Skipped missing child import for ${imp.spec}`)
      continue
    }

    // ─────────────────────────────────────────────────────────────
    // (3) Replace child import specifier with versioned one
    // ─────────────────────────────────────────────────────────────
    const { spec } = imp

    // If import already has
    const newSpec = spec.includes('?v=')
      ? spec.replace(/([\?&]v=)[^&]*/, `$1${child.hash}`)
      : `${spec}${spec.includes('?') ? '&' : '?'}v=${child.hash}`

    // Escape regex special characters in specifier
    const escaped = spec.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
    const quotedFind = new RegExp(`(['"])${escaped}\\1`, 'g')

    // Update content
    content = content.replace(quotedFind, `$1${newSpec}$1`)

    runtime.log(`${logSymbols.arrow} Updated import in ${path.basename(node.filePath)}:`)
    runtime.log(`   ${spec} ${logSymbols.arrow} ${newSpec}`)
  }

  // ─────────────────────────────────────────────────────────────
  // (4) Write updated content back to disk
  //    (all child version refs now updated)
  // ─────────────────────────────────────────────────────────────
  await fs.writeFile(node.filePath, content, 'utf-8')
  runtime.log(`${logSymbols.ok} Saved updated file: ${node.filePath}`)

  // ─────────────────────────────────────────────────────────────
  // (5) Compute hash of current file after all changes
  // ─────────────────────────────────────────────────────────────
  node.hash = await getFileHash(node.filePath)
  runtime.log(`${logSymbols.arrow} Hash computed for ${path.basename(node.filePath)} ${logSymbols.arrow} ${node.hash}`)

  // Return node to parent for propagation
  return node
}

/**
 * ********************************************************************
 * updateCacheVersionsInUrls()
 * ---------------------------------------------------------------
 * Entry point: processes all files under given folder recursively.
 * ********************************************************************
 * @param {import("node:fs").PathLike} folderPath
 * @param {any} srcMapper
 */
export default async function updateCacheVersionsInUrls(folderPath, srcMapper) {
  runtime.log(`${logSymbols.arrow} Starting cache version update...`)
  const baseFolder = pathToString(folderPath)

  const packageJSON = JSON.parse((await fs.readFile('package.json', 'utf-8')))
  const importMap = packageJSON['browser.importmap'] || {}
  const jsFileEntriesForCacheUpdates = packageJSON['jsFileEntriesForCacheUpdates'] || []
  runtime.log(`Found import map for browser ${JSON.stringify(importMap)}`)
  runtime.log(`Found js file entries for cache updates ${JSON.stringify(jsFileEntriesForCacheUpdates)}`)
  for (let jsEntry of jsFileEntriesForCacheUpdates) {
    await processJSEntryFile(jsEntry, baseFolder, srcMapper, importMap)
  }

  await processDirectoryWithHTMLAndMDFiles(baseFolder, baseFolder, srcMapper, importMap)
  runtime.log(`${logSymbols.ok} Finished cache version update!`)
}

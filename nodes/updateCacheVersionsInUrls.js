import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

import defaultSrcMapper from './defaultSrcMapper.js'
import pathByUrl from './pathByUrl.js'

/**********************************************************************
 * processUrlsInHtmlOrMd()
 * ---------------------------------------------------------------
 * Processes HTML or Markdown files:
 *  - Skips code blocks and import maps
 *  - Finds URLs in <img>, <script>, <link>, etc.
 *  - Appends or updates ?v=<hash> based on file content checksum
 **********************************************************************/
async function processUrlsInHtmlOrMd(content, baseFolder, srcMapper) {
  // ─────────────────────────────────────────────────────────────
  // Step 1: Skip code blocks enclosed by triple backticks
  // ─────────────────────────────────────────────────────────────
  console.log('📝 Step 1: Skipping code blocks...')
  const codeBlocks = []
  content = content.replace(/```[\s\S]*?```|`[^`]*`/g, (codeBlock) => {
    codeBlocks.push(codeBlock)
    return `___CODE_BLOCK_${codeBlocks.length - 1}___`
  })

  // ─────────────────────────────────────────────────────────────
  // Step 2: Handle <script type="importmap"> blocks
  // ─────────────────────────────────────────────────────────────
  console.log('📝 Step 2: Processing <script type="importmap"> blocks...')
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
      console.warn(`⚠️  Failed to parse importmap JSON: ${err.message}`)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Step 3: Process URLs in HTML or Markdown
  // ─────────────────────────────────────────────────────────────
  console.log('🔗 Step 3: Processing URLs in HTML or Markdown...')
  const regex = /<(img|script|e-html|e-json|e-json|e-svg|e-markdown|template\s+is="e-json"|template\s+is="e-wrapper"|link(?:\s+rel="preload")?)\s+[^>]*(src|href|data-src)="([^"]+)"/g
  let match
  
  while ((match = regex.exec(content)) !== null) {
    const tagName = match[1].toLowerCase()
    const attribute = match[2]
    let url = match[3]

    const toBeProcessed = url &&
      !/template\s+is="e-json"/.test(tagName) &&
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
        const versionedUrl = url.includes('?v=')
          ? url.replace(/(\?v=).*$/, `?v=${fileHash}`)
          : `${url}?v=${fileHash}`

        console.log(`✨ Versioned URL: ${url} → ${versionedUrl}`)

        const escapedUrl = url.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
        const globalRegex = new RegExp(escapedUrl, 'g')
        content = content.replace(globalRegex, versionedUrl)
      } catch (err) {
        console.warn(`File not found for ${url}:`, err.message)
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Step 4: Restore skipped code blocks
  // ─────────────────────────────────────────────────────────────
  console.log('🔄 Step 4: Restoring skipped code blocks...')
  codeBlocks.forEach((codeBlock, index) => {
    content = content.replace(`___CODE_BLOCK_${index}___`, codeBlock)
  })

  return content
}

/**********************************************************************
 * processImportsInJsFiles()
 * ---------------------------------------------------------------
 * Processes import/export statements in JS files:
 *  - Detects static and dynamic imports
 *  - Resolves them via srcMapper
 *  - Appends or replaces ?v=<hash> for each local file import
 **********************************************************************/
async function processImportsInJsFiles(content, baseFolder, srcMapper, importMap = {}) {
  console.log('🧩 Processing imports in JS file...')

  // ─────────────────────────────────────────────────────────────
  // 1) Collect all static import/export patterns
  // ─────────────────────────────────────────────────────────────
  const patterns = [
    /import\s+[^'"]*?from\s+(['"])([^'"]+)\1/g,
    /export\s+[^'"]*?from\s+(['"])([^'"]+)\1/g,
    /import\s+(['"])([^'"]+)\1/g,
    /import\s*\(\s*(['"])([^'"]+)\1\s*\)/g
  ]

  const found = new Set()
  for (const re of patterns) {
    for (const m of content.matchAll(re)) {
      if (m && m[2]) found.add(m[2])
    }
  }

  if (found.size === 0) return content

  // ─────────────────────────────────────────────────────────────
  // 2) Apply import map logic
  // ─────────────────────────────────────────────────────────────
  const applyImportMap = (spec) => {
    for (const [prefix, target] of Object.entries(importMap || {})) {
      if (prefix.endsWith('/') && spec.startsWith(prefix)) return spec.replace(prefix, target)
      if (spec === prefix) return target
    }
    return spec
  }

  // ─────────────────────────────────────────────────────────────
  // 3) Process each import specifier
  // ─────────────────────────────────────────────────────────────
  for (const specifier of found) {
    if (
      !specifier ||
      specifier.startsWith('http') ||
      specifier.startsWith('data:') ||
      specifier.includes('${')
    ) continue

    const mapped = applyImportMap(specifier)
    const isBare = !mapped.startsWith('.') && !mapped.startsWith('/') && !mapped.startsWith('../') && !mapped.startsWith('./')
    if (isBare) continue

    const looksJs = /\.[mc]?js(?:$|[?#])/.test(mapped)
    if (!looksJs) continue

    let filePath
    try {
      filePath = pathByUrl(mapped, srcMapper, baseFolder)
      if (!filePath) throw new Error('pathByUrl returned empty path')
    } catch (e) {
      console.warn(`❌ Could not map "${specifier}" → "${mapped}": ${e.message}`)
      continue
    }

    let hash
    try {
      hash = await getFileHash(filePath)
    } catch {
      console.warn(`❌ File not found for "${mapped}" at ${filePath}`)
      continue
    }

    const newSpecifier = specifier.includes('?v=')
      ? specifier.replace(/(\?v=)[^&#]*/, `$1${hash}`)
      : `${specifier}${specifier.includes('?') ? '&' : '?'}v=${hash}`

    const escaped = specifier.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
    const quotedFind = new RegExp(`(['"])${escaped}\\1`, 'g')
    content = content.replace(quotedFind, `$1${newSpecifier}$1`)

    console.log(`✨ Versioned import: ${specifier} → ${newSpecifier}`)
  }

  return content
}

/**********************************************************************
 * processDirectory()
 * ---------------------------------------------------------------
 * Recursively processes directories:
 *  - Finds HTML/MD and JS files
 *  - Applies versioning updates
 *  - Recurses into subdirectories
 **********************************************************************/
async function processDirectory(baseFolder, folderPath, srcMapper) {
  console.log(`📂 Processing directory: ${folderPath}`)
  const files = await fs.readdir(folderPath)
  const htmlFiles = files.filter(file => file.endsWith('.html') || file.endsWith('.md'))
  const jsFiles = files.filter(file => file.endsWith('.js'))

  // HTML / Markdown
  for (const file of htmlFiles) {
    const filePath = path.join(folderPath, file)
    let content = await fs.readFile(filePath, 'utf-8')
    content = await processUrlsInHtmlOrMd(content, baseFolder, srcMapper)
    await fs.writeFile(filePath, content, 'utf-8')
    console.log(`✅ Updated: ${file}`)
  }

  // JS Files
  const broweserImportMapLocation = JSON.parse((await fs.readFile('package.json', 'utf-8')))['browser.importmap.json']
  const importMap = broweserImportMapLocation
    ? JSON.parse((await fs.readFile(broweserImportMapLocation, 'utf-8')))['imports'] || {}
    : {}
  console.log(`Found import map for browser: ${JSON.stringify(importMap)}`)
  for (const file of jsFiles) {
    const filePath = path.join(folderPath, file)
    let content = await fs.readFile(filePath, 'utf-8')
    content = await processImportsInJsFiles(content, baseFolder, srcMapper, importMap)
    await fs.writeFile(filePath, content, 'utf-8')
    console.log(`✅ Updated: ${file}`)
  }

  // Recurse into subdirectories
  for (const file of files) {
    const filePath = path.join(folderPath, file)
    const stats = await fs.stat(filePath)
    if (stats.isDirectory()) {
      console.log(`📁 Entering subdirectory: ${filePath}`)
      await processDirectory(baseFolder, filePath, srcMapper)
    }
  }
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
  if (url.endsWith('/')) return url

  const filePath = pathByUrl(url, srcMapper, baseFolder)
  try {
    const fileHash = await getFileHash(filePath)
    return url.includes('?v=')
      ? url.replace(/(\?v=).*$/, `?v=${fileHash}`)
      : `${url}?v=${fileHash}`
  } catch (err) {
    console.warn(`❌ File not found for ${url}:`, err.message)
    return url
  }
}

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
 * updateCacheVersionsInUrls()
 * ---------------------------------------------------------------
 * Entry point: processes all files under given folder recursively.
 **********************************************************************/
export default async function updateCacheVersionsInUrls(folderPath, srcMapper) {
  console.log('🚀 Starting cache version update...')
  const baseFolder = folderPath
  await processDirectory(baseFolder, folderPath, srcMapper)
  console.log('🏁 Finished cache version update!')
}

const fs = require('fs').promises
const path = require('path')
const crypto = require('crypto')

const defaultSrcMapper = require('./defaultSrcMapper')
const pathByUrl = require('./pathByUrl')

/**
 * Processes URLs in HTML or Markdown content, appending a version query parameter based on the file's hash.
 *
 * @param {string} content - The content of an HTML or Markdown file.
 * @param {string} baseFolder - The base folder for resolving file paths.
 * @param {Function} srcMapper - A function to map URLs to file paths.
 * @returns {Promise<string>} A promise that resolves to the updated content with versioned URLs.
 */
async function processUrlsInHtmlOrMd(content, baseFolder, srcMapper) {
  // Step 1: Skip code blocks enclosed by triple backticks
  console.log('📝 Step 1: Skipping code blocks...')
  const codeBlocks = []
  content = content.replace(/```[\s\S]*?```|`[^`]*`/g, (codeBlock) => {
    // Save the code block in an array to avoid altering it
    codeBlocks.push(codeBlock)
    // Replace the code block with a placeholder
    return `___CODE_BLOCK_${codeBlocks.length - 1}___`
  })


  // Step 2: Handle <script type="importmap"> blocks
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

  // Step 3: Process URLs in HTML or Markdown
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

    // Skip if URL is external (http, mailto, etc.) or is in an <a> tag
    if (toBeProcessed) {
      // Use srcMapper to map URLs to actual file paths
      const filePath = pathByUrl(url, srcMapper, baseFolder)
      try {
        // Check if the file exists
        const fileStats = await fs.stat(filePath)
        const fileHash = await getFileHash(fileStats)
        const versionedUrl = url.includes('?v=') ? url.replace(/(\?v=).*$/, `?v=${fileHash}`) : `${url}?v=${fileHash}`
        
        console.log(`✨ Versioned URL: ${url} → ${versionedUrl}`)

        // Use a global regex to replace all occurrences of the same URL
        const escapedUrl = url.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') // Escape special characters in the URL
        const globalRegex = new RegExp(escapedUrl, 'g')
        content = content.replace(globalRegex, versionedUrl)
      } catch (err) {
        console.warn(`File not found for ${url}:`, err.message)
      }
    }
  }

  // Step 4: Restore the skipped code blocks
  console.log('🔄 Step 4: Restoring skipped code blocks...')
  codeBlocks.forEach((codeBlock, index) => {
    content = content.replace(`___CODE_BLOCK_${index}___`, codeBlock)
  })

  return content
}

async function processDirectory(baseFolder, folderPath, srcMapper) {
  console.log(`📂 Processing directory: ${folderPath}`)
  const files = await fs.readdir(folderPath)
  const htmlFiles = files.filter(file => file.endsWith('.html') || file.endsWith('.md'))

  for (const file of htmlFiles) {
    const filePath = path.join(folderPath, file)
    let content = await fs.readFile(filePath, 'utf-8')
    
    // Process URLs and version them as needed
    content = await processUrlsInHtmlOrMd(content, baseFolder, srcMapper)

    // Write the updated content back to the file
    await fs.writeFile(filePath, content, 'utf-8')
    console.log(`✅ Updated: ${file}`)
  }

  // Process subdirectories recursively
  for (const file of files) {
    const filePath = path.join(folderPath, file)
    const stats = await fs.stat(filePath)
    
    // If it's a directory, call processDirectory recursively
    if (stats.isDirectory()) {
      console.log(`📁 Entering subdirectory: ${filePath}`)
      await processDirectory(baseFolder, filePath, srcMapper)
    }
  }
}

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
  const filePath = pathByUrl(url, srcMapper, baseFolder)
  try {
    const fileStats = await fs.stat(filePath)
    const fileHash = await getFileHash(fileStats)
    return url.includes('?v=')
      ? url.replace(/(\?v=).*$/, `?v=${fileHash}`)
      : `${url}?v=${fileHash}`
  } catch (err) {
    console.warn(`❌ File not found for ${url}:`, err.message)
    return url
  }
}

async function getFileHash(fileStats) {
  const hash = crypto.createHash('sha256').update(fileStats.mtime.toString()).digest('hex').slice(0, 8) // Get first 8 chars of the hash
  return hash;
}

module.exports = async function updateCacheVersionsInUrls(folderPath, srcMapper) {
  console.log('🚀 Starting cache version update...')
  const baseFolder = folderPath
  await processDirectory(baseFolder, folderPath, srcMapper)
  console.log('🏁 Finished cache version update!')
}

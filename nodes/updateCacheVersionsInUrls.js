const fs = require('fs').promises
const path = require('path')
const crypto = require('crypto')

const defaultSrcMapper = require('./defaultSrcMapper')
const pathByUrl = require('./pathByUrl')

async function processUrlsInHtmlOrMd(content, baseFolder, srcMapper) {
  // Step 1: Skip code blocks enclosed by triple backticks
  const codeBlocks = []
  content = content.replace(/```[\s\S]*?```|`[^`]*`/g, (codeBlock) => {
    // Save the code block in an array to avoid altering it
    codeBlocks.push(codeBlock)
    // Replace the code block with a placeholder
    return `___CODE_BLOCK_${codeBlocks.length - 1}___`
  })

  // Step 2: Process URLs in HTML or Markdown
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
      !url.startsWith('data:')

    // Skip if URL is external (http, mailto, etc.) or is in an <a> tag
    if (toBeProcessed) {
      // Use srcMapper to map URLs to actual file paths
      const filePath = pathByUrl(url, srcMapper, baseFolder)
      try {
        // Check if the file exists
        const fileStats = await fs.stat(filePath)
        const fileHash = await getFileHash(fileStats)
        const versionedUrl = url.includes('?v=') ? url.replace(/(\?v=).*$/, `?v=${fileHash}`) : `${url}?v=${fileHash}`
        
        // Replace the original URL with the versioned URL in the content
        content = content.replace(url, versionedUrl)
      } catch (err) {
        console.warn(`File not found for ${url}:`, err.message)
      }
    }
  }

  // Step 3: Restore the skipped code blocks
  codeBlocks.forEach((codeBlock, index) => {
    content = content.replace(`___CODE_BLOCK_${index}___`, codeBlock)
  })

  return content
}

async function processDirectory(baseFolder, folderPath, srcMapper) {
  const files = await fs.readdir(folderPath)
  const htmlFiles = files.filter(file => file.endsWith('.html') || file.endsWith('.md'))

  for (const file of htmlFiles) {
    const filePath = path.join(folderPath, file)
    let content = await fs.readFile(filePath, 'utf-8')
    
    // Process URLs and version them as needed
    content = await processUrlsInHtmlOrMd(content, baseFolder, srcMapper)

    // Write the updated content back to the file
    await fs.writeFile(filePath, content, 'utf-8')
  }

  // Process subdirectories recursively
  for (const file of files) {
    const filePath = path.join(folderPath, file)
    const stats = await fs.stat(filePath)
    
    // If it's a directory, call processDirectory recursively
    if (stats.isDirectory()) {
      await processDirectory(baseFolder, filePath, srcMapper)
    }
  }
}

async function getFileHash(fileStats) {
  const hash = crypto.createHash('sha256').update(fileStats.mtime.toString()).digest('hex').slice(0, 8) // Get first 8 chars of the hash
  return hash;
}

module.exports = async function updateCacheVersionsInUrls(folderPath, srcMapper) {
  const baseFolder = folderPath
  await processDirectory(baseFolder, folderPath, srcMapper)
}

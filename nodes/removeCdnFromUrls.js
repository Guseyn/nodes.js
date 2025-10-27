import fs from 'fs/promises'
import path from 'path'

/**
 * Removes CDN URLs from HTML content by replacing them with relative paths.
 *
 * @param {string} htmlContent - The HTML content to process.
 * @param {string} cdnBaseUrl - The base URL of the CDN to be removed.
 * @returns {Promise<string>} A promise that resolves to the updated HTML content.
 */
async function removeCdnUrlsFromHtml(htmlContent, cdnBaseUrl) {
  const tagRegex = /<(a|img|script|link|audio|video|source|e-html|e-svg|e-markdown|e-json|e-json-view|template\s+is="e-json"|template\s+is="e-wrapper")([^>]*)>/g

  return htmlContent.replace(tagRegex, (match, tagName, attributes) => {
    attributes = attributes.replace(/(href|src)="(https?:\/\/[^"]+)"/g, (attrMatch, attribute, fullUrl) => {
      if (fullUrl.startsWith(cdnBaseUrl)) {
        const relativePath = fullUrl.replace(cdnBaseUrl, '')
        return `${attribute}="${relativePath}"`
      }
      return attrMatch // No change for non-CDN URLs
    })
    return `<${tagName}${attributes}>`
  })
}

/**
 * Removes CDN URLs from Markdown content by replacing them with relative paths.
 *
 * @param {string} mdContent - The Markdown content to process.
 * @param {string} cdnBaseUrl - The base URL of the CDN to be removed.
 * @returns {Promise<string>} A promise that resolves to the updated Markdown content.
 */
async function removeCdnUrlsFromMarkdown(mdContent, cdnBaseUrl) {
  // Step 1: Skip code blocks enclosed by triple backticks and inline code enclosed by single backticks
  const codeBlocks = []
  mdContent = mdContent.replace(/```[\s\S]*?```|`[^`]*`/g, (codeBlock) => {
    // Save the code block in an array to avoid altering it
    codeBlocks.push(codeBlock)
    // Replace the code block with a placeholder
    return `___CODE_BLOCK_${codeBlocks.length - 1}___`
  })

  // Step 2: Adjust relative paths in Markdown links and images
  mdContent = mdContent.replace(/(!?\[.*?\])(\(https?:\/\/[^)]+?\))/g, (match, altText, fullUrl) => {
    if (fullUrl.startsWith(cdnBaseUrl)) {
      const relativePath = fullUrl.replace(cdnBaseUrl, '')
      return `${altText}(${relativePath})`
    }
    return match // No change for non-CDN URLs
  })

  // Step 3: Adjust relative paths in HTML tags within the Markdown content
  mdContent = mdContent.replace(/<(a|img|script|link|audio|video|source|e-html|e-svg|e-markdown|e-json|e-json-view|template\s+is="e-json"|template\s+is="e-wrapper")([^>]*)>/g, (match, tagName, attributes) => {
    attributes = attributes.replace(/(href|src|data-src)="(https?:\/\/[^"]+)"/g, (attrMatch, attribute, fullUrl) => {
      if (fullUrl.startsWith(cdnBaseUrl)) {
        const relativePath = fullUrl.replace(cdnBaseUrl, '')
        return `${attribute}="${relativePath}"`
      }
      return attrMatch // No change for non-CDN URLs
    })

    return `<${tagName}${attributes}>`
  })

  // Step 4: Restore the skipped code blocks
  codeBlocks.forEach((codeBlock, index) => {
    mdContent = mdContent.replace(`___CODE_BLOCK_${index}___`, codeBlock)
  })

  return mdContent
}

/**
 * Recursively removes CDN URLs from HTML and Markdown files within a directory.
 *
 * @param {string} dirPath - The path to the directory to process.
 * @param {string} cdnBaseUrl - The base URL of the CDN to be removed.
 * @returns {Promise<void>} A promise that resolves when all files are processed.
 */
async function removeCdnFromUrls(dirPath, cdnBaseUrl) {
  try {
    // Read all files and directories in the given directory
    const files = await fs.readdir(dirPath, { withFileTypes: true })

    for (const file of files) {
      const fullPath = path.join(dirPath, file.name)

      if (file.isDirectory()) {
        // Recursively process directories
        await removeCdnFromUrls(fullPath, cdnBaseUrl)
      } else if (file.isFile()) {
        const extname = path.extname(file.name).toLowerCase()

        if (extname === '.html' || extname === '.md') {
          // Process HTML and Markdown files
          const content = await fs.readFile(fullPath, 'utf8')
          let updatedContent

          if (extname === '.html') {
            updatedContent = await removeCdnUrlsFromHtml(content, cdnBaseUrl)
          } else if (extname === '.md') {
            updatedContent = await removeCdnUrlsFromMarkdown(content, cdnBaseUrl)
          }

          // Write the updated content back to the file
          await fs.writeFile(fullPath, updatedContent, 'utf8')
          console.log('CDN URLs removed from file:', fullPath)
        }
      }
    }
  } catch (err) {
    console.error('Error processing files:', err)
  }
}

export default removeCdnFromUrls

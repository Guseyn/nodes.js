const fs = require('fs').promises // Use fs.promises for async/await
const path = require('path')

async function removeCdnUrlsFromHtml(htmlContent, cdnBaseUrl) {
  const tagRegex = /<(a|img|script|link|audio|video|source|e-html|e-svg|e-markdown|e-json|e-json-view)([^>]*)>/g

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

async function removeCdnUrlsFromMarkdown(mdContent, cdnBaseUrl) {
  // Step 1: Adjust relative paths in Markdown links and images
  mdContent = mdContent.replace(/(!?\[.*?\])(\(https?:\/\/[^)]+?\))/g, (match, altText, fullUrl) => {
    if (fullUrl.startsWith(cdnBaseUrl)) {
      const relativePath = fullUrl.replace(cdnBaseUrl, '')
      return `${altText}(${relativePath})`
    }
    return match // No change for non-CDN URLs
  })

  // Step 2: Adjust relative paths in HTML tags within the Markdown content
  mdContent = mdContent.replace(/<(a|img|script|link|audio|video|source|e-html|e-svg|e-markdown|e-json|e-json-view)([^>]*)>/g, (match, tagName, attributes) => {
    attributes = attributes.replace(/(href|src|data-src)="(https?:\/\/[^"]+)"/g, (attrMatch, attribute, fullUrl) => {
      if (fullUrl.startsWith(cdnBaseUrl)) {
        const relativePath = fullUrl.replace(cdnBaseUrl, '')
        return `${attribute}="${relativePath}"`
      }
      return attrMatch // No change for non-CDN URLs
    })

    return `<${tagName}${attributes}>`
  })

  return mdContent
}

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

module.exports = removeCdnFromUrls

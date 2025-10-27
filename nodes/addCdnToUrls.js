import fs from 'fs/promises'
import path from 'path'

/**
 * Adjusts paths in HTML content by prepending a CDN base URL to relative paths.
 *
 * @param {string} htmlContent - The content of the HTML file.
 * @param {string} cdnBaseUrl - The base URL of the CDN to prepend to relative paths.
 * @returns {Promise<string>} The updated HTML content with adjusted paths.
 */
async function adjustPathsInHTML(htmlContent, cdnBaseUrl) {
  const tagRegex = /<(a|img|script|link|audio|video|source|e-html|e-svg|e-markdown|e-json|e-json-view|template\s+is="e-json"|template\s+is="e-wrapper")([^>]*)>/g

  return htmlContent.replace(tagRegex, (match, tagName, attributes) => {
    if (tagName === 'a') {
      return match
    }
    if (tagName === 'e-json') {
      return match
    }
    if (/template\s+is="e-json"/.test(tagName)) {
      return match
    }

    // Update the href or src attributes within the tag
    attributes = attributes.replace(/(href|src|data-src)="(\/[^"]+)"/g, (attrMatch, attribute, path) => {
      // Only adjust if the path is relative (starts with '/')
      if (path.startsWith('/')) {
        return `${attribute}="${cdnBaseUrl}${path}"`
      }
      return attrMatch // No change for non-relative paths
    })

    return `<${tagName}${attributes}>`
  })
}

/**
 * Adjusts paths in Markdown content by prepending a CDN base URL to relative paths.
 *
 * @param {string} mdContent - The content of the Markdown file.
 * @param {string} cdnBaseUrl - The base URL of the CDN to prepend to relative paths.
 * @returns {Promise<string>} The updated Markdown content with adjusted paths.
 */
async function adjustPathsInMarkdown(mdContent, cdnBaseUrl) {
  // Step 1: Skip code blocks enclosed by triple backticks
  const codeBlocks = []
  mdContent = mdContent.replace(/```[\s\S]*?```|`[^`]*`/g, (codeBlock) => {
    // Save the code block in an array to avoid altering it
    codeBlocks.push(codeBlock)
    // Replace the code block with a placeholder
    return `___CODE_BLOCK_${codeBlocks.length - 1}___`
  })


  // Step 2: Adjust relative paths in Markdown links and images
  mdContent = mdContent.replace(/(!?\[.*?\])(\(\/[^)]+?\))/g, (match, altText, relativeUrl) => {
    // Prepend the CDN base URL to relative URLs
    const fullUrl = `${cdnBaseUrl}${relativeUrl}`
    return `${altText}(${fullUrl})`
  })

  // Step 3: Adjust relative paths in HTML tags within the Markdown content
  mdContent = mdContent.replace(/<(a|img|script|link|audio|video|source|e-html|e-svg|e-markdown|e-json|e-json-view|template\s+is="e-json"|template\s+is="e-wrapper")([^>]*)>/g, (match, tagName, attributes) => {
    if (tagName === 'a') {
      return match
    }
    if (tagName === 'e-json') {
      return match
    }
    if (/template\s+is="e-json"/.test(tagName)) {
      return match
    }

    // Replace relative URLs in href, src, and data-src attributes
    attributes = attributes.replace(/(href|src|data-src)="(\/[^"]+)"/g, (attrMatch, attribute, relativeUrl) => {
      // Prepend the CDN base URL to relative URLs
      const fullUrl = `${cdnBaseUrl}${relativeUrl}`
      return `${attribute}="${fullUrl}"`
    })

    return `<${tagName}${attributes}>`
  })

  // Step 4: Restore the skipped code blocks
  codeBlocks.forEach((codeBlock, index) => {
    mdContent = mdContent.replace(`___CODE_BLOCK_${index}___`, codeBlock);
  })

  return mdContent
}

/**
 * Recursively processes a directory, adjusting CDN URLs in HTML and Markdown files.
 *
 * @param {string} dirPath - The path to the directory to process.
 * @param {string} cdnBaseUrl - The base URL of the CDN to prepend to relative paths.
 * @returns {Promise<void>} Resolves when all files are processed.
 */
async function addCdnToUrsl(dirPath, cdnBaseUrl) {
  try {
    // Read all files and directories in the given directory
    const files = await fs.readdir(dirPath, { withFileTypes: true })

    // Process each file
    for (const file of files) {
      const fullPath = path.join(dirPath, file.name)

      if (file.isDirectory()) {
        // Recursively process directories
        await addCdnToUrsl(fullPath, cdnBaseUrl)
      } else if (file.isFile()) {
        const extname = path.extname(file.name).toLowerCase()

        if (extname === '.html' || extname === '.md') {
          // Process HTML and Markdown files
          const content = await fs.readFile(fullPath, 'utf8')
          let updatedContent

          if (extname === '.html') {
            updatedContent = await adjustPathsInHTML(content, cdnBaseUrl)
          } else if (extname === '.md') {
            updatedContent = await adjustPathsInMarkdown(content, cdnBaseUrl)
          }

          // Write the updated content back to the file
          await fs.writeFile(fullPath, updatedContent, 'utf8')
          console.log('CDN URLs added to file:', fullPath)
        }
      }
    }
  } catch (err) {
    console.error('Error processing files:', err)
  }
}

export default addCdnToUrsl

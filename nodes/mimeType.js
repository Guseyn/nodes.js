const path = require('path')
const mimeTypes = require('./mimeTypes')

/**
 * Determines the MIME type for a given file based on its extension.
 *
 * @param {string} file - The file name or path whose MIME type needs to be determined.
 * @returns {string} The corresponding MIME type if recognized; otherwise, the default MIME type (`text/plain`).
 *
 * @description
 * This function extracts the file extension from the provided file name or path and matches it
 * against a predefined list of MIME types. If the file extension is not recognized, it defaults to `text/plain`.
 */
module.exports = function mimeType(file) {
  const ext = path.extname(file)
  return mimeTypes[ext.toLowerCase().trim().split('.')[1]] || mimeTypes['txt']
}

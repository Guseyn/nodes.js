import path from 'path'
import mimeTypes from '#nodes/mimeTypes.js'

/**
 * Determines the MIME type for a given file based on its extension.
 *
 * @param {string} file - The file name or path whose MIME type needs to be determined.
 * @param {defaultMimeType} mimeTpye - The defaul mime type if it cannot be parsed or recognized from the path
 * @returns {string} The corresponding MIME type if recognized; otherwise, the default MIME type (`text/plain`).
 *
 * @description
 * This function extracts the file extension from the provided file name or path and matches it
 * against a predefined list of MIME types. If the file extension is not recognized, it defaults to `text/plain`.
 */
export default function mimeType(file, defaultMimeType) {
  const ext = path.extname(file)
  return mimeTypes[ext.toLowerCase().trim().split('.')[1]] || defaultMimeType || mimeTypes['txt']
}

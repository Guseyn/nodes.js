import path from 'path'
import mimeTypesImport from '#nodes/mimeTypes.js'

/** @type {import('#nodes/types.js').MimeTypeMap} */
const mimeTypes = mimeTypesImport

/**
 * Determines the MIME type for a given file based on its extension.
 *
 * @param {string} file - The file name or path whose MIME type needs to be determined.
 * @param {string} defaultMimeType
 * @returns {string} The corresponding MIME type if recognized; otherwise, the default MIME type (`text/plain`).
 *
 * @description
 * This function extracts the file extension from the provided file name or path and matches it
 * against a predefined list of MIME types. If the file extension is not recognized, it defaults to `text/plain`.
 */
export default function mimeType(file, defaultMimeType) {
  if (!file || !defaultMimeType) {
    return mimeTypes['txt']
  }
  const ext = path.extname(file)
  if (!ext) {
    return mimeTypes['txt']
  }
  const extension = ext.toLowerCase().trim().slice(1)
  if (!extension) {
    return defaultMimeType || mimeTypes['txt']
  }
  return mimeTypes[extension] || defaultMimeType || mimeTypes['txt']
}

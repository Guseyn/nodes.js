/**
 * Initializes the app.
 * @param {Object} params - The parameters for the app.
 * @param {Object} params.api - The API configuration.
 * @param {Object} params.static - The static files configuration.
 * @param {string} params.indexFile - The path to the index file.
 * @param {Object} params.deps - The dependencies.
 * @returns {Object} The app configuration.
 */
export default function app({
  api,
  static: staticFiles,
  indexFile,
  deps
}) {
  return {
    api,
    static: staticFiles,
    indexFile,
    deps
  }
}

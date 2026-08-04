/**
 * Initializes the app.
 * @param {import('./types.js').NodesAppParams} params
 * @returns {import('./types.js').NodesApp}
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

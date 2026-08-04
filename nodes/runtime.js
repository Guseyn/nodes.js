/**
 * Typed view of Node globals assigned at startup (`config`, `log`).
 * @typedef {import('./types.js').NodesRuntimeConfig} NodesRuntimeConfig
 */

/**
 * @typedef {Object} NodesRuntime
 * @property {function(...*): void} log
 * @property {NodesRuntimeConfig} config
 */

/** @type {NodesRuntime} */
const runtime = /** @type {NodesRuntime} */ (/** @type {unknown} */ (globalThis))

if (typeof runtime.log !== 'function') {
  runtime.log = (...args) => console.log(...args)
}

export default runtime

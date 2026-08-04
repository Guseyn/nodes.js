/**
 * Shared JSDoc types for the nodes.js HTTP/2 framework.
 * @module
 */

/**
 * @typedef {Object} NodesRequestStream
 * @property {function(string, function): any} on
 * @property {function(...*): void} respond
 * @property {function(...*): void} end
 * @property {boolean} [destroyed]
 * @property {boolean} [closed]
 * @property {boolean} [writableEnded]
 * @property {boolean} [aborted]
 * @property {boolean} [_hasResponded]
 * @property {boolean} [_hasEnded]
 * @property {RequestHeaders} [headers]
 * @property {function(number, function(): void): void} [setTimeout]
 * @property {function(Object, function(Error): void): void} [pushStream]
 */

/**
 * @typedef {Object.<string, string|string[]>} RequestHeaders
 */

/**
 * @typedef {Object.<string, string|number|boolean>} ResponseHeaders
 */

/**
 * @typedef {Object.<string, string>} UrlParams
 */

/**
 * @typedef {Object.<string, string>} UrlQueries
 */

/**
 * @typedef {Object} CorsOptions
 * @property {boolean} [useCors]
 * @property {string|string[]} [allowedOrigins]
 * @property {string|string[]} [allowedMethods]
 * @property {string|string[]} [allowedHeaders]
 * @property {boolean} [allowedCredentials]
 * @property {number} [maxAge]
 */

/**
 * @typedef {Object} EndpointHandlerContext
 * @property {NodesRequestStream} stream
 * @property {RequestHeaders} headers
 * @property {UrlParams} params
 * @property {UrlQueries} queries
 * @property {any} [config]
 * @property {NodesAppDeps} deps
 */

/**
 * @typedef {function(EndpointHandlerContext): (void|Promise<void>)} EndpointHandlerFn
 */

/**
 * @typedef {Object} NodesRoutable
 * @property {string|RegExp} urlPattern
 * @property {string} [method]
 * @property {boolean} [useCors]
 * @property {string|string[]} [allowedOrigins]
 */

/**
 * @typedef {Object} NodesEndpoint
 * @property {string|RegExp} urlPattern
 * @property {string} method
 * @property {EndpointHandlerFn} handler
 * @property {boolean} [useCors]
 * @property {string|string[]} [allowedOrigins]
 * @property {string[]} [allowedMethods]
 * @property {string|string[]} [allowedHeaders]
 * @property {boolean} [allowedCredentials]
 * @property {number} [maxAge]
 * @property {string} [type]
 */

/**
 * @typedef {Object} NodesSrc
 * @property {string|RegExp} urlPattern
 * @property {function(string, string): string} [mapper]
 * @property {string} [baseFolder]
 * @property {string} [fileNotFound]
 * @property {string} [fileNotAccessible]
 * @property {boolean} [useGzip]
 * @property {boolean} [useCache]
 * @property {string} [cacheControl]
 * @property {boolean} [useCors]
 * @property {string[]} [allowedOrigins]
 * @property {string[]} [allowedMethods]
 * @property {string[]} [allowedHeaders]
 * @property {boolean} [allowedCredentials]
 * @property {number} [maxAge]
 * @property {string} [method]
 */

/**
 * @typedef {Object} NodesAppDeps
 * @property {Object} [dbClient]
 * @property {Object} [emailClient]
 * @property {Object} [stripeClient]
 */

/**
 * @typedef {Object} NodesApp
 * @property {NodesEndpoint[]} [api]
 * @property {NodesSrc[]} [static]
 * @property {string} [indexFile]
 * @property {NodesAppDeps} deps
 * @property {any} [config]
 */

/**
 * @typedef {Object} NodesAppParams
 * @property {NodesEndpoint[]} api
 * @property {NodesSrc[]} static
 * @property {string} indexFile
 * @property {NodesAppDeps} deps
 */

/**
 * @typedef {Object} ClusterOptions
 * @property {number} [numberOfWorkers]
 * @property {number} restartTime
 * @property {any} config
 * @property {string} [logFile]
 */

/**
 * @typedef {Object} RegisteredJob
 * @property {string} name
 * @property {number} everyMins
 * @property {function(Object): (void|Promise<void>)} fn
 * @property {NodesAppDeps} deps
 * @property {boolean} [runOnStart]
 */

/**
 * @typedef {Object} StreamFileOptions
 * @property {string} file
 * @property {NodesRequestStream} stream
 * @property {string} requestMethod
 * @property {string} requestAuthority
 * @property {string} [requestRange]
 * @property {import('fs').Stats} stats
 * @property {number} status
 * @property {boolean} [useGzip]
 * @property {boolean} [useCache]
 * @property {string} [cacheControl]
 * @property {string} [lastModified]
 * @property {boolean} [useCors]
 * @property {string[]} [allowedOrigins]
 * @property {string[]} [allowedMethods]
 * @property {string[]} [allowedHeaders]
 * @property {boolean} [allowedCredentials]
 * @property {number} [maxAge]
 */

/**
 * @typedef {Object} CorsHandlerOptions
 * @property {NodesRequestStream} stream
 * @property {RequestHeaders} headers
 * @property {boolean} [useCors]
 * @property {string|string[]} [allowedOrigins]
 * @property {string[]} [allowedMethods]
 * @property {string|string[]} [allowedHeaders]
 * @property {boolean} [allowedCredentials]
 * @property {number} [maxAge]
 * @property {string} requestAuthority
 * @property {string} requestMethod
 */

/**
 * @typedef {Object} BodyOptions
 * @property {number} [maxSize]
 */

/**
 * @typedef {Object} StreamHandlerOptions
 * @property {NodesRequestStream} stream
 */

/**
 * @typedef {Object} ProxyServerOptions
 * @property {number} proxyPort
 * @property {string} host
 * @property {number} port
 */

/**
 * Runtime config assigned to `runtime.config` by cluster/server (app-specific shape).
 * @typedef {Object} NodesRuntimeConfig
 * @property {string} [host]
 * @property {number} [port]
 * @property {string} [cert]
 * @property {string} [key]
 * @property {string} [tmpKey]
 * @property {string} [tmpCert]
 * @property {string} [webroot]
 * @property {{ port?: number }} [proxy]
 */

/**
 * @typedef {Object.<string, string>} MimeTypeMap
 */

export {}

import http2 from 'http2'
import fs from 'fs'
import tls from 'tls'

import handleRequests from '#nodes/handleRequests.js'
import { logSymbols } from '#nodes/setupFileLogging.js'

import proxyServer from '#nodes/proxyServer.js'

import emulateStreamForHttp1 from '#nodes/emulateStreamForHttp1.js'
import runtime from '#nodes/runtime.js'

/**
 * Creates and configures an HTTP/2 server with optional HTTP/1.1 support and proxy setup.
 *
 * @param {import('./types.js').NodesApp} app
 * @returns {function(): void}
 */
export default function server(app) {

  app.config = runtime.config

  const { keyFile, certFile } = resolveTlsFiles()

  runtime.log(`${logSymbols.arrow} Checking certificate and key files...`)
  
  runtime.config.host = runtime.config.host || 'localhost'
  runtime.config.port = runtime.config.port || 8004

  const key = fs.readFileSync(keyFile)
  const cert = fs.readFileSync(certFile)

  const server = http2.createSecureServer({
    key,
    cert,
    SNICallback: (servername, callback) => {
      const { keyFile: sniKeyFile, certFile: sniCertFile } = resolveTlsFiles()
      const ctx = tls.createSecureContext({
        key: fs.readFileSync(sniKeyFile),
        cert: fs.readFileSync(sniCertFile)
      })
      callback(null, ctx)
    },
    allowHTTP1: true
  }, async (req, res) => {
    if (req.httpVersion === '2.0') {
      // we can go to server.on('stream') event
      return
    }
    const stream = emulateStreamForHttp1(
      /** @type {import('node:http').IncomingMessage} */ (/** @type {unknown} */ (req)),
      /** @type {import('node:http').ServerResponse} */ (/** @type {unknown} */ (res))
    )
    try {
      await handleRequests(app, stream, /** @type {import('./types.js').RequestHeaders} */ (stream.headers))
    } catch (err) {
      runtime.log(`${logSymbols.err} Handler crashed:`, err)
      const typedStream = /** @type {import('./types.js').NodesRequestStream} */ (/** @type {unknown} */ (stream))
      if (!typedStream.destroyed) {
        typedStream.respond({ ':status': 500 })
        typedStream.end('Internal error')
      }
    }
  })

  server.on('stream', async (stream, headers) => {
    try {
      await handleRequests(
        app,
        /** @type {import('./types.js').NodesRequestStream} */ (/** @type {unknown} */ (stream)),
        /** @type {import('./types.js').RequestHeaders} */ (headers)
      )
    } catch (err) {
      runtime.log(`${logSymbols.err} Handler crashed:`, err)
      const typedStream = /** @type {import('./types.js').NodesRequestStream} */ (/** @type {unknown} */ (stream))
      if (!typedStream.destroyed) {
        typedStream.respond({ ':status': 500 })
        typedStream.end('Internal error')
      }
    }
  })

  process.on('exit', () => {
    if (server.listening) {
      runtime.log(`${logSymbols.arrow} Server on worker ${process.pid} is about to be closed`)
      server.close()
    }
  })

  process.on('message', (message) => {
    if (message === 'Message from Primary Process: Exit your process with code 0 to restart it again.') {
      process.exit(0)
    }
  })

  return function serverListener() {
    server.listen({
      host: runtime.config.host,
      port: runtime.config.port
    }, () => {
      runtime.log(`${logSymbols.arrow} HTTP/2 server running at https://${runtime.config.host}:${runtime.config.port} (process ${process.pid})`)
    })
    if (process.env.ENV) {
      const itIsProd = process.env.ENV.startsWith('prod')
      if (itIsProd && (!runtime.config.proxy || !runtime.config.proxy.port)) {
        throw new Error(`${logSymbols.err} In prod environment you must specifiy a port for HTTP proxy server in cofing with key: \`proxy: { port: <value> }\``)
      }
      if (
        itIsProd &&
        runtime.config.proxy &&
        runtime.config.proxy.port &&
        runtime.config.host &&
        runtime.config.port
      ) {
        proxyServer({
          proxyPort: runtime.config.proxy.port,
          host: runtime.config.host,
          port: runtime.config.port
        })()
      }
    }
  }
}

/**
 * @returns {{ keyFile: string, certFile: string }}
 */
function resolveTlsFiles() {
  const cert = runtime.config.cert || ''
  const key = runtime.config.key || ''
  const certAndKeyExists = Boolean(
    cert &&
    key &&
    fs.existsSync(cert) &&
    fs.existsSync(key) &&
    fs.statSync(cert).size !== 0 &&
    fs.statSync(key).size !== 0
  )

  return {
    keyFile: certAndKeyExists ? key : (runtime.config.tmpKey || ''),
    certFile: certAndKeyExists ? cert : (runtime.config.tmpCert || '')
  }
}

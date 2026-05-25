import http2 from 'http2'
import fs from 'fs'
import tls from 'tls'

import handleRequests from '#nodes/handleRequests.js'
import readSecrets from '#nodes/readSecrets.js'

import proxyServer from '#nodes/proxyServer.js'

import emulateStreamForHttp1 from '#nodes/emulateStreamForHttp1.js'

/**
 * Creates and configures an HTTP/2 server with optional HTTP/1.1 support and proxy setup.
 *
 * @param {Object} app - The application configuration object.
 * @returns {Function} A function to start the server listener.
 *
 * @description
 * This function sets up an HTTP/2 server with SSL/TLS support, optional HTTP/1.1 compatibility,
 * and dynamic configuration for certificates. It handles incoming requests with a unified request
 * handler and domain-based error isolation. It also supports a fallback proxy server for production environments.
 */
export default function server(app) {

  app.config = global.config

  const certAndKeyExists = fs.existsSync(global.config.cert) &&
    fs.existsSync(global.config.key) &&
    fs.statSync(global.config.cert).size !== 0 &&
    fs.statSync(global.config.key).size !== 0
  const keyFile = certAndKeyExists ? global.config.key : global.config.tmpKey
  const certFile = certAndKeyExists ? global.config.cert : global.config.tmpCert
  global.log('🔐 Checking certificate and key files...')
  
  global.config.host = global.config.host || 'localhost'
  global.config.port = global.config.port || 8004

  const key = fs.readFileSync(keyFile)
  const cert = fs.readFileSync(certFile)

  const server = http2.createSecureServer({
    key,
    cert,
    SNICallback: (servername, callback) => {

      const certAndKeyExists = fs.existsSync(global.config.cert) &&
        fs.existsSync(global.config.key) &&
        fs.statSync(global.config.cert).size !== 0 &&
        fs.statSync(global.config.key).size !== 0

      const keyFile = certAndKeyExists ? global.config.key : global.config.tmpKey
      const certFile = certAndKeyExists ? global.config.cert : global.config.tmpCert
      const ctx = tls.createSecureContext({
        key: fs.readFileSync(keyFile),
        cert: fs.readFileSync(certFile)
      })
      callback(null, ctx)
    },
    allowHTTP1: true
  }, async (req, res) => {
    if (req.httpVersion === '2.0') {
      // we can go to server.on('stream') event
      return
    }
    const stream = emulateStreamForHttp1(req, res)
    try {
      await handleRequests(app, stream, stream.headers)
    } catch (err) {
      global.log('❌ Handler crashed:', err)
      if (!stream.destroyed) {
        stream.respond({ ':status': 500 })
        stream.end('Internal error')
      }
    }
    // res.writeHead(426, {
    //   'upgrade': 'HTTP/2.0',
    //   'content-type': 'text/plain'
    // })
    // res.end('Please upgrade to HTTP/2')
  })

  server.on('stream', async (stream, headers) => {
    try {
      await handleRequests(app, stream, headers)
    } catch (err) {
      global.log('❌ Handler crashed:', err)
      if (!stream.destroyed) {
        stream.respond({ ':status': 500 })
        stream.end('Internal error')
      }
    }
  })

  process.on('exit', () => {
    if (server.listening) {
      global.log(`🧹 Server on worker ${process.pid} is about to be closed`)
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
      host: global.config.host,
      port: global.config.port
    }, () => {
      global.log(`🌐 HTTP/2 server running at 🔗 https://${global.config.host}:${global.config.port} in ⚙ process ${process.pid} ⚙`)
    })
    if (process.env.ENV) {
      const itIsProd = process.env.ENV.startsWith('prod')
      if (itIsProd && !global.config.proxy.port) {
        throw new Error('❌ In prod environment you must specifiy a port for HTTP proxy server in cofing with key: `proxy: { port: <value> }`')
      }
      if (itIsProd) {
        proxyServer({
          proxyPort: global.config.proxy.port,
          host: global.config.host,
          port: global.config.port,
          webroot: global.config.webroot
        })()
      }
    }
  }
}

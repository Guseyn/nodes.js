const http2 = require('http2')
const fs = require('fs')
const domain = require('domain')
const tls = require('tls')
const cluster = require('cluster')

const handleRequests = require('./handleRequests')
const constructDomain = require('./constructDomain')
const readSecrets = require('./readSecrets')

const proxyServer = require('./proxyServer')

module.exports = function server(app) {
  global.config.key = global.config.key || 'key.pem'
  global.config.cert = global.config.cert || 'cert.pem'
  global.config.host = global.config.host || 'localhost'
  global.config.port = global.config.port || 8004

  const server = http2.createSecureServer({
    key: fs.readFileSync(global.config.key),
    cert: fs.readFileSync(global.config.cert),
    SNICallback: (servername, callback) => {
      const ctx = tls.createSecureContext({
        key: fs.readFileSync(global.config.key),
        cert: fs.readFileSync(global.config.cert)
      })
      callback(null, ctx)
    }
  })

  server.on('stream', (stream, headers) => {
    constructDomain(server, stream).run(async () => {
      app.config = global.config
      await handleRequests(app, stream, headers)
    })
  })

  process.on('exit', () => {
    if (server.listening) {
      global.log(`server on worker ${process.pid} is about to be closed`)
      server.close()
    }
  })

  process.on('message', (message) => {
    if (message === 'Message from Primary Process: Exit your process with code 0 to restart it again.') {
      process.exit(0)
    }
  })
  
  return function serverListener() {
    server.listen(global.config.port, global.config.host, () => {
      global.log(`HTTP/2 server running at https://${global.config.host}:${global.config.port}`)
    })
    if (process.env.ENV) {
      const itIsProd = process.env.ENV.startsWith('prod')
      if (itIsProd && !global.config.proxy.port) {
        throw new Error('In prod environment you must specifiy a port for HTTP proxy server in cofing with key: `proxy: { port: <value> }`')
      }
      if (itIsProd) {
        proxyServer(
          global.config.host,
          global.config.proxy.port
        )()
      }
    }
  }
}

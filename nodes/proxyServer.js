import http from 'http'
import url from 'url'
import fs from 'fs'

const acmeChallengeUrlPattern = /^\/\.well-known\/acme-challenge/

/**
 * Creates an HTTP proxy server that handles ACME challenges and redirects other traffic to HTTPS.
 *
 * @param {Object} options - Configuration options for the proxy server.
 * @param {number} options.proxyPort - The port on which the proxy server will listen.
 * @param {string} options.host - The hostname or IP address for the proxy server.
 * @param {number} options.port - The port for redirecting traffic to HTTPS.
 * @param {string} options.webroot - The root directory for serving ACME challenge files.
 * @returns {Function} A function that starts the proxy server.
 *
 * @description
 * This proxy server performs two primary functions:
 * 1. Handles ACME challenge requests for HTTPS certificate validation. The ACME challenge files
 *    are served from the specified `webroot`.
 * 2. Redirects all other HTTP traffic to the HTTPS endpoint on the specified port.
 */
export default function proxyServer({
  proxyPort,
  host,
  port,
  webroot
}) {
  const server = http.createServer((req, res) => {
    let reqUrl = req.url
    if (req.url === '/') {
      reqUrl = ''
    }
    const reqHost = req.headers.host
    // Acme Challenge for HTTPS setup 
    if (acmeChallengeUrlPattern.test(req.url)) {
      try {
        const parsedUrl = url.parse(req.url, true)
        const challengeFile = `${global.config.webroot}/${parsedUrl.pathname}`
        if (!fs.existsSync(challengeFile)) {
          console.log(challengeFile)
          res.writeHead(404, {
            'content-type': 'text/plain'
          })
          res.end(`${challengeFile} not found`)
          return
        }
        res.writeHead(200, {
          'content-type': 'text/plain'
        })
        const token = fs.readFileSync(challengeFile)
        res.end(token)
      } catch (err) {
        console.log(err)
        res.writeHead(500, {
          'content-type': 'text/plain'
        })
        res.end()
      }
      return
    }
    // Proxy Logic
    res.writeHead(301, {
      'Location': `https://${reqHost}:${port}${reqUrl}`
    })
    if (!res.writableEnded && !res.destroyed) {
      res.end()
    }
  })
  return function serverListener() {
    server.listen({
      host: host,
      port: proxyPort
    }, () => {
      global.log(`HTTP proxy server running at http://${host}:${proxyPort}`)
    })
  }
}

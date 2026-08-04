import http from 'http'
import url from 'url'
import fs from 'fs'
import runtime from '#nodes/runtime.js'

const acmeChallengeUrlPattern = /^\/\.well-known\/acme-challenge/

/**
 * @param {import('./types.js').ProxyServerOptions} options
 * @returns {function(): void}
 */
export default function proxyServer({
  proxyPort,
  host,
  port
}) {
  const server = http.createServer((req, res) => {
    const requestUrl = req.url || ''
    let reqUrl = requestUrl
    if (requestUrl === '/') {
      reqUrl = ''
    }
    const reqHost = req.headers.host
    // Acme Challenge for HTTPS setup 
    if (acmeChallengeUrlPattern.test(requestUrl)) {
      try {
        const parsedUrl = url.parse(requestUrl, true)
        const pathname = parsedUrl.pathname || ''
        const challengeFile = `${runtime.config.webroot}/${pathname}`
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
      runtime.log(`HTTP proxy server running at http://${host}:${proxyPort}`)
    })
  }
}

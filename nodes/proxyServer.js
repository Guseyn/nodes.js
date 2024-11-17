const http = require('http')
const url = require('url')
const fs = require('fs')

const acmeChallengeUrlPattern = /^\/\.well-known\/acme-challenge/

module.exports = function proxyServer({
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

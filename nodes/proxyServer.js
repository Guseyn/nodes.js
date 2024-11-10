const http = require('http')
const url = require('url')
const fs = require('fs')

const acmeChallengeUrlPattern = /^\/\.well-known\/acme-challenge/

module.exports = function proxyServer(
  targetServerHost, targetServerPort
) {
  const server = http.createServer((req, res) => {
    let reqUrl = req.url
    if (req.url === '/') {
      reqUrl = ''
    }
    // Acme Challenge for HTTPS setup 
    if (acmeChallengeUrlPattern.test(req.url)) {
      const url = request.url
      res.writeHead(200, {
        'content-type': 'text/plain'
      })
      try {
        const parsedUrl = url.parse(req.url, true)
        const token = fs.readFilySync(parsedUrl.pathname)
        res.end(token)
      } catch (err) {
        res.end()
      }
      return
    }
    // Proxy Logic
    res.writeHead(301, {
      'Location': `https://${targetServerHost}:${targetServerPort}${reqUrl}`
    })
    if (!res.writableEnded && !res.destroyed) {
      console.log('okokoko')
      res.end()
    }
  })
  return function serverListener() {
    server.listen(8005, targetServerHost, () => {
      console.log(`HTTP proxy server running at http://0.0.0.0:80`)
    })
  }
}

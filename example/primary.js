const fs = require('fs')

const txtLogo = fs.readFileSync('./logo.txt', 'utf-8')

console.log(`\x1b[33m${txtLogo}\x1b[0m`)

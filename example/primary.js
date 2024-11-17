const fs = require('fs')

const txtLogo = fs.readFileSync('./logo.txt', 'utf-8')
const version = JSON.parse(fs.readFileSync('./package.json', 'utf-8')).version
const environment = process.env.ENV

const path = require('path')

// global.log(`\x1b[33m${txtLogo}\n\nversion: ${version}, environment: ${environment}\x1b[0m`)

const updateCacheVersionsInUrls = require('./../nodes/updateCacheVersionsInUrls')

updateCacheVersionsInUrls(path.join('example', 'static'))

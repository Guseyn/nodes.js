import fs from 'fs'
import path from 'path'

const txtLogo = fs.readFileSync('./logo.txt', 'utf-8')
const version = JSON.parse(fs.readFileSync('./package.json', 'utf-8')).version
const environment = process.env.ENV

// global.log(`\x1b[33m${txtLogo}\n\nversion: ${version}, environment: ${environment}\x1b[0m`)

import updateCacheVersionsInUrls from './../nodes/updateCacheVersionsInUrls.js'

updateCacheVersionsInUrls(path.join('example', 'static'))

const fs = require('fs')

const cluster = require('./../nodes/cluster')

process.env.ENV = process.env.ENV || 'local'

const numberOfWorkers = 2
const restartTime = 2
const config = JSON.parse(
  fs.readFileSync(
    `./example/env/${process.env.ENV}.json`
  )
)
let logFile = './output.log'
if (process.env.ENV === 'prod') {
  logFile = './output.log'
}

cluster('example/primary.js', 'example/worker.js')({
  numberOfWorkers,
  restartTime,
  config,
  logFile
})

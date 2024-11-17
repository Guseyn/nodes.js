const fs = require('fs')
const { execSync } = require('child_process')

module.exports = function setupFileLogging(logFile) {
  execSync(`touch ${logFile}`)
  const logFileStream = fs.createWriteStream(logFile, { flags: 'a' })
  global.log = function log(...message) {
    logFileStream.write(`${new Date().toISOString()} - worker (pid:${process.pid}) - ${message}\n`);
  }
  process.on('exit', () => logFileStream.end())
}

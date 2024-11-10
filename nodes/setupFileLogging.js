const fs = require('fs')

module.exports = function setupFileLogging(logFile) {
  const logFileStream = fs.createWriteStream(logFile, { flags: 'a' })
  global.log = function log(...message) {
    logFileStream.write(`${new Date().toISOString()} - worker (pid:${process.pid}) - ${message}\n`);
  }
  process.on('exit', () => logFileStream.end())
}

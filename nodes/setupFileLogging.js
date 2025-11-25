import fs from 'fs'
import { execSync } from 'child_process'

/**
 * Sets up file-based logging for the application.
 *
 * @param {string} logFile - The path to the log file where logs will be written.
 * @returns {void}
 *
 * @description
 * This function initializes file-based logging by:
 * 1. Ensuring the log file exists (or creating it if it does not).
 * 2. Redirecting global logging (`global.log`) to append messages to the log file.
 * 3. Automatically closing the log file stream when the process exits.
 */
export default function setupFileLogging(logFile) {
  if (!logFile) {
    global.log = console.log
    return
  }
  execSync(`touch ${logFile}`)
  const logFileStream = fs.createWriteStream(logFile, { flags: 'a' })
  global.log = function log(...message) {
    logFileStream.write(`${new Date().toISOString()} - worker (pid:${process.pid}) - ${message.join(' ')}\n`);
  }
  process.on('exit', () => logFileStream.end())
}

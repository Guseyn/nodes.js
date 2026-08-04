import fs from 'fs'
import { execSync } from 'child_process'
import runtime from '#nodes/runtime.js'

const reset = '\x1b[0m'

/**
 * @param {number} code
 * @param {string} glyph
 */
function color(code, glyph) {
  return `\x1b[${code}m${glyph}${reset}`
}

export const logSymbols = {
  ok: color(32, '✓'),
  err: color(31, '✗'),
  warn: color(33, '⚠'),
  arrow: color(36, '→'),
  retry: color(35, '↻')
}

const ANSI_RE = /\x1b\[[0-9;]*m/g

/**
 * @param {any} str
 */
export function stripAnsi(str) {
  return String(str).replace(ANSI_RE, '')
}

/**
 * Sets up file-based logging for the application.
 *
 * @param {string} logFile - The path to the log file where logs will be written.
 * @returns {void}
 *
 * @description
 * This function initializes file-based logging by:
 * 1. Ensuring the log file exists (or creating it if it does not).
 * 2. Redirecting global logging (`runtime.log`) to append messages to the log file.
 * 3. Automatically closing the log file stream when the process exits.
 */
export default function setupFileLogging(logFile) {
  if (!logFile) {
    runtime.log = console.log
    return
  }
  execSync(`touch ${logFile}`)
  const logFileStream = fs.createWriteStream(logFile, { flags: 'a' })
  runtime.log = function log(...message) {
    const plain = message.map((part) => stripAnsi(part)).join(' ')
    logFileStream.write(`${new Date().toISOString()} - worker (pid:${process.pid}) - ${plain}\n`)
  }
  process.on('exit', () => logFileStream.end())
}

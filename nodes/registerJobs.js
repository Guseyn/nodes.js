import { logSymbols } from '#nodes/setupFileLogging.js'

/**
 * @param {import('./types.js').RegisteredJob} job
 * @param {boolean} [isStart]
 * @param {function(...*): void} [log]
 */
async function runJob(job, isStart = false, log = console.log) {
  const { name, everyMins, fn, deps, runOnStart } = job

  if (isStart && runOnStart) {
    log(`${logSymbols.arrow} [${name}] Running at startup...`)
    try {
      await fn(deps)
    } catch (err) {
      log(`${logSymbols.err} [${name}] Error during startup run:`, err)
    }
  }

  setTimeout(async function runner() {
    log(`${logSymbols.arrow} [${name}] Executing job...`)
    try {
      await fn(deps)
      log(`${logSymbols.ok} [${name}] Job completed.`)
    } catch (err) {
      log(`${logSymbols.err} [${name}] Job failed:`, err)
    }

    runJob(job, false, log) // schedule next run
  }, everyMins * 60 * 1000)
}

/**
 * @param {import('./types.js').RegisteredJob[]} jobs
 * @param {function(...*): void} [log]
 */
async function registerJobs(jobs, log = console.log) {
  for (const job of jobs) {
    log(`${logSymbols.arrow} Registering job: ${job.name} (every ${job.everyMins} minutes)`)
    await runJob(job, true, log)
  }
}

export default registerJobs

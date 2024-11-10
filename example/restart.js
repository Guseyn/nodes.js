const fs = require('fs')

const primaryProcessId = fs.readFileSync('primary.pid', 'utf-8') 
const version = JSON.parse(fs.readFileSync('./package.json', 'utf-8')).version
const environment = process.env.ENV

process.kill(primaryProcessId, 'SIGUSR1')
console.log(
`
We just sent SIGUSR1 to the primary process with pid: ${primaryProcessId}.
Version: ${version}, environment: ${environment}.

Then primary process will send message to its subprocesses to exit with code 0.
It will restart them (gracefully and with timeout one by one).
That will allow to reach zero downtime while we restarting the application with new codebase.
`
)

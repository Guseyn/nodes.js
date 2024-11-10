![nodes.js](logo.svg)

[![nodes.js CI](https://github.com/Guseyn/nodes.js/actions/workflows/nodes.yml/badge.svg?branch=main)](https://github.com/Guseyn/nodes.js/actions/workflows/nodes.yml)

NodeJS Procedural Backend Framework with Cluster API based on HTTP/2. Zero dependencies, super simple, you can hack it!

## Why do we need another framework for Node.js?

This is my wish list:

1. I want to build my web application on a framework with zero dependencies.
1. I want to utilize native Node.js APIs without any additional layers of abstractions.
1. I want to hack my framework when I need to, e.i. I want to have quick access to my framework's folder and make quick changes.
1. I want to have zero downtime when I update my appliction's logic just by sending a signal.
1. I want to use [Cluster](https://nodejs.org/api/cluster.html) in Node.js. It will allow me to scale my application with very little price. I also don't want to anything else for orchestration and other fancy things that Node.js provdes itlself.
1. I want to have HTTP/2 as a default.
1. I want to handle 500 User error properly.
1. I want to configure my application out of box in my primary and worker processes.
1. I want to have very simple secrets reader.
1. I want to be able to log into an output log file.
1. I want to have composable API provided by my framework and not use middlewares that reduces the code clarity. I want to be able to copy/paste logic to achieve clarity.
1. I want to have access to `params` and `queries` in each request URL.
1. I want to have control when I read `body` of my requests.
1. I want to have quick access to my external dependecies like db clients and other integrations without attaching them to `request` object. I want to have dependecy injection without any huge frameworks.
1. I want to easily configure my `index.html`, `not-found.html` files.
1. **I want to focus on building my products quicky and make money.**

## How it works

After you clone this repository, you can create `app` directory alongside with `nodes` folder in the root. 

### main.js

Create `main.js` file in you application where you declare cluster api with two scripts: primary and worker scripts:

```js
const cluster = require('./../nodes/cluster')

process.env.ENV = process.env.ENV || 'local'

const config = JSON.parse(
  fs.readFileSync(
    `./example/env/${process.env.ENV}.json`
  )
)

cluster('example/primary.js', 'example/worker.js')({ config })
```

In this case it's `example` application, which you can rename it. You also must provide `config` object.

The most practical way is to create `env` folder with `local.json` and let's say `prod.json` files and load it depending on the environment (`ENV`).

Config at least must contain following values:

```json
{
  "host": "1.0.12.0",
  "port": 8004,
  "key": "./ssl/key.pem",
  "cert": "./ssl/cert.pem"
}
```

It's worth mentioning that we need SSL files:  `./ssl/key.pem`, `./ssl/cert.pem` because HTTP/2 uses HTTPS. For local environment you can generate those keys, for production you can use [Let's Encrypt](https://letsencrypt.org/).

By default, you get a worker for each core on your machine. You can also specify the number of workers:

```js
const cluster = require('./../nodes/cluster')

const numberOfWorkers = 2
const config = JSON.parse(
  fs.readFileSync(
    `./example/env/${process.env.ENV}.json`
  )
)

cluster('example/primary.js', 'example/worker.js')({ numberOfWorkers, config })
```

Config file eventually will be avaible via `global.config` in your `primary.js` and `worker.js`.

You can also write all your logs to file by adding `logFile` property:

```js
const cluster = require('./../nodes/cluster')

process.env.ENV = process.env.ENV || 'local'

const config = JSON.parse(
  fs.readFileSync(
    `./example/env/${process.env.ENV}.json`
  )
)

const logFile = 'output.log'

cluster('example/primary.js', 'example/worker.js')({ config, logFile })
```

Logs in the file have following format:

```
2024-11-09T15:21:03.885Z - worker (pid:35119) - HTTP/2 server running at https://1.0.12.0:8004
2024-11-09T15:21:03.885Z - worker (pid:35120) - HTTP/2 server running at https://1.0.12.0:8004
```

Use `global.log()` function to write logs to file. By default, this function writes to console.

### primary.js

Your `primary.js` can be used for running other processes, if you need something more than just a server application. In our case we can leave it empty:

```js
// primary.js

// console.log('this is executed in primary process')

// we can use global.config, global.log()
```

### worker.js

Your `worker.js` creates a server applicaiton. The API has following composable structure:

```js
// worker.js

// we can use global.config, global.log()

server(
  app({
    indexFile: './example/static/html/index.html',
    api: [
      endpoint(),
      ...
    ],
    static: [
      src(),
      ...
    ],
    deps: {}
  })
)()
``` 

Your `server` incapsulates `app` which is just an object with `api`, `static`, `deps` properties. Your `api` is a list of endpoints (`endpoint()[]`) and your `static` property is responsible for public sources (`src()[]`).

### Index File

Property `indexFile` allows to specify default HTML file for index route `/`.

### API

In property `api` you can declare your endpoints:

```js
const api = [
  endpoint('/', 'GET', ({ stream }) => {
    stream.respond({
      status: 200,
      'content-type': 'text/plain'
    })
    stream.end('This index page.')
  })
]

server(
  app({ api })
)()
```

First argument is a pattern of your URL that must match for the endpoint to be invoked. You can also use RegExp. Second argument is method. You can also declare multiple methods: 'GET,OPTIONS'. Third argument is a callback which is being invoked when the endpoint matches a user's request.

In the endpoint callback, you can also use incoming headers:

```js
const api = [
  endpoint('/', 'GET', ({ stream, headers }) => {
    if (headers['token'] === 'secret token') {
      stream.respond({
        status: 200,
        'content-type': 'text/plain'
      })
      stream.end('This index page.')
      return
    }
    stream.respond({
      status: 401,
      'content-type': 'text/plain'
    })
    stream.end('401 Not Authorized.')
  })
]

server(
  app({ api })
)()
````

You can also easily get all urls' params and queries:

```js
const api = [
  endpoint('/sum/:p1/:p2?q1&q2', 'GET', ({ stream, params, queries }) => {
    const sum = params['p1'] * 1 + params['p2'] * 1 + queries['q1'] * 1 + queries['q2'] * 1

    stream.respond({
      status: 200,
      'content-type': 'text/plain'
    })
    stream.end(`Sum of numbers in url: ${sum}`)
  })
]

server(
  app({ api })
)()
```

You can also easily read whole body of your request via a function `body()` provided by the framework:


```js
const body = require('./../nodes/body')

const api = [
  endpoint('/echo', 'POST', async ({ stream }) => {
    const reqBody = JSON.parse(
      await body(stream).toString('utf-8')
    )
    stream.respond({
      status: 200,
      'content-type': 'application/json'
    })
    stream.end(JSON.stringify(reqBody))
  })
]

server(
  app({ api })
)()
```

You can access to config (which is also accessible via `global.config`):

```js
const api = [
  endpoint('/', 'GET', ({ stream, config }) => {
    stream.respond({
      status: 200,
      'content-type': 'text/plain'
    })
    stream.end(`Some config value: ${config['key']}`)
  })
]

server(
  app({ api })
)()
```

And this is how you can enable CORS for an endpoint:

```js
const handler = ({
  stream, config
}) => {
  stream.respond({
    status: 200,
    'content-type': 'text/plain'
  })
  stream.end(`Some config value: ${config['key']}`)
}

const corsOptions = {
  cacheControl: 'cache, public, max-age=432000',
  allowedOrigins: [ '1.0.12.220', '1.0.12.1:8004' ], // can also be just a string '*' (default)
  allowedMethods: [ 'GET', 'OPTIONS' ], // it's default
  allowedHeaders: [ 'Content-Type', 'Authorization' ], // can also be just a string '*' (default)
  allowedCredentials: true,
  maxAge: 86400
}

const api = [
  endpoint('/', 'GET', handler, corsOptions)
]

server(
  app({ api })
)()
```

Property `allowedOrigins` is the only thing you need to pass to enable CORS for `src`, other properties are optional.

### Dependecies

In your endpoint handlers, you also have an access to dependecies (`deps`). You can declare dependencies in `worker.js` and you can mutate them in your endpoints as well.

```js
const dbClient = createDBClient({
  global.config.url,
  global.config.user,
  global.config.password
})

const api = [
  endpoint('/user/:id', 'GET', ({ stream, deps }) => {
    stream.respond({
      status: 200,
      'content-type': 'application/json'
    })
    const dbClient = deps.dbClient
    const user = dbClient.query(`Select user by id=${params['id']}`)
    stream.end(JSON.stringify(user))
  })
]

server(
  app({
    api,
    deps: { dbClient }
  })
)()
```

### Static files

You can setup static server in any way you want via static mapper:

```js
function staticMapper(requestUrl) {
  const parts = requestUrl.split('?')[0].split('/').filter(part => part !== '')
  return path.join('example', 'static', ...parts)
}

const static = [
  src(/^\/(html|css|js|image)/, staticMapper)
]

server(
  app({ static })
)()
```

Function `staticMapper` allows to map any url to a path in file system. And you can decide yourslef about how this mapping works. You can add multiple `src()` in `static`. 

Headers like `content-type`, `content-length` and `:status` are being set automatically.

You can apply compression to files:

```js
function staticMapper(requestUrl) {
  const parts = requestUrl.split('?')[0].split('/').filter(part => part !== '')
  return path.join('example', 'static', ...parts)
}

const static = [
  src(/^\/(html|css|js|image)/, staticMapper, {
    useGzip: true
  })
]

server(
  app({ static })
)()
```

You can add caching:

```js
function staticMapper(requestUrl) {
  const parts = requestUrl.split('?')[0].split('/').filter(part => part !== '')
  return path.join('example', 'static', ...parts)
}

const static = [
  src(/^\/(css|js|image)/, staticMapper, {
    useGzip: true,
    cacheControl: 'cache, public, max-age=432000'
  })
]

server(
  app({ static })
)()
```

You can also add CORS:

```js
function staticMapper(requestUrl) {
  const parts = requestUrl.split('?')[0].split('/').filter(part => part !== '')
  return path.join('example', 'static', ...parts)
}

const options = {
  useGzip: true,
  cacheControl: 'cache, public, max-age=432000',
  allowedOrigins: [ '1.0.12.220', '1.0.12.1:8004' ], // can also be just a string '*' (default)
  allowedMethods: [ 'GET', 'OPTIONS' ], // it's default
  allowedHeaders: [ 'Content-Type', 'Authorization' ], // can also be just a string '*' (default)
  allowedCredentials: true,
  maxAge: 86400
}

const static = [
  src(/^\/(css|js|image)/, staticMapper, options)
]

server(
  app({ static })
)()
```

For each `src`, you can add properties `fileNotFound` and `fileNotAccessible`. They configure files that server returns for `404` and `403` statuses.

```js
function staticMapper(requestUrl) {
  const parts = requestUrl.split('?')[0].split('/').filter(part => part !== '')
  return path.join('example', 'static', ...parts)
}

const options = {
  fileNotFound: 'example/static/html/not-found.html',
  fileNotAccessible: 'example/static/html/not-accessible.html'
}

const static = [
  src(/^\/(html|css|js|image)/, staticMapper, options)
]

server(
  app({ static })
)()
````
### restart.js

You can create a file `restart.js` that restarts all your servers one by one. All you need to do is just to send a signal to main process:

```js
const fs = require('fs')

const primaryProcessId = fs.readFileSync('primary.pid', 'utf-8') 

process.kill(primaryProcessId, 'SIGUSR1')
console.log(
`
We just sent SIGUSR1 to the primary process with pid: ${primaryProcessId}.

Then primary process will send message to its subprocesses to exit with code 0.
It will restart them (gracefully and with timeout one by one).
That will allow to reach zero downtime while we restarting the application with new codebase.
`
)
````

It allows to achieve zero downtime to update your codebase (whatever happens in `worker.js`).

You can also configure restart time between reloading workers:

```js
const cluster = require('./../nodes/cluster')

process.env.ENV = process.env.ENV || 'local'

const config = JSON.parse(
  fs.readFileSync(
    `./example/env/${process.env.ENV}.json`
  )
)

const restartTime = 1 // in seconds, by default it's 10

cluster('example/primary.js', 'example/worker.js')({ config, restartTime })
```

## Reading secrets from terminal

If you specify `<cli>` instead of values in your config, you will be asked to input them in the terminal. It can be useful for passwords and other sensitive data.

```json
// local.env

{
  "host": "1.0.12.0",
  "port": 8004,
  "key": "./example/ssl/key.pem",
  "cert": "./example/ssl/cert.pem",
  "someSecret": "<cli>"
}
```

It's very simple and you do it rarely, because `restart.js` does not delete your config with entered secrets.

## Example

You can run example:

```bash
npm run example
```

You can also restart example:

```bash
npm run example:restart
```

## cloc (nodes folder)

```bash
-------------------------------------------------------------------------------
Language                     files          blank        comment           code
-------------------------------------------------------------------------------
JavaScript                      26             78              1           1046
-------------------------------------------------------------------------------
SUM:                            26             78              1           1046
-------------------------------------------------------------------------------
```

## Next Goals

- [ ] Add Docker Support
- [ ] Add Let's Encrypt Support out of box
- [ ] Add admin panel
  - [ ] Add log reader

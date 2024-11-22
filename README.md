![nodes.js](logo.svg)

**1.0.33**

[![nodes.js CI](https://github.com/Guseyn/nodes.js/actions/workflows/nodes.ci.yml/badge.svg?branch=main)](https://github.com/Guseyn/nodes.js/actions/workflows/nodes.ci.yml)

NodeJS Procedural Backend Framework with Cluster API based on HTTP/2. Zero dependencies, super simple, you can hack it!

# Table of Contents

1. [Why do we need another framework for Node.js?](#why-do-we-need-another-framework-for-nodejs)
1. [How it works](#how-it-works)
1. [Setting up main.js](#setting-up-mainjs)
   - [Configuration](#configuration)
   - [Log File](#log-file)
1. [Setting up primary.js](#setting-up-primaryjs)
1. [Setting up worker.js](#setting-up-workerjs)
   - [Index file](#index-file)
   - [API](#api)
     - [Using headers](#using-headers)
     - [Using params and queries](#using-params-and-queries)
     - [Reading request body](#reading-request-body)
     - [Max size for request body](#max-size-for-request-body)
     - [Using config](#using-config)
     - [Enabling CORS](#enabling-cors)
     - [Using Dependencies](#using-dependencies)
1. [Static files](#static-files)
   - [ETag caching](#etag-caching)
   - [Cache control](#cache-control)
   - [Enabling CORS](#enabling-cors-1)
   - [Setting up `fileNotFound`, `fileNotAccessible`](#setting-up-filenotfound-filenotaccessible)
1. [Setting up restart.js](#setting-up-restartjs)
1. [Reading secrets from terminal](#reading-secrets-from-terminal)
1. [Running example](#running-example)
1. [Docker](#docker)
1. [CDN Urls](#cdn-urls)
1. [EHTML integration](#ehtml-integration)
1. [Cache versions in Urls](#cache-versions-in-urls)
1. [Let's encrypt integration](#lets-encrypt-integration)
1. [Real Production Example](#real-production-example)
1. [cloc (nodes folder)](#cloc-nodes-folder)
1. [Next Goals](#next-goals)


## Why do we need another framework for Node.js?

This is my wish list:

1. I want to build my web application on a framework with zero dependencies.
2. I want to utilize native Node.js APIs without any additional layers of abstraction.
3. I want the flexibility to modify my framework as needed, meaning I should have quick access to its folder for making rapid adjustments.
4. I want to have zero downtime when I update my application's logic just by sending a signal.
5. I want to use `Cluster` in Node.js. It will allow me to scale my application at a very low cost. I also don't want to use anything else for orchestration and other fancy things that Node.js provides itself.
6. I want to have HTTP/2 as a default.
7. I want to handle 500 user errors properly.
8. I want to configure my application out of the box in my primary and worker processes.
9. I want to have a very simple secrets reader.
10. I want to be able to log into an output log file.
11. I want to have a composable API provided by my framework and not use middleware that reduces code clarity. I want to be able to copy/paste logic to achieve clarity.
12. I want to have access to `params` and `queries` in each request URL.
13. I want to have control when I read the `body` of my requests.
14. I want to have quick access to my external dependencies, like database clients and other integrations, without attaching them to the `request` object. I want to have dependency injection without any huge frameworks.
15. I want to easily configure my `index.html` and `not-found.html` files.
16. I want to apply CDN urls on my static HTML and MD files.
17. I want to focus on building my products quickly and making money.

## How it works

After you clone this repository, you can create `app` directory alongside with `nodes` folder in the root. 

## Setting up main.js

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

In this case it's `example` application, which you can rename it. 

### Configration

You also must provide `config` object. The most practical way is to create `env` folder with `local.json` and let's say `prod.json` files and load it depending on the environment (`ENV`).

Config at least must contain following values:

```json
{
  "host": "0.0.0.0",
  "port": 8001,
  "key": "./ssl/key.tmp.pem",
  "cert": "./ssl/cert.tmp.pem"
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

### Log File

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
2024-11-09T15:21:03.885Z - worker (pid:35119) - HTTP/2 server running at https://1.0.24.0:8004
2024-11-09T15:21:03.885Z - worker (pid:35120) - HTTP/2 server running at https://1.0.24.0:8004
```

Use `global.log()` function to write logs to file. By default, this function writes to console.

## Setting up primary.js

Your `primary.js` can be used for running other processes, if you need something more than just a server application. In our case we can leave it empty:

```js
// primary.js

// console.log('this is executed in primary process')

// we can use global.config, global.log()
```

## Setting up worker.js

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

### Index file

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

#### Using headers

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

#### Using params and queries

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

#### Reading request body

You can also easily read whole body of your request via a function `body()` provided by the framework:


```js
const body = require('./../nodes/body')

const api = [
  endpoint('/echo', 'POST', async ({ stream }) => {
    const reqBody = JSON.parse(
      (await body(stream)).toString('utf-8')
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

#### Max size for request body

You can set `maxSize` for request body in `MB`:

```js
const body = require('./../nodes/body')
const RequestBodySizeExceededMaxSizeError = require('./../nodes/RequestBodySizeExceededMaxSizeError')

const api = [
  endpoint('/echo', 'POST', async ({ stream }) => {
    try {
      const reqBody = JSON.parse(
        (await body(stream, {
          maxSize: 1
        })).toString('utf-8')
      )
      stream.respond({
        status: 200,
        'content-type': 'application/json'
      })
      stream.end(JSON.stringify(reqBody))
    } catch (error) {
      if (error instanceof RequestBodySizeExceededMaxSizeError) {
        stream.respond({
          status: 413,
          'content-type': 'application/json'
        })
        // error.message is `Request body size exceeded max size(${maxSize} mb)`
        stream.end(error.message)
      } else {
        stream.respond({
          status: 500,
          'content-type': 'application/json'
        })
        stream.end('Error while reading request body')
      }
    }
  })
]

server(
  app({ api })
)()
```

#### Using config

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

#### Enabling CORS

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
  allowedOrigins: [ '0.0.0.0:8004' ], // can also be just a string '*' (default)
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

#### Using dependencies

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

You can setup static server in any way you want via src mapper:

```js
function mapper(requestUrl) {
  const parts = requestUrl.split('?')[0].split('/').filter(part => part !== '')
  return path.join('example', 'static', ...parts)
}

const static = [
  src(/^\/(html|css|js|image)/, { mapper })
]

server(
  app({ static })
)()
```

Function `mapper` allows to map any url to a path in file system. And you can decide yourslef about how this mapping works. You can add multiple `src()` in `static`. 

Headers like `content-type`, `content-length` and `:status` are being set automatically.

If you just want to declare a folder that you want to serve, you can just use `baseFolder` property instead of `mapper`.

```js
const baseFolder = path.join('example', 'static')

const static = [
  src(/^\/(html|css|js|image)/, { baseFolder })
]

server(
  app({ static })
)()
```

Your files will be mapped in the same manner as `mapper` mentioned above, except here you simply define your base folder by the property.

You can apply compression to files:

```js
const baseFolder = path.join('example', 'static')

const static = [
  src(/^\/(html|css|js|image)/, {
    baseFolder,
    useGzip: true
  })
]

server(
  app({ static })
)()
```

#### ETag caching

You can add caching:

```js
const baseFolder = path.join('example', 'static')

const static = [
  src(/^\/(css|js|image)/, {
    baseFolder,
    useGzip: true,
    useCache: true
  })
]

server(
  app({ static })
)()
```

Caching works via `ETag` header. It means that if you modify your files in your file system, the server will detect that and invalidate the cache, otherwise it will send to the browser: `304 Not Modified`.

#### Cache control

You can add `cacheControl` as well if you want to tune the caching:

```js
const baseFolder = path.join('example', 'static')

const options = {
  baseFolder,
  useCache: true, // you can omit this, if you don't need ETag
  cacheControl: 'cache, public, max-age=432000'
}

const static = [
  src(/^\/(css|js|image)/, options)
]

server(
  app({ static })
)()
```

#### Enabling CORS

You can also add CORS:

```js
const baseFolder = path.join('example', 'static')

const options = {
  baseFolder,
  allowedOrigins: [ '0.0.0.0:8004' ], // can also be just a string '*' (default)
  allowedMethods: [ 'GET', 'OPTIONS' ], // it's default
  allowedHeaders: [ 'Content-Type', 'Authorization' ], // can also be just a string '*' (default)
  allowedCredentials: true,
  maxAge: 86400
}

const static = [
  src(/^\/(css|js|image)/, options)
]

server(
  app({ static })
)()
```

#### Setting up `fileNotFound`, `fileNotAccessible`

For each `src`, you can add properties `fileNotFound` and `fileNotAccessible`. They configure files that server returns for `404` and `403` statuses.

```js
const baseFolder = path.join('example', 'static')

const options = {
  baseFolder,
  fileNotFound: 'example/static/html/not-found.html',
  fileNotAccessible: 'example/static/html/not-accessible.html'
}

const static = [
  src(/^\/(html|css|js|image)/, options)
]

server(
  app({ static })
)()
````
## Setting up restart.js

You can create a file `restart.js` that restarts all your servers one by one. All you need to do is just to send a signal to main process:

```js
const fs = require('fs')

const primaryProcessId = fs.readFileSync('primary.pid', 'utf-8') 

process.kill(primaryProcessId, 'SIGUSR1')
console.log(
`
We just sent SIGUSR1 to the primary process with pid: ${primaryProcessId}.
Version: ${version}, environment: ${environment}.

Then primary process will send message to its subprocesses to exit with code 0.
It will restart them (gracefully and with timeout one by one).
That will allow to reach zero downtime while we restarting the application with new codebase (everything in worker.js).

P.S.: If you need to update primary.js as well, you need to shutdown whole application and run it again.
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
  "host": "0.0.0.0",
  "port": 8004,
  "key": "./example/ssl/key.tmp.pem",
  "cert": "./example/ssl/cert.tmp.pem",
  "someSecret": "<cli>"
}
```

It's very simple and you do it rarely, because `restart.js` does not delete your config with entered secrets.

## Running example

You can run example locally:

```bash
npm run example:start
```

You can also restart example:

```bash
npm run example:restart
```

## Docker

You can start example application in a docker container in different evnironments:

```bash
npm run example:docker:local:start
```

or

```bash
npm run example:docker:prod:start
```

Folders `/example`, `/nodes`,  are bound to docker container. It means that you can change the code in those folders and then restart commands to update the application in the container:

```bash
npm run example:docker:local:restart
```

or

```bash
npm run example:docker:prod:restart
```

If you use `output.log` file, you can also see all logs of the application, since it's also bound to the container.

## CDN Urls

In you `primary.js` and `restart.js`, you can call a function that replaces all your relative urls with CDN urls if it's production:

```js
const addCdnToUrls = require('./../nodes/addCdnToUrls')
const removeCdnFromUrls = require('./../nodes/removeCdnFromUrls')

if (process.env.ENV === 'prod') {
  addCdnToUrls('example/static', 'https://cdn.domain.com')
} else {
  // in local env, we can remove CDN urls
  removeCdnFromUrls('example/static', 'https://cdn.domain.com')
}
```

Async functions `addCdnToUrls` and `removeCdnFromUrls` process all HTML and MD files in specified static folder.

## Cache versions in Urls

In your `primary.js` and `restart.js`, you can adjust urls with versions `?v=<hash>` in your html/md files. Hash is based on latest modified date of a file that is in the url.

```js
const updateCacheVersionsInUrls = require('./../nodes/updateCacheVersionsInUrls')

updateCacheVersionsInUrls('example/static')
```

You can also specify a `srcMapper` that can map a url to a path in the file system in your custom way.

```js
function srcMapper(baseFolder, requestUrl) {
  const parts = requestUrl.split('?')[0].split('/').filter(part => part !== '')
  return path.join('example', 'static', ...parts)
}

updateCacheVersionsInUrls('example/static', srcMapper)
```

It works in combination with `cache-control`:

```js
// worker.js
const baseFolder = 'example/static'

const options = {
  baseFolder,
  useCache: true, // you can omit this, if you don't need ETag
  cacheControl: 'cache, public, max-age=432000'
}

const static = [
  src(/^\/(css|js|image)/, options)
]

server(
  app({ static })
)()
```

## Let's Encrypt integration

In `docker-compose.prod.yml`, you will find a certbot service with a cron job that runs it. You must specify temporary key and cert files for the very first time to run it. In `package.json`, you can find an example of the command that runs docker compose with all env variables: `npm run example:docker:prod:start`.

So, your config for production must look like:

```json
{
  "protocol": "http",
  "port": 443,
  "host": "0.0.0.0",
  "key": "./example/ssl/live/domain.com/privkey.pem",
  "cert": "./example/ssl/live/domain.com/cert.pem",
  "tmpKey": "./example/ssl/key.tmp.pem",
  "tmpCert": "./example/ssl/cert.tmp.pem",
  "webroot": "example",
  "proxy": {
    "port": 80
  }
}
```

First, `tmpKey` and `tmpCert` files will be used just to run HTTPS server with a proxy that will validate your challenge files. You can generate them via `openssl` command for example. After that, `key` and `cert` will be used for your HTTPS server. You don't need to rerun anything, everything is mounted (`/example/ssl`) and dynamically linked via `SNICallback`. 

In the config, you also must specify your web root for acme challenges in your file system.

## EHTML integration

![ehtml](ehtml.svg)

This framework is perfect in combination with [ETHML](https://e-html.org). CDN and cache versions also work with such elements as `e-html`, `e-svg`, `e-markdown`.

## Real Production Example

[guseyn.com](https://guseyn.com/). Repository: https://github.com/Guseyn/guseyn.com

## cloc (nodes folder)

```bash
-------------------------------------------------------------------------------
Language                     files          blank        comment           code
-------------------------------------------------------------------------------
JavaScript                      32            148             51           1477
-------------------------------------------------------------------------------
SUM:                            32            148             51           1477
-------------------------------------------------------------------------------
```

## Next Goals

- [ ] Add local admin panel
  - [ ] Log reader
  - [ ] Cluster Monitoring
  - [ ] Rerun button
  - [ ] Pull button
- [ ] Add secrets reader from the secret file
- [ ] Simple Validation For incoming requests
- [ ] JWT auth out of box
- [ ] Introduce Merchant of Record
- [ ] SQLite out of box with user management

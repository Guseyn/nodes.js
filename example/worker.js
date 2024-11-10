const fs = require('fs')

const server = require('./../nodes/server')
const app = require('./../nodes/app')
const endpoint = require('./../nodes/endpoint')
const src = require('./../nodes/src')
const body = require('./../nodes/body')

const mapper = require('./static-mappers/mapper')

const BlogStorage = require('./deps/BlogStorage')

const blogStorage = new BlogStorage()

const {
  addComment,
  createPost,
  getPost,
  getPosts
} = require('./endpoint-handlers/export')

server(
  app({
    indexFile: './example/static/html/index.html', 
    api: [
      endpoint('/post/:id', 'GET', getPost),
      endpoint('/post/new', 'POST', createPost),
      endpoint('/posts?page&size', 'GET', getPosts),
      endpoint('/post/:id/comment/new', 'POST', addComment),
    ],
    static: [
      src(/^\/(html)/, mapper, {
        useGzip: true
      }),
      src(/^\/(css|js|images)/, mapper, {
        useGzip: true,
        useCache: true
      })
    ],
    deps: { blogStorage }
  })
)()

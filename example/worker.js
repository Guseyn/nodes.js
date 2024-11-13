const fs = require('fs')
const path = require('path')

const server = require('./../nodes/server')
const app = require('./../nodes/app')
const endpoint = require('./../nodes/endpoint')
const src = require('./../nodes/src')
const body = require('./../nodes/body')

const BlogStorage = require('./deps/BlogStorage')

const blogStorage = new BlogStorage()

const {
  addComment,
  createPost,
  getPost,
  getPosts
} = require('./endpoint-handlers/export')

const baseFolder = path.join('example', 'static')

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
      src(/^\/(html)/, {
        baseFolder,
        useGzip: true
      }),
      src(/^\/(css|js|images)/, {
        baseFolder,
        useGzip: true,
        useCache: true
      })
    ],
    deps: { blogStorage }
  })
)()

import fs from 'fs'
import path from 'path'

import server from './../nodes/server.js'
import app from './../nodes/app.js'
import endpoint from './../nodes/endpoint.js'
import src from './../nodes/src.js'
import body from './../nodes/body.js'

import BlogStorage from './deps/BlogStorage.js'

const blogStorage = new BlogStorage()

import {
  addComment,
  createPost,
  getPost,
  getPosts
} from './endpoint-handlers/export.js'

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

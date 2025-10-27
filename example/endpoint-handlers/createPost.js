import body from './../../nodes/body.js'

export default async function createPost({
  stream,
  deps
}) {
  const reqBody = await body(stream)
  const post = JSON.parse(
    reqBody.toString()
  )
  const newPost = deps.blogStorage.addPost(post)
  stream.respond({
    ':status': 200,
    'content-type': 'application/json'
  })
  stream.end(JSON.stringify(newPost))
}

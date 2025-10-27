import body from './../../nodes/body.js'

export default async function addComment({
  stream,
  params,
  deps
}) {
  const postId = params['id']
  const reqBody = await body(stream)
  const comment = JSON.parse(reqBody.toString())
  const newComment = deps.blogStorage.addComment(postId, comment)
  stream.respond({
    ':status': 200,
    'content-type': 'application/json'
  })
  stream.end(JSON.stringify(newComment))
}
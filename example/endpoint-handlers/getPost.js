export default async function getPost({
  stream,
  params,
  deps
}) {
  const post = deps.blogStorage.getPost(params['id'])
  if (!post) {
    stream.respond({
      ':status': 404,
      'content-type': 'application/json'
    })
    stream.end(JSON.stringify({
      message: 'Post Not Found'
    }))
    return
  }
  stream.respond({
    ':status': 200,
    'content-type': 'application/json'
  })
  stream.end(JSON.stringify(post))
}
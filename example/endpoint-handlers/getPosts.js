export default async function getPosts({
  stream,
  queries,
  deps
}) {
  const page = queries['page'] || 0
  const size = queries['size'] || 3
  const posts = deps.blogStorage.getPosts(page, size)
  stream.respond({
    ':status': 200,
    'content-type': 'application/json'
  })
  stream.end(JSON.stringify(posts))
}
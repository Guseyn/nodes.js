import fs from 'fs'

import isEndpointMatchedWithRequestUrlAndMethod from '#nodes/isEndpointMatchedWithRequestUrlAndMethod.js'
import isSrcMatchedWithRequestUrl from '#nodes/isSrcMatchedWithRequestUrl.js'
import urlParamsAndQueries from '#nodes/urlParamsAndQueries.js'
import defaultSrcNotFoundHandler from '#nodes/defaultSrcNotFoundHandler.js'
import defaultSrcNotAccessibleHandler from '#nodes/defaultSrcNotAccessibleHandler.js'
import defaultEndpointNotAllowedHandler from '#nodes/defaultEndpointNotAllowedHandler.js'
import pathByUrl from '#nodes/pathByUrl.js'
import streamFile from '#nodes/streamFile.js'
import corsHandler from '#nodes/corsHandler.js'
import addCorsHeadersIfNeeded from '#nodes/addCorsHeadersIfNeeded.js'

/**
 * Handles incoming HTTP/2 or HTTP/1.x requests by matching endpoints or static resources.
 *
 * @param {Object} app - The application configuration object.
 * @param {Object} stream - The HTTP/2 or HTTP/1.x stream object associated with the request.
 * @param {Object} headers - The headers object of the incoming request.
 * @returns {Promise<void>} A promise that resolves when the request is fully handled.
 *
 * @description
 * This function processes incoming requests by:
 * 1. Checking if the request matches a defined API endpoint.
 * 2. Serving static resources if a match is found.
 * 3. Responding with appropriate error handlers for not found or inaccessible resources.
 * 4. Applying CORS headers if specified in the endpoint or static resource configuration.
 */
export default async function handleRequests(app, stream, headers) {
  const requestUrl = headers[':path']
  const requestMethod = headers[':method']
  const requestAuthority = headers[':authority']
  const requestRange = headers['range']

  const allEndpointsInApp = app.api || []
  const allSrcInApp = app.static || []

  const originalRespond = stream.respond
  stream._hasResponded = false
  stream._hasEnded = false

  stream.respond = function (headers) {
    if (
      stream.closed ||
      stream.destroyed || 
      stream.writableEnded || 
      stream.aborted ||
      stream._hasResponded
    ) {
      return
    }
    stream._hasResponded = true
    originalRespond.call(stream, headers)
  }

  const originalEnd = stream.end
  stream.end = function (body) {
    if (
      stream.closed ||
      stream.destroyed || 
      stream.writableEnded || 
      stream.aborted ||
      stream._hasEnded
    ) {
      return
    }
    stream._hasEnded = true
    originalEnd.call(stream, body)
  }

  if (app.indexFile && requestMethod === 'GET' && (requestUrl === '/' || requestUrl === '')) {
    fs.stat(app.indexFile, (err, stats) => {
      if (err) {
        throw err
      }
      streamFile({
        file: app.indexFile,
        stream,
        requestMethod,
        requestAuthority,
        stats,
        status: 200
      })
    })
    return
  }

  const matchedEndpoint = allEndpointsInApp.find(endpoint => {
    return isEndpointMatchedWithRequestUrlAndMethod(endpoint, requestUrl, requestMethod)
  })

  if (matchedEndpoint) {
    const { params, queries } = urlParamsAndQueries(matchedEndpoint.urlPattern, requestUrl)
    const useCors = matchedEndpoint.useCors
    const allowedOrigins = matchedEndpoint.allowedOrigins
    const allowedMethods = matchedEndpoint.allowedOrigins
    const allowedHeaders = matchedEndpoint.allowedOrigins
    const allowedCredentials = matchedEndpoint.allowedOrigins
    const maxAge = matchedEndpoint.allowedOrigins
    if (requestMethod === 'OPTIONS' && (useCors || allowedOrigins)) {
      corsHandler({
        stream, headers, useCors,
        allowedOrigins,
        requestAuthority,
        requestMethod,
      })
    } else {
      if (allowedOrigins || useCors) {
        const originalStreamRespond = stream.respond
        stream.respond = function respondWithCors(headers) {
          addCorsHeadersIfNeeded(
            headers,
            requestAuthority, {
            useCors,
            allowedOrigins,
            allowedMethods,
            allowedHeaders,
            allowedCredentials,
            maxAge
          })
          originalStreamRespond.call(stream, headers)
        }
      }
      await matchedEndpoint.handler({
        stream, headers,
        params, queries,
        config: app.config,
        deps: app.deps
      })
    }
  } else {
    const matchedSrc = allSrcInApp.find(src => {
      return isSrcMatchedWithRequestUrl(src, requestUrl, requestMethod)
    })
    if (matchedSrc) {
      const srcMapper = matchedSrc.mapper
      const baseFolder = matchedSrc.baseFolder
      const resolvedFilePath = pathByUrl(requestUrl, srcMapper, baseFolder)
      fs.stat(resolvedFilePath, async (err, stats) => {
        if (err) {
          if (err.code === 'ENOENT') {
            const fileNotFound = matchedSrc.fileNotFound
            if (!fileNotFound) {
              await defaultSrcNotFoundHandler({
                stream
              })
            } else {
              fs.stat(fileNotFound, async (err, stats) => {
                if (err) {
                  if (err.code === 'ENOENT') {
                    await defaultSrcNotFoundHandler({
                      stream
                    })
                  } else {
                    await defaultSrcNotAccessibleHandler({
                      stream
                    })
                  }
                } else {
                  const useGzip = matchedSrc.useGzip || false
                  const useCache = matchedSrc.useCache || false
                  const useCors = matchedSrc.useCors || false
                  const cacheControl = matchedSrc.cacheControl || undefined
                  const lastModified = stats.mtime.toUTCString()
                  const allowedOrigins = matchedSrc.allowedOrigins || []
                  const allowedMethods = matchedSrc.allowedMethods || []
                  const allowedHeaders = matchedSrc.allowedHeaders || []
                  const allowedCredentials = matchedSrc.allowedCredentials || false
                  const maxAge = matchedSrc.maxAge || undefined
                  streamFile({
                    file: fileNotFound,
                    stream,
                    requestMethod,
                    requestAuthority,
                    stats,
                    status: 404,
                    useGzip,
                    useCache,
                    cacheControl,
                    lastModified,
                    useCors,
                    allowedOrigins,
                    allowedMethods,
                    allowedHeaders,
                    allowedCredentials,
                    maxAge
                  })
                }
              })
            }
          } else {
            const fileNotAccessible = matchedSrc.fileNotAccessible
            if (!fileNotAccessible) {
              await defaultSrcNotAccessibleHandler({
                stream
              })
            } else {
              fs.stats(fileNotAccessible, async (err, stats) => {
                if (err) {
                  if (err.code === 'ENOENT') {
                    await defaultSrcNotFoundHandler({
                      stream
                    })
                  } else {
                    await defaultSrcNotAccessibleHandler({
                      stream
                    })
                  }
                } else {
                  const useGzip = matchedSrc.useGzip || false
                  const useCache = matchedSrc.useCache || false
                  const useCors = matchedSrc.useCors || false
                  const cacheControl = matchedSrc.cacheControl || false
                  const lastModified = stats.mtime.toUTCString()
                  const allowedOrigins = matchedSrc.allowedOrigins || []
                  const allowedMethods = matchedSrc.allowedMethods || []
                  const allowedHeaders = matchedSrc.allowedHeaders || []
                  const allowedCredentials = matchedSrc.allowedCredentials || false
                  const maxAge = matchedSrc.maxAge || undefined
                  streamFile({
                    file: fileNotAccessible,
                    stream,
                    requestMethod,
                    requestAuthority,
                    stats,
                    status: 403,
                    useGzip,
                    useCache,
                    cacheControl,
                    lastModified,
                    useCors,
                    allowedOrigins,
                    allowedMethods,
                    allowedHeaders,
                    allowedCredentials,
                    maxAge
                  })
                }
              })
            }
          }
        } else {
          const useCache = matchedSrc.useCache || false
          const lastModified = stats.mtime.toUTCString()
          if (useCache && headers['if-none-match'] && headers['if-none-match'] === lastModified) {
            stream.respond({
              'content-type': 'text/plain',
              ':status': 304
            })
            stream.end()
          } else {
            const useGzip = matchedSrc.useGzip || false
            const useCors = matchedSrc.useCors || false
            const cacheControl = matchedSrc.cacheControl || undefined
            const allowedOrigins = matchedSrc.allowedOrigins || []
            const allowedMethods = matchedSrc.allowedMethods || []
            const allowedHeaders = matchedSrc.allowedHeaders || []
            const allowedCredentials = matchedSrc.allowedCredentials || false
            const maxAge = matchedSrc.maxAge || undefined
            streamFile({
              file: resolvedFilePath,
              stream,
              requestMethod,
              requestAuthority,
              requestRange,
              stats,
              status: 200,
              useGzip,
              useCache,
              cacheControl,
              lastModified,
              useCors,
              allowedOrigins,
              allowedMethods,
              allowedHeaders,
              allowedCredentials,
              maxAge
            })
          }
        }
      })
    } else {
      await defaultEndpointNotAllowedHandler({
        stream
      })
    }
  }
}

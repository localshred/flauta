/* @flow */

import R from 'ramda'
import path from 'path'
import pluralize from 'pluralize'
import { mergeIfPresent } from '~/src/lib/ramda-extensions'

export type HTTPMethod =
  'DELETE'
  | 'GET'
  | 'HEAD'
  | 'PATCH'
  | 'POST'
  | 'PUT'

export type ResourceType =
  'create'
  | 'destroy'
  | 'index'
  | 'show'
  | 'update'

export type NamespaceDefinition = {|
  require: string,
  path: string,
  as?: string
|}

export type Route = {|
  as?: string,
  handler: string,
  httpMethod: HTTPMethod,
  name?: string,
  require: string,
  path: string
|}

export type RouteOptions = {|
  as?: string
|}

export type ResourcesOptions = {|
  only?: Array<ResourceType>,
  except?: Array<ResourceType>,
|}

const pathJoiner: (pathPart1: string, pathPart2?: string) => (path: string) => string =
  R.curryN(2, path.join)

const resourceIdPath: (path: string) => string =
  pathJoiner(R.__, ':id')

const singularize = R.partialRight(pluralize, [1])

export const resourcePath = (resourceName: string, options?: RouteOptions): string =>
  R.propOr(
    resourceName,
    'as',
    R.defaultTo({}, options)
  )

export const DEFAULT_RESOURCES = {
  create: (resourceName: string, options?: RouteOptions): Route =>
    post(
      resourcePath(resourceName, options),
      resourceName,
      'create',
      R.omit([ 'as' ], options)
    ),

  destroy: (resourceName: string, options?: RouteOptions): Route =>
    destroy(
      resourceIdPath(resourcePath(resourceName, options)),
      resourceName,
      'destroy',
      R.omit([ 'as' ], options)
  ),

  index: (resourceName: string, options?: RouteOptions): Route => {
    const mergedOptions = R.pipe(
      mergeIfPresent(R.__, options),
      R.evolve({ as: pluralize })
    )({ as: resourceName })

    return get(
      resourcePath(resourceName, options),
      resourceName,
      'index',
      mergedOptions
    )
  },

  show: (resourceName: string, options?: RouteOptions): Route => {
    const mergedOptions = R.pipe(
      mergeIfPresent(R.__, options),
      R.evolve({ as: singularize })
    )({ as: resourceName })

    return get(
      resourceIdPath(resourcePath(resourceName, options)),
      resourceName,
      'show',
      mergedOptions
    )
  },

  update: (resourceName: string, options?: RouteOptions): Route =>
    patch(
      resourceIdPath(resourcePath(resourceName, options)),
      resourceName,
      'update',
      R.omit([ 'as' ], options)
    )
}

const DEFAULT_RESOURCES_KEYS = R.keys(DEFAULT_RESOURCES)

export const applyNamespaceToRoute = R.curry((
  namespaceDefinition: NamespaceDefinition,
  namespacedRoute: Route
): Route =>
  R.pipe(
    R.evolve({
      require: pathJoiner(namespaceDefinition.require),
      path: pathJoiner(namespaceDefinition.path)
    }),
    R.when(
      R.has('as'),
      R.evolve({
        as: R.pipe(
          pathJoiner(R.either(R.prop('as'), R.prop('path'))(namespaceDefinition)),
          R.replace(/\//g, '-'),
          R.replace(/(^-|-$)/, '')
        )
      })
    )
  )(namespacedRoute)
)

export const method = R.curryN(4, (
  httpMethod: HTTPMethod,
  endpointPath: string,
  require: string,
  handler: string,
  options?: RouteOptions
): Route =>
  mergeIfPresent({
    handler,
    httpMethod,
    require,
    path: endpointPath
  }, options)
)

export const destroy = method('DELETE')
export const get = method('GET')
export const head = method('HEAD')
export const patch = method('PATCH')
export const post = method('POST')
export const put = method('PUT')

export const resources = (
  name: string,
  options?: ResourcesOptions
): Array<Route> => {
  const only = R.propOr(DEFAULT_RESOURCES_KEYS, 'only', options)
  const except = R.propOr([], 'except', options)
  const argsToApply = [name, R.omit(['only', 'except'], options)]

  return R.pipe(
    R.unless(R.isEmpty, R.pick)(only),
    R.omit(except),
    R.values,
    R.map(R.apply(R.__, argsToApply))
  )(DEFAULT_RESOURCES)
}

export const namespace = R.curry((
  namespaceDefinition: NamespaceDefinition,
  namespacedRoutes: Array<Route>
): Array<Route> =>
  R.map(
    R.ifElse(
      R.isArrayLike,
      namespace(namespaceDefinition),
      applyNamespaceToRoute(namespaceDefinition)
    ),
    namespacedRoutes
  )
)

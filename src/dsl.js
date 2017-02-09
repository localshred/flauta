/* @flow */
/** @namespace dsl */

import R from 'ramda'
import path from 'path'
import { mergeIfPresent } from '~/src/ramda-extensions'

/**
 * @typedef {string} HTTPMethod
 * @memberof dsl
 */
export type HTTPMethod =
  'DELETE'
  | 'GET'
  | 'HEAD'
  | 'PATCH'
  | 'POST'
  | 'PUT'

/**
 * @typedef {object} NamespaceDefinition
 * @memberof dsl
 * @property {string} require - The require path of the namespace that all child routes should inherit. Should be an absolute path.
 * @property {string} path - The URL path of the namespace that all child routes should inherit.
 * @property {string} [as] - The namespace's alias.
 */
export type NamespaceDefinition = {|
  require: string,
  path: string,
  as?: string
|}

/**
 * @typedef {object} Route
 * @memberof dsl
 * @property {string} [as] - The route's alias.
 * @property {string} handler - The name of the function that will handle all requests to this route endpoint.
 * @property {HTTPMethod} httpMethod - The HTTP verb to register this route under.
 * @property {string} require - The require path of the namespace that all child routes should inherit. Should be an absolute path.
 * @property {string} path - The URL path of the namespace that all child routes should inherit.
 */
export type Route = {|
  as?: string,
  handler: string,
  httpMethod: HTTPMethod,
  require: string,
  path: string
|}

/**
 * @typedef {object} RouteOptions
 * @memberof dsl
 * @property {string} [as] - The namespace's alias.
 */
export type RouteOptions = {|
  as?: string
|}

/**
 * Adjusts the Route's require and path properties, prepending those from the namespace definition.
 *
 * @memberof dsl
 * @function applyNamespaceToRoute
 * @static
 * @param {NamespaceDefintion} namespaceDefinition - The namespace definition arguments (e.g. require & path).
 * @param {Route} namespacedRoute - The Route to update with the given definition.
 * @returns {Route} - The Route with the require and path properties modified.
 */
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

/**
 * Curried, general purpose Route building function. Can be used to build more specific route definitions
 * than is provided by the more specific verb or resources functions.
 *
 * @memberof dsl
 * @function route
 * @static
 * @param {HTTPMethod} httpMethod - The HTTP verb.
 * @param {string} endpointPath - The URL path to use.
 * @param {string} require - The path to the javascript module that exports the given handler function. If specified outside of any namespace you should provide an absolute path.
 * @param {string} handler - The name of the handler function that will handle requests for this endpoint. The handler funciton should be exported by the module at the require path.
 * @param {RouteOptions} [options] - Additional route options, if any.
 * @returns {Route} - The generated route definition.
 */
export const route = R.curryN(4, (
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

/**
 * Curried, Route building function for an endpoint listening for HTTP DELETE requests. Simply a partially applied
 * version of {@link dsl/route}.
 *
 * @memberof dsl
 * @function destroy
 * @static
 * @param {string} endpointPath - The URL path to use.
 * @param {string} require - The path to the javascript module that exports the given handler function. If specified outside of any namespace you should provide an absolute path.
 * @param {string} handler - The name of the handler function that will handle requests for this endpoint. The handler funciton should be exported by the module at the require path.
 * @param {RouteOptions} [options] - Additional route options, if any.
 * @returns {Route} - The generated route definition.
 * @see {@link dsl/route}
 */
export const destroy = route('DELETE')

/**
 * Curried, Route building function for an endpoint listening for HTTP GET requests. Simply a partially applied
 * version of {@link dsl/route}.
 *
 * @memberof dsl
 * @function get
 * @static
 * @param {string} endpointPath - The URL path to use.
 * @param {string} require - The path to the javascript module that exports the given handler function. If specified outside of any namespace you should provide an absolute path.
 * @param {string} handler - The name of the handler function that will handle requests for this endpoint. The handler funciton should be exported by the module at the require path.
 * @param {RouteOptions} [options] - Additional route options, if any.
 * @returns {Route} - The generated route definition.
 * @see {@link dsl/route}
 */
export const get = route('GET')

/**
 * Curried, Route building function for an endpoint listening for HTTP HEAD requests. Simply a partially applied
 * version of {@link dsl/route}.
 *
 * @memberof dsl
 * @function head
 * @static
 * @param {string} endpointPath - The URL path to use.
 * @param {string} require - The path to the javascript module that exports the given handler function. If specified outside of any namespace you should provide an absolute path.
 * @param {string} handler - The name of the handler function that will handle requests for this endpoint. The handler funciton should be exported by the module at the require path.
 * @param {RouteOptions} [options] - Additional route options, if any.
 * @returns {Route} - The generated route definition.
 * @see {@link dsl/route}
 */
export const head = route('HEAD')

/**
 * Wraps a list of route and/or namespace definitions to provide additional namespace context for
 * the require and URL paths of the nested routes.
 *
 * Generally this will be the first and only entry of the outer level of your routes definition.
 * The outer namespace definition should provide an absolute require path so that this library can
 * require the controller files correctly.
 *
 * @memberof dsl
 * @function namespace
 * @static
 * @param {NamespaceDefintion} namespaceDefinition - The namespace definition arguments (e.g. require & path).
 * @param {Array.<Route>} namespacedRoutes - A list of Route definitions which should apply to this namepsace.
 * @returns {Array.<Route>} - Returns the child routes with their require and url properties adjusted.
 *
 */
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

/**
 * Curried, Route building function for an endpoint listening for HTTP PATCH requests. Simply a partially applied
 * version of {@link dsl/route}.
 *
 * @memberof dsl
 * @function patch
 * @static
 * @param {string} endpointPath - The URL path to use.
 * @param {string} require - The path to the javascript module that exports the given handler function. If specified outside of any namespace you should provide an absolute path.
 * @param {string} handler - The name of the handler function that will handle requests for this endpoint. The handler funciton should be exported by the module at the require path.
 * @param {RouteOptions} [options] - Additional route options, if any.
 * @returns {Route} - The generated route definition.
 * @see {@link dsl/route}
 */
export const patch = route('PATCH')

/**
 * Curried version of path.join to allow easier partial application.
 *
 * @memberof dsl
 * @function pathJoiner
 * @static
 * @param {string} pathPart1 - First part of the path
 * @param {string} pathPart2 - second part of the path
 * @returns {string} - The joined path.
 * @example
 *
 * > pathJoiner('foo', 'bar')
 * 'foo/bar'
 *
 * > const usersPath = pathJoiner('users')
 * > usersPath('sally')
 * > 'users/sally'
 *
 * > pathJoiner('users')('sally')
 * > 'users/sally'
 *
 * > const idPath = pathJoiner(R.__, ':id')
 * > idPath('users')
 * 'users/:id'
 */
export const pathJoiner: (pathPart1: string, pathPart2?: string) => (path: string) => string =
  R.curryN(2, path.join)

/**
 * Curried, Route building function for an endpoint listening for HTTP POST requests. Simply a partially applied
 * version of {@link dsl/route}.
 *
 * @memberof dsl
 * @function post
 * @static
 * @param {string} endpointPath - The URL path to use.
 * @param {string} require - The path to the javascript module that exports the given handler function. If specified outside of any namespace you should provide an absolute path.
 * @param {string} handler - The name of the handler function that will handle requests for this endpoint. The handler funciton should be exported by the module at the require path.
 * @param {RouteOptions} [options] - Additional route options, if any.
 * @returns {Route} - The generated route definition.
 * @see {@link dsl/route}
 */
export const post = route('POST')

/**
 * Curried, Route building function for an endpoint listening for HTTP PUT requests. Simply a partially applied
 * version of {@link dsl/route}.
 *
 * @memberof dsl
 * @function put
 * @static
 * @param {string} endpointPath - The URL path to use.
 * @param {string} require - The path to the javascript module that exports the given handler function. If specified outside of any namespace you should provide an absolute path.
 * @param {string} handler - The name of the handler function that will handle requests for this endpoint. The handler funciton should be exported by the module at the require path.
 * @param {RouteOptions} [options] - Additional route options, if any.
 * @returns {Route} - The generated route definition.
 * @see {@link dsl/route}
 */
export const put = route('PUT')

/**
 * pathJoiner with ':id' partiall applied as the second argument.
 *
 * @memberof dsl
 * @function resourceIdPath
 * @static
 * @param {string} path - Initial path to join /:id onto the end of.
 * @returns {string} - The joined path.
 * @see {@link dsl/pathJoiner}
 * @example
 *
 * > resourceIdPath('foo/bar')
 * 'foo/bar/:id'
 */
export const resourceIdPath: (path: string) => string =
  pathJoiner(R.__, ':id')

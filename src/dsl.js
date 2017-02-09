/* @flow */
/** @namespace dsl */

import R from 'ramda'
import path from 'path'
import pluralize from 'pluralize'
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
 * @typedef {string} ResourceType
 * @memberof dsl
 */
export type ResourceType =
  'create'
  | 'destroy'
  | 'index'
  | 'show'
  | 'update'

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
 * @typedef {Object} ResourcesOptions
 * @memberof dsl
 * @property {Array.<ResourceType>} [only] - A list of resource routes to create, ignoring those omitted.
 * @property {Array.<ResourceType>} [except] - A list of resource routes to skip creation of, creating routes for those values omitted.
 */
export type ResourcesOptions = {|
  only?: Array<ResourceType>,
  except?: Array<ResourceType>,
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
 * The set of default HTTP verb route builders.
 *
 * @memberof dsl
 * @constant
 */
export const DEFAULT_RESOURCES = {
  /** @namespace */

  /**
   * Builds a create Route definition for the given resource.
   *
   * @function create
   * @param {string} resourceName - The name of the resource.
   * @param {RouteOptions} [options] - The RouteOptions object.
   * @returns {Route} - Route representing a create endpoint for the given resource.
   */
  create: (resourceName: string, options?: RouteOptions): Route =>
    post(
      resourcePath(resourceName, options),
      resourceName,
      'create',
      R.omit([ 'as' ], options)
    ),

  /**
   * Builds a destroy Route definition for the given resource.
   *
   * @function destroy
   * @param {string} resourceName - The name of the resource.
   * @param {RouteOptions} [options] - The RouteOptions object.
   * @returns {Route} - Route representing a destroy endpoint for the given resource.
   */
  destroy: (resourceName: string, options?: RouteOptions): Route =>
    destroy(
      resourceIdPath(resourcePath(resourceName, options)),
      resourceName,
      'destroy',
      R.omit([ 'as' ], options)
  ),

  /**
   * Builds a destroy Route definition for the given resource.
   *
   * @function index
   * @param {string} resourceName - The name of the resource.
   * @param {RouteOptions} [options] - The RouteOptions object.
   * @returns {Route} - Route representing a index endpoint for the given resource.
   */
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

  /**
   * Builds a show Route definition for the given resource.
   *
   * @function show
   * @param {string} resourceName - The name of the resource.
   * @param {RouteOptions} [options] - The RouteOptions object.
   * @returns {Route} - Route representing a show endpoint for the given resource.
   */
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

  /**
   * Builds an update Route definition for the given resource.
   *
   * @function update
   * @param {string} resourceName - The name of the resource.
   * @param {RouteOptions} [options] - The RouteOptions object.
   * @returns {Route} - Route representing a update endpoint for the given resource.
   */
  update: (resourceName: string, options?: RouteOptions): Route =>
    patch(
      resourceIdPath(resourcePath(resourceName, options)),
      resourceName,
      'update',
      R.omit([ 'as' ], options)
    )
}

/**
 * @constant
 * @private
 * @type {Array.<string>}
 */
const DEFAULT_RESOURCES_KEYS = R.keys(DEFAULT_RESOURCES)

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
 * Creates 5 endpoints for working with the a given resource:
 *
 *  + GET /api/v1/{name}         (handler = index)
 *  + GET /api/v1/{name}/:id     (handler = show)
 *  + POST /api/v1/{name}        (handler = create)
 *  + PATCH /api/v1/{name}/:id   (handler = update)
 *  + DELETE /api/v1/{name}/:id  (handler = destroy)
 *
 * @memberof dsl
 * @function resources
 * @static
 * @param {string} name - The name of the resource to generate routes for.
 * @param {RouteOptions} [options] - Additional resource options, if any.
 * @returns {Array.<Route>} - An array of Route definitions.
 *
 */
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

/**
 * Fetches the `as` property from the given options, defaulting to the `resourcePath` if none is found.
 *
 * @memberof dsl
 * @function resourcePath
 * @static
 * @param {string} resourceName - The name of the resource to use as the default if the `as` RouteOptions property is missing.
 * @param {RouteOptions} [options] - A RouteOptions object.
 * @returns {string} - options.as || resourceName
 *
 */
export const resourcePath = (resourceName: string, options?: RouteOptions): string =>
  R.propOr(
    resourceName,
    'as',
    R.defaultTo({}, options)
  )

const singularize = R.partialRight(pluralize, [1])

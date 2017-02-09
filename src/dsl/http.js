/* @flow */
/** @namespace dsl/http */

import R from 'ramda'
import { mergeIfPresent } from '~/src/ramda-extensions'

/**
 * @typedef {string} HTTPMethod
 * @memberof dsl/http
 */
export type HTTPMethod =
  'DELETE'
  | 'GET'
  | 'HEAD'
  | 'PATCH'
  | 'POST'
  | 'PUT'

/**
 * @typedef {object} Route
 * @memberof dsl/http
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
 * @memberof dsl/http
 * @property {string} [as] - The namespace's alias.
 */
export type RouteOptions = {|
  as?: string
|}

/**
 * Curried, general purpose Route building function. Can be used to build more specific route definitions
 * than is provided by the more specific verb or resources functions.
 *
 * @memberof dsl/http
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
 * @memberof dsl/http
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
 * @memberof dsl/http
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
 * @memberof dsl/http
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
 * Curried, Route building function for an endpoint listening for HTTP PATCH requests. Simply a partially applied
 * version of {@link dsl/route}.
 *
 * @memberof dsl/http
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
 * Curried, Route building function for an endpoint listening for HTTP POST requests. Simply a partially applied
 * version of {@link dsl/route}.
 *
 * @memberof dsl/http
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
 * @memberof dsl/http
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

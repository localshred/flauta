/* @flow */
/** @namespace dsl/resources */

import R from 'ramda'
import { pathJoiner } from '~/src/dsl'
import { destroy as httpDelete, get, patch, post,
  type Route, type RouteOptions } from '~/src/dsl/http'
import { mergeIfPresent } from '~/src/ramda-extensions'

import pluralize from 'pluralize'

/**
 * @typedef {string} ResourceType
 * @memberof dsl/resources
 */
export type ResourceType =
  'create'
  | 'destroy'
  | 'index'
  | 'show'
  | 'update'

/**
 * @typedef {Object} ResourcesOptions
 * @memberof dsl/resources
 * @property {Array.<ResourceType>} [only] - A list of resource routes to create, ignoring those omitted.
 * @property {Array.<ResourceType>} [except] - A list of resource routes to skip creation of, creating routes for those values omitted.
 */
export type ResourcesOptions = {|
  only?: Array<ResourceType>,
  except?: Array<ResourceType>,
|}

/**
 * Creates 5 endpoints for working with the a given resource:
 *
 *  + GET /api/v1/{name}         (handler = index)
 *  + GET /api/v1/{name}/:id     (handler = show)
 *  + POST /api/v1/{name}        (handler = create)
 *  + PATCH /api/v1/{name}/:id   (handler = update)
 *  + DELETE /api/v1/{name}/:id  (handler = destroy)
 *
 * @memberof dsl/resources
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
 * Builds a create Route definition for the given resource.
 *
 * @memberof dsl/resources
 * @function create
 * @param {string} resourceName - The name of the resource.
 * @param {RouteOptions} [options] - The RouteOptions object.
 * @returns {Route} - Route representing a create endpoint for the given resource.
 */
export const create = (resourceName: string, options?: RouteOptions): Route =>
  post(
    resourcePath(resourceName, options),
    resourceName,
    'create',
    R.omit([ 'as' ], options)
  )

/**
 * Builds a destroy Route definition for the given resource.
 *
 * @memberof dsl/resources
 * @function destroy
 * @param {string} resourceName - The name of the resource.
 * @param {RouteOptions} [options] - The RouteOptions object.
 * @returns {Route} - Route representing a destroy endpoint for the given resource.
 */
export const destroy = (resourceName: string, options?: RouteOptions): Route =>
  httpDelete(
    resourceIdPath(resourcePath(resourceName, options)),
    resourceName,
    'destroy',
    R.omit([ 'as' ], options)
  )

/**
 * Builds a destroy Route definition for the given resource.
 *
 * @memberof dsl/resources
 * @function index
 * @param {string} resourceName - The name of the resource.
 * @param {RouteOptions} [options] - The RouteOptions object.
 * @returns {Route} - Route representing a index endpoint for the given resource.
 */
export const index = (resourceName: string, options?: RouteOptions): Route => {
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
}

/**
 * pathJoiner with ':id' partiall applied as the second argument.
 *
 * @memberof dsl/resources
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
 * @memberof dsl/resources
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

/**
 * Builds a show Route definition for the given resource.
 *
 * @memberof dsl/resources
 * @function show
 * @param {string} resourceName - The name of the resource.
 * @param {RouteOptions} [options] - The RouteOptions object.
 * @returns {Route} - Route representing a show endpoint for the given resource.
 */
export const show = (resourceName: string, options?: RouteOptions): Route => {
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
}

/**
 * Builds an update Route definition for the given resource.
 *
 * @memberof dsl/resources
 * @function update
 * @param {string} resourceName - The name of the resource.
 * @param {RouteOptions} [options] - The RouteOptions object.
 * @returns {Route} - Route representing a update endpoint for the given resource.
 */
export const update = (resourceName: string, options?: RouteOptions): Route =>
  patch(
    resourceIdPath(resourcePath(resourceName, options)),
    resourceName,
    'update',
    R.omit([ 'as' ], options)
  )

/**
 * @memberof dsl/resources
 * @constant
 * @private
 * @type {Object.<string, function>}
 */
export const DEFAULT_RESOURCES = {
  create,
  destroy,
  index,
  show,
  update
}

/**
 * @memberof dsl/resources
 * @constant
 * @private
 * @type {Array.<string>}
 */
const DEFAULT_RESOURCES_KEYS = R.keys(DEFAULT_RESOURCES)

const singularize = R.partialRight(pluralize, [1])

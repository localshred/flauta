/* @flow */
/** @namespace dsl */

import R from 'ramda'
import path from 'path'
import { type Route } from '~/src/dsl/http'

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

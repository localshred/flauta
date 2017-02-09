/* @flow */
/** @namespace router */

import R from 'ramda'

import { type Route } from '~/src/dsl/http'

/**
 * @typedef {function} PathHelpersBuilder
 * @memberof router
 * @param {Array.<RouteModuleTuple>} routes
 * @returns {RouterPaths}
 */
export type PathHelpersBuilder = (routes: Array<?RouteModuleTuple>) => RouterPaths

/**
 * @typedef {Array} PathHelpersBuilder
 * @memberof router
 * @description 2-Tuple of a Route and (Object or Error)
 */
export type RouteModuleTuple = [Route, Object | Error]

/**
 * @typedef {Object} RouterPaths
 * @memberof router
 * @description Object where keys are path aliases and values are {@link RoutePathGenerator} functions.
 */
export type RouterPaths = {
  [key: string]: RoutePathGenerator
}

/**
 * @typedef {function} RoutePathGenerator
 * @memberof router
 * @param {Object.<string, string>} [properties]
 * @returns {string} - The path with any properties replaced with their values.
 */
export type RoutePathGenerator = (properties?: { [string]: string }) => string

/**
 * @typedef {Object} Router
 * @memberof router
 * @property {Array.<?RouteModuleTuple>} routes - The computed routes that had a valid require path and exported handler.
 * @property {Array.<?RouteModuleTuple>} invalidRoutes - The routes that had a missing required module or exported handler.
 * @property {RouterPaths} [paths] - All of the path helper functions computed based on the valid routes.
 */
export type Router = {|
  routes: Array<?RouteModuleTuple>,
  invalidRoutes?: Array<?RouteModuleTuple>,
  paths?: RouterPaths
|}

/**
 * @typedef {function} ModuleRequirer
 * @memberof router
 * @param {Route} route
 * @returns {RouteModuleTuple} - A 2-Tuple containing the given Route and either the required module or the require error.
 */
export type ModuleRequirer = (route: Route) => RouteModuleTuple

/**
 * @typedef {function} RouteLodaer
 * @memberof router
 * @param {Array<?Route>} routes
 * @returns {Router}
 */
export type RouteLoader = (routes: Array<?Route>) => Router

/**
 * @typedef {function} RouteRegistrar
 * @memberof router
 * @param {Object} app - The express application to register routes against.
 * @param {RouteModuleTuple} tuple - The route and the module to register with.
 * @returns {RouteModuleTuple} - The given tuple.
 *
 */
export type RouteRegistrar = (app: express$Application) => (tuple: RouteModuleTuple) => RouteModuleTuple

/**
 * Takes a list of require route modules and builds path helper functions for all of the aliased routes.
 *
 * @memberof router
 * @function buildPathHelpers
 * @static
 * @param {Array.<?RouteModuleTuple>} routes
 * @param {function} [pathBuilder] - Function which takes a {@link RouteModuleTuple} and returns a {@link RoutePathGenerator}.
 * @returns {RouterPaths} - An object whose values are path builder functions, keyed by the aliased path defined by some routes.
 */
export const buildPathHelpers = (
  routes: Array<?RouteModuleTuple>,
  pathBuilder?: (tuple: RouteModuleTuple) => RoutePathGenerator = routeModuleTupleToPathBuilder
): RouterPaths =>
  R.pipe(
    R.map(R.head),
    R.filter(R.has('as')),
    R.indexBy(R.prop('as')),
    R.toPairs,
    R.map(R.adjust(pathBuilder, 1)),
    R.fromPairs
  )(routes)

/**
 * Attempts to load the given routes with the given safe module requiring function. Returns a router
 * where the routes are subdivided into valid `routes` and `invalidRoutes`.
 *
 * @memberof router
 * @function loadRoutes
 * @static
 * @param {Array.<?Route>} routes
 * @param {SafeModuleRequirer} [safeModuleRequirer] - A function that takes a path to require and returns a {@link RouteModuleTuple}. You probably don't want to override this.
 * @returns {Router}
 */
export const loadRoutes = R.curryN(1, (
  routes: Array<?Route>,
  safeModuleRequirer?: ModuleRequirer = safeRequireRouteModule
): Router =>
  R.pipe(
    R.flatten,
    R.map(safeModuleRequirer),
    R.partition(R.pipe(R.last, R.is(Error), R.not)),
    R.applySpec({
      routes: R.head,
      invalidRoutes: R.last
    })
  )(routes)
)

/**
 * Takes your express application and a built {@link Router} and registers each valid {@link Route}
 * with the correct express http verb function.
 *
 * @memberof router
 * @function register
 * @static
 * @param {Object} app - The express application to register routes against.
 * @param {Router} router
 * @param {RouteRegistrar} [expressRouteRegistrar] - A function that takes each route and registers it with express. You probably don't want to override this.
 * @returns {Router} - The given router unchanged.
 */
export const register = (
  app: express$Application,
  router: Router,
  expressRouteRegistrar?: RouteRegistrar = registerExpressRoute
): Router =>
  R.over(
    R.lensProp('routes'),
    R.map(expressRouteRegistrar(app)),
    router
  )

/**
 * Used by {@link register} to register each individual route with your express application.
 *
 * @memberof router
 * @function registerExpresssRoute
 * @static
 * @param {Object} app - The express application to register the route against.
 * @param {RouteModuleTuple} routeModuleTuple
 * @returns {RouteModuleTuple} - The tuple unmodified.
 */
export const registerExpressRoute = R.curry((
  app: express$Application,
  [route: Route, routeModule: Object]
): RouteModuleTuple => {
  const handler = R.either(
    R.path(['default', route.handler]),
    R.prop(route.handler)
  )(routeModule)

  if (R.isNil(handler)) {
    console.warn(`Route ${route.path} handler ${route.handler} not found for module ${route.require}`)
    return [route, routeModule]
  }

  const expressHttpMethod = R.invoker(2, R.toLower(route.httpMethod))
  expressHttpMethod(route.path, handler, app)

  return [route, routeModule]
})

/**
 * Requires all of the routes and builds the path helpers for those that have aliases.
 *
 * @memberof router
 * @function resolve
 * @static
 * @param {Array.<?Route>} routes
 * @param {RouteLoader} [routeLoader] - You probably don't want to override this.
 * @param {PathHelpersBuilder} [pathHelpersBuilder] - You probably don't want to override this.
 * @returns {Router}
 */
export const resolve = R.curryN(1, (
  routes: Array<?Route>,
  routeLoader?: RouteLoader = loadRoutes,
  pathHelpersBuilder?: PathHelpersBuilder = buildPathHelpers
): Router => {
  const loadedRoutes = routeLoader(routes)
  const cachedPaths = pathHelpersBuilder(loadedRoutes.routes)

  return R.pipe(
    R.pick(['routes', 'invalidRoutes']),
    R.assoc('paths', cachedPaths)
  )(loadedRoutes)
})

/**
 * Curried function which binds a route to a path helper function. The returned function can optionally
 * take an object with properties to replace in the route path so that you can generate valid URL paths
 * for interacting with a particular route.
 *
 * @memberof router
 * @function routeModuleTupleToPathBuilder
 * @static
 * @param {RouteModuleTuple} tuple
 * @param {Object.<string, string>} [properties] - Provide this object if there are properties in the path that need to have actual values (e.g. :id).
 * @returns {string} - The URL path to use to interact with this route via HTTP calls.
 * @example
 *
 * const router = flauta.resolve([
 *   flauta.namespace({ path: '/', require: '/some/absolute/path/to/controllers' }, [
 *     flauta.resources('users')
 *   ])
 * ])
 *
 * router.paths.users() // => '/users'
 * router.paths.user({ id: '123' }) // => '/users/123'
 */
export const routeModuleTupleToPathBuilder = (
  tuple: RouteModuleTuple
) => (
  properties?: { [string]: string }
): string => {
  const route = R.head(tuple)
  if (R.isEmpty(properties)) {
    return route.path
  }

  const expectedProperties = pathPropertiesMatcher(route.path)
  const validProperties = R.pick(expectedProperties, properties)

  return R.reduce(
    (path, [key, value]) => R.replace(new RegExp(`(^|/):${key}(/|$)`), `$1${value}$2`, path),
    route.path,
    R.toPairs(validProperties)
  )
}

/**
 * Requires the module for the given {@link Route} object, catching any require exceptions that may occur.
 *
 * @memberof router
 * @function safeRequireRouteModule
 * @static
 * @param {Route} route
 * @param {function} [moduleRequirer] - You probably don't want to override this.
 * @returns {RouteModuleTuple} - A 2-tuple contain the given route (unchanged) and either the required module for that route or the require Error that was raised.
 * @example
 *
 * let route = flauta.get('/', 'home', 'root')
 * safeRequireRouteModule(route) // +=> [{method: 'GET', path: '/', ...}, {root: function(req,res) { ... }}]
 *
 * @example
 *
 * const route = flauta.get('/', 'some-non-existant-controller', 'root')
 * safeRequireRouteModule(routi) // +=> [{method: 'GET', path: '/', ...}, Error('the require error')]
 */
export const safeRequireRouteModule = (
  route: Route,
  moduleRequirer: (path: string) => ?Object = require
): [Route, Object | Error] => {
  return R.tryCatch(
    (route: Route) => [route, R.pipe(moduleRequirer, verifyHandlerExported(route.handler))(route.require)],
    (error: Error) => [route, error]
  )(route)
}

/**
 * Verifies that the given route module exports the given handler function.
 *
 * @memberof router
 * @function verifyHandlerExported
 * @static
 * @param {string} handler - The name of the handler function we expect to be exported by the route module.
 * @param {Object} routeModule - The pre-required route module.
 * @returns {Object | Error} - If the handler is found then the route module is returned, otherwise an Error object is returned (not thrown).
 */
export const verifyHandlerExported = R.curry((handler: string, routeModule: mixed): mixed | Error =>
  R.ifElse(
    R.has(handler),
    R.identity,
    () => new Error('Controller module missing the handler function')
  )(routeModule)
)

const pathPropertiesMatcher: (path: string) => Array<?string> = R.pipe(
  R.match(/(?:^|\/):([-a-zA-Z_]+)(?:\/|$)/g),
  R.map(R.replace(/[\/:]+/g, ''))
)

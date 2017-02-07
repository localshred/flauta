/* @flow */

import R from 'ramda'

import { type Route } from '~/src/dsl'

export type PathHelpersBuilder = (routes: Array<?RouteModuleTuple>) => RouterPaths

export type RouteModuleTuple = [Route, Object | Error]

export type RouterPaths = {
  [key: string]: RoutePathGenerator
}

export type RoutePathGenerator = (pattern: string | RegExp) => ?string

export type Router = {|
  routes: Array<?RouteModuleTuple>,
  invalidRoutes?: Array<?RouteModuleTuple>,
  paths?: RouterPaths
|}

export type ModuleRequirer = (route: Route) => RouteModuleTuple

export type RouteLoader = (routes: Array<?Route>) => Router

export type RouteRegistrar = (app: express$Application) => (tuple: RouteModuleTuple) => RouteModuleTuple

export const buildPathHelpers = (
  routes: Array<?RouteModuleTuple>,
  pathBuilder?: (tuple: RouteModuleTuple) => (properties?: { [string]: string }) => string = routeModuleTupleToPathBuilder
): RouterPaths =>
  R.pipe(
    R.map(R.head),
    R.filter(R.has('as')),
    R.indexBy(R.prop('as')),
    R.toPairs,
    R.map(R.adjust(pathBuilder, 1)),
    R.fromPairs
  )(routes)

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

export const resolve = R.curryN(1, (
  routes: Array<?Route>,
  routeLoader?: RouteLoader = loadRoutes,
  cachedPathsBuilder?: PathHelpersBuilder = buildPathHelpers
): Router => {
  const loadedRoutes = routeLoader(routes)
  const cachedPaths = cachedPathsBuilder(loadedRoutes.routes)

  return R.pipe(
    R.pick(['routes', 'invalidRoutes']),
    R.assoc('paths', cachedPaths)
  )(loadedRoutes)
})

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

export const safeRequireRouteModule = (
  route: Route,
  moduleRequirer: (path: string) => ?Object = require
): [Route, Object | Error] => {
  return R.tryCatch(
    (route: Route) => [route, R.pipe(moduleRequirer, verifyHandlerExported(route.handler))(route.require)],
    (error: Error) => [route, error]
  )(route)
}

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

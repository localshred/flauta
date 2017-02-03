/* @flow */
/* eslint-env jest */

import R from 'ramda'
import express from 'express'
import { buildPathHelpers, loadRoutes, register, registerExpressRoute, resolve,
  routeModuleTupleToPathBuilder, safeRequireRouteModule } from '~/src/router'
import { runTestCases } from '~/test/helpers/define-cases'

describe('~/app/lib/router', () => {
  describe('buildPathHelpers', () => {
    it('builds path helper functions for every route with an as: property', () => {
      const pathBuilder = jest.fn()
      const boundPathBuilder = jest.fn()
      pathBuilder.mockReturnValue(boundPathBuilder)

      const tuples = [
        [{ handler: 'one', httpMethod: 'GET', path: 'api/v1/one', require: '~/app/controllers/home' }, {}],
        [{ handler: 'two', httpMethod: 'GET', path: 'api/v1/two', require: '~/app/controllers/home', as: 'two' }, {}]
      ]

      const actual = buildPathHelpers(tuples, pathBuilder)
      expect(actual).toMatchObject({ two: boundPathBuilder })
      expect(pathBuilder).toHaveBeenCalledWith(tuples[1][0])
    })
  })

  describe('loadRoutes', () => {
    it('loads route modules and returns the route and module as a tuple', () => {
      const route = {handler: 'one', httpMethod: 'GET', path: 'api/v1/one', require: '~/app/controllers/home'}
      const routeModule = {one: () => {}}

      const safeRequire = jest.fn()
      safeRequire.mockReturnValue([route, routeModule])

      const actual = loadRoutes([route], safeRequire)
      expect(actual.routes).toEqual([[route, routeModule]])
      expect(safeRequire).toHaveBeenCalledWith(route)
    })

    it('returns the route and an error if the requirer could not load find the module', () => {
      const routeOne = {handler: 'one', httpMethod: 'GET', path: 'api/v1/one', require: '~/app/controllers/one'}
      const routeTwo = {handler: 'two', httpMethod: 'GET', path: 'api/v1/two', require: '~/app/controllers/two'}
      const routeTwoModule = {two: () => {}}

      const safeRequire = jest.fn()
      safeRequire.mockReturnValueOnce([routeOne, new Error(`Could not find module at ${routeOne.require}`)])
      safeRequire.mockReturnValueOnce([routeTwo, routeTwoModule])

      const actual = loadRoutes([routeOne, routeTwo], safeRequire)
      expect(actual.routes).toEqual([[routeTwo, routeTwoModule]])
      expect(safeRequire).toHaveBeenCalledWith(routeOne)
      expect(safeRequire).toHaveBeenCalledWith(routeTwo)
    })

    it('handles nested route structures (coping with return values from `scope`)', () => {
      const routeOne = {handler: 'one', httpMethod: 'GET', path: 'api/v1/one', require: '~/app/controllers/one'}
      const routeTwo = {handler: 'two', httpMethod: 'GET', path: 'api/v1/two', require: '~/app/controllers/two'}
      const routes = [routeOne, [routeTwo]]
      const routeOneModule = {one: () => {}}
      const routeTwoModule = {two: () => {}}

      const routeOneReturnValue = [routeOne, routeOneModule]
      const routeTwoReturnValue = [routeTwo, routeTwoModule]
      const safeRequire = jest.fn()
      safeRequire.mockReturnValueOnce(routeOneReturnValue)
      safeRequire.mockReturnValueOnce(routeTwoReturnValue)

      const actual = loadRoutes(routes, safeRequire)
      expect(actual.routes).toEqual([routeOneReturnValue, routeTwoReturnValue])
      expect(safeRequire).toHaveBeenCalledWith(routeOne)
      expect(safeRequire).toHaveBeenCalledWith(routeTwo)
    })
  })

  describe('register', () => {
    it('applies the mapping function over each route and returns the modified Router', () => {
      const app = express()
      const router = {
        routes: [
          [{handler: 'one', httpMethod: 'GET', path: 'api/v1/one', require: '~/app/controllers/home'}, {}],
          [{handler: 'two', httpMethod: 'GET', path: 'api/v1/two', require: '~/app/controllers/home'}, {}]
        ]
      }
      const mapper = jest.fn()
      mapper.mockReturnValue(([route: Route, routeModule: Object | Error]) =>
        [R.evolve({ path: R.concat(R.__, '/other/path') })(route), routeModule]
      )

      const expected = {
        routes: [
          [{handler: 'one', httpMethod: 'GET', path: 'api/v1/one/other/path', require: '~/app/controllers/home'}, {}],
          [{handler: 'two', httpMethod: 'GET', path: 'api/v1/two/other/path', require: '~/app/controllers/home'}, {}]
        ]
      }
      const actual = register(app, router, mapper)

      expect(mapper).toHaveBeenCalledWith(app)
      expect(actual).toEqual(expected)
    })
  })

  describe('registerExpressRoute', () => {
    runTestCases(
      ([route: Route, controller: Object], _index: number): void => {
        const app = {
          delete: jest.fn(),
          get: jest.fn(),
          head: jest.fn(),
          patch: jest.fn(),
          post: jest.fn(),
          put: jest.fn()
        }
        registerExpressRoute(app, [route, controller])
        const mock = app[R.toLower(route.httpMethod)]
        expect(mock).toHaveBeenCalledWith(route.path, controller[route.handler])
      },
      [
        [
          {handler: 'root', httpMethod: 'GET', path: 'api/v1', require: '~/app/controllers/home'},
          {root: 'root route'}
        ],
        [
          {handler: 'health', httpMethod: 'HEAD', path: 'api/v1/health', require: '~/app/controllers/home'},
          {health: 'health route'}
        ],
        [
          {handler: 'create', httpMethod: 'POST', path: 'api/v1/users', require: '~/app/controllers/users'},
          {create: 'create route'}
        ],
        [
          {handler: 'update', httpMethod: 'PATCH', path: 'api/v1/users/:id', require: '~/app/controllers/users'},
          {update: 'update (patch) route'}
        ],
        [
          {handler: 'update', httpMethod: 'PUT', path: 'api/v1/admin/offerings', require: '~/app/controllers/some-other-path/offerings'},
          {update: 'update (put) route'}
        ],
        [
          {handler: 'destroyEverything', httpMethod: 'DELETE', path: 'api/v1/admin/destroy-site', require: '~/app/controllers/some-other-path/home'},
          {destroyEverything: 'destroy route'}
        ]
      ]
    )
  })

  describe('resolve', () => {
    it('converts an array of routes into a Router type, resolving through the given routeLoader', () => {
      const routes = [
        {handler: 'root', httpMethod: 'GET', path: 'api/v1', require: '~/app/controllers/home'},
        {handler: 'health', httpMethod: 'HEAD', path: 'api/v1/health', require: '~/app/controllers/home'}
      ]

      const routeLoader = jest.fn()
      routeLoader.mockReturnValue({ routes: routes })

      const cachedPathsBuilder = jest.fn()
      cachedPathsBuilder.mockReturnValue({})

      const expected = { routes, paths: {} }
      const actual = resolve(routes, routeLoader, cachedPathsBuilder)
      expect(routeLoader).toHaveBeenCalledWith(routes)
      expect(cachedPathsBuilder).toHaveBeenCalledWith(routes)
      expect(actual).toEqual(expected)
    })
  })

  describe('routeModuleTupleToPathBuilder', () => {
    it('doesn\'t require a properties argument to generate a path', () => {
      const route = { handler: 'one', httpMethod: 'GET', path: 'api/v1/one', require: '~/app/controllers/one' }
      const expected = route.path
      const actual = routeModuleTupleToPathBuilder([route, {}])()
      expect(actual).toEqual(expected)
    })

    runTestCases(
      ({ args, expected }) => {
        const [route, properties] = args
        const actual = routeModuleTupleToPathBuilder([route, {}])(properties)
        expect(actual).toEqual(expected)
      },
      [
        {
          description: 'not given any properties it returns the route path',
          args: [
            { handler: 'one', httpMethod: 'GET', path: 'api/v1/one', require: '~/app/controllers/one' }
          ],
          expected: 'api/v1/one'
        },
        {
          description: 'given null properties it returns the route path',
          args: [
            { handler: 'one', httpMethod: 'GET', path: 'api/v1/one', require: '~/app/controllers/one' },
            null
          ],
          expected: 'api/v1/one'
        },
        {
          description: 'given undefined properties it returns the route path',
          args: [
            { handler: 'one', httpMethod: 'GET', path: 'api/v1/one', require: '~/app/controllers/one' },
            undefined
          ],
          expected: 'api/v1/one'
        },
        {
          description: 'given empty properties it returns the route path',
          args: [
            { handler: 'one', httpMethod: 'GET', path: 'api/v1/one', require: '~/app/controllers/one' },
            {}
          ],
          expected: 'api/v1/one'
        },
        {
          description: 'ignores mis-matched properties',
          args: [
            { handler: 'one', httpMethod: 'GET', path: 'api/v1/one/:id', require: '~/app/controllers/one' },
            { id: '123', some: 'prop' }
          ],
          expected: 'api/v1/one/123'
        },
        {
          description: 'given matching properties it returns the path with the properties replaced',
          args: [
            { handler: 'one', httpMethod: 'GET', path: 'api/v1/one/:id', require: '~/app/controllers/one' },
            { id: '123' }
          ],
          expected: 'api/v1/one/123'
        },
        {
          description: 'given route path with properties when properties are not given',
          args: [
            { handler: 'one', httpMethod: 'GET', path: 'api/v1/one/:id', require: '~/app/controllers/one' },
            { other: 'prop' }
          ],
          expected: 'api/v1/one/:id'
        },
        {
          description: 'doesn\'t replace partial properties',
          args: [
            { handler: 'one', httpMethod: 'GET', path: 'api/v1/one/:supercalifragilistic', require: '~/app/controllers/one' },
            { super: 'nope', supercalifragilistic: 'yep' }
          ],
          expected: 'api/v1/one/yep'
        },
        {
          description: 'doesn\'t replace partial properties (reversed)',
          args: [
            { handler: 'one', httpMethod: 'GET', path: 'api/v1/one/:super', require: '~/app/controllers/one' },
            { super: 'yep', supercalifragilistic: 'nope' }
          ],
          expected: 'api/v1/one/yep'
        },
        {
          description: 'replaces multiple properties',
          args: [
            { handler: 'one', httpMethod: 'GET', path: 'api/v1/one/:parentId/things/:id', require: '~/app/controllers/one' },
            { id: '456', parentId: '123' }
          ],
          expected: 'api/v1/one/123/things/456'
        },
        {
          description: 'replaces properties at beginning of path',
          args: [
            { handler: 'one', httpMethod: 'GET', path: ':atBeginning/api/v1/one/:atEnd', require: '~/app/controllers/one' },
            { atBeginning: 'sunrise', atEnd: 'sunset' }
          ],
          expected: 'sunrise/api/v1/one/sunset'
        }
      ]
    )
  })

  describe('safeRequireRouteModule', () => {
    it('returns a tuple of the given route and it\'s validly required module', () => {
      const route = {handler: 'root', httpMethod: 'GET', path: 'api/v1', require: '~/app/controllers/home'}
      const routeModule = {root: () => {}}
      const moduleRequirer = jest.fn()
      moduleRequirer.mockReturnValue(routeModule)

      const expected = [route, routeModule]
      const actual = safeRequireRouteModule(route, moduleRequirer)
      expect(actual).toEqual(expected)
      expect(moduleRequirer).toHaveBeenCalledWith(route.require)
    })

    it('returns a tuple of the given route and it\'s validly required module', () => {
      const route = {handler: 'root', httpMethod: 'GET', path: 'api/v1', require: '~/app/controllers/home'}
      const moduleRequirer = (path: string) => { throw new Error(`Module ${path} not found`) }

      const actual = safeRequireRouteModule(route, moduleRequirer)
      expect(actual).toEqual([route, new Error(`Module ${route.require} not found`)])
    })
  })
})

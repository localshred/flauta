/* @flow */
/* eslint-env jest */

import R from 'ramda'
import { DEFAULT_RESOURCES, applyNamespaceToRoute, destroy, get, head, patch, post, put,
  resources, resourcePath, namespace } from '~/src/dsl'
import { runTestCases } from '~/test/helpers/define-cases'

describe('~/src/dsl', () => {
  describe('applyNamespaceToRoute', () => {
    runTestCases(
      ({ args, expected }) => expect(applyNamespaceToRoute(...args)).toEqual(expected),
      [
        {
          description: 'prepends the namespace definition\'s require and path properties to the given route properties',
          args: [
            {require: 'foo/bar', path: 'foo/bar'},
            {require: 'requirebaz', 'path': 'pathbaz'}
          ],
          expected: {require: 'foo/bar/requirebaz', path: 'foo/bar/pathbaz'}
        }
      ]
    )
  })

  describe('methods', () => {
    const testArgs = ['foo', 'bar', 'baz']
    const testExpectation = {path: 'foo', require: 'bar', handler: 'baz'}

    runTestCases(
      ([[fn, args], expected]) => expect(fn(...args)).toEqual(expected),
      [
        [[destroy, testArgs], R.merge(testExpectation, {httpMethod: 'DELETE'})],
        [[get, testArgs], R.merge(testExpectation, {httpMethod: 'GET'})],
        [[head, testArgs], R.merge(testExpectation, {httpMethod: 'HEAD'})],
        [[patch, testArgs], R.merge(testExpectation, {httpMethod: 'PATCH'})],
        [[post, testArgs], R.merge(testExpectation, {httpMethod: 'POST'})],
        [[put, testArgs], R.merge(testExpectation, {httpMethod: 'PUT'})],
        [[get, R.append({ as: 'users' }, testArgs)], R.merge(testExpectation, { httpMethod: 'GET', as: 'users' })]
      ]
    )
  })

  describe('resourcePath', () => {
    runTestCases(
      ([args, expected]) => expect(resourcePath(...args)).toEqual(expected),
      [
        [ ['users'], 'users' ],
        [ ['users', undefined], 'users' ],
        [ ['users', null], 'users' ],
        [ ['users', {}], 'users' ],
        [ ['users', { as: 'friends' }], 'friends' ]
      ]
    )
  })

  describe('DEFAULT_RESOURCES', () => {
    runTestCases(
      ({ args: method_and_args, expected }) => {
        const methodName = R.head(method_and_args)
        const args = R.nth(1, method_and_args)
        const method = DEFAULT_RESOURCES[methodName]
        const actual = R.apply(method, args)
        expect(actual).toEqual(expected)
      },
      [
        {
          description: 'create does not take as: property directly, but it does modify the path',
          args: ['create', ['users', { as: 'another/path' }]],
          expected: { httpMethod: 'POST', path: 'another/path', require: 'users', handler: 'create' }
        },
        {
          description: 'destroy does not take as: property directly, but it does modify the path',
          args: ['destroy', ['users', { as: 'another/path' }]],
          expected: { httpMethod: 'DELETE', path: 'another/path/:id', require: 'users', handler: 'destroy' }
        },
        {
          description: 'update does not take as: property directly, but it does modify the path',
          args: ['update', ['users', { as: 'another/path' }]],
          expected: { httpMethod: 'PATCH', path: 'another/path/:id', require: 'users', handler: 'update' }
        },
        {
          description: 'index pluralizes the as: property directly as well as manipulates the path',
          args: ['index', ['users', { as: 'friends' }]],
          expected: { httpMethod: 'GET', path: 'friends', require: 'users', handler: 'index', as: 'friends' }
        },
        {
          description: 'show singularizes the as: property directly as well as manipulates the path',
          args: ['show', ['users', { as: 'friends' }]],
          expected: { httpMethod: 'GET', path: 'friends/:id', require: 'users', handler: 'show', as: 'friend' }
        }
      ]
    )
  })

  describe('resources', () => {
    runTestCases(
      ({ args, expected }) => expect(resources(...args)).toEqual(expected),
      [
        {
          description: 'generates all resource endpoints',
          args: ['users'],
          expected: [
            {handler: 'create', httpMethod: 'POST', path: 'users', require: 'users'},
            {handler: 'destroy', httpMethod: 'DELETE', path: 'users/:id', require: 'users'},
            {handler: 'index', httpMethod: 'GET', path: 'users', require: 'users', as: 'users'},
            {handler: 'show', httpMethod: 'GET', path: 'users/:id', require: 'users', as: 'user'},
            {handler: 'update', httpMethod: 'PATCH', path: 'users/:id', require: 'users'}
          ]
        },

        {
          description: 'generates all resource endpoints with hyphens',
          args: ['resource-with-hyphens'],
          expected: [
            {handler: 'create', httpMethod: 'POST', path: 'resource-with-hyphens', require: 'resource-with-hyphens'},
            {handler: 'destroy', httpMethod: 'DELETE', path: 'resource-with-hyphens/:id', require: 'resource-with-hyphens'},
            {handler: 'index', httpMethod: 'GET', path: 'resource-with-hyphens', require: 'resource-with-hyphens', as: 'resource-with-hyphens'},
            {handler: 'show', httpMethod: 'GET', path: 'resource-with-hyphens/:id', require: 'resource-with-hyphens', as: 'resource-with-hyphen'},
            {handler: 'update', httpMethod: 'PATCH', path: 'resource-with-hyphens/:id', require: 'resource-with-hyphens'}
          ]
        },

        {
          description: 'generates only the provided endpoints',
          args: ['users', {only: ['show', 'destroy']}],
          expected: [
            {handler: 'show', httpMethod: 'GET', path: 'users/:id', require: 'users', as: 'user'},
            {handler: 'destroy', httpMethod: 'DELETE', path: 'users/:id', require: 'users'}
          ]
        },

        {
          description: 'generates all endpoints except those provided',
          args: ['users', {except: ['show', 'destroy']}],
          expected: [
            {handler: 'create', httpMethod: 'POST', path: 'users', require: 'users'},
            {handler: 'index', httpMethod: 'GET', path: 'users', require: 'users', as: 'users'},
            {handler: 'update', httpMethod: 'PATCH', path: 'users/:id', require: 'users'}
          ]
        },

        {
          description: 'generates the union of :only and :except endpoints',
          args: ['users', {only: ['show', 'destroy'], except: ['destroy']}],
          expected: [
            {handler: 'show', httpMethod: 'GET', path: 'users/:id', require: 'users', as: 'user'}
          ]
        },

        {
          description: 'does not generate any endpoints if only and except attributes negate each other',
          args: ['users', {only: ['destroy'], except: ['destroy']}],
          expected: []
        },

        {
          description: 'generates endpoints with given :as name instead of resource name, changing both as: and path: properties',
          args: ['users', {as: 'friends'}],
          expected: [
            {handler: 'create', httpMethod: 'POST', path: 'friends', require: 'users'},
            {handler: 'destroy', httpMethod: 'DELETE', path: 'friends/:id', require: 'users'},
            {handler: 'index', httpMethod: 'GET', path: 'friends', require: 'users', as: 'friends'},
            {handler: 'show', httpMethod: 'GET', path: 'friends/:id', require: 'users', as: 'friend'},
            {handler: 'update', httpMethod: 'PATCH', path: 'friends/:id', require: 'users'}
          ]
        }
      ]
    )
  })

  describe('namespace', () => {
    runTestCases(
      ({args, expected}) => expect(namespace(...args)).toEqual(expected),
      [
        {
          description: 'single level namespace',
          args: [
            {path: 'api/v1', require: '~/app/controllers'},
            [
              get('/', 'home', 'root'),
              resources('users', {only: ['index', 'show']})
            ]
          ],
          expected: [
            {handler: 'root', httpMethod: 'GET', path: 'api/v1/', require: '~/app/controllers/home'},
            [
              {handler: 'index', httpMethod: 'GET', path: 'api/v1/users', require: '~/app/controllers/users', as: 'api-v1-users'},
              {handler: 'show', httpMethod: 'GET', path: 'api/v1/users/:id', require: '~/app/controllers/users', as: 'api-v1-user'}
            ]
          ]
        },

        {
          description: 'override :path with :as parameter at namespace',
          args: [
            {path: 'api/v1', require: '~/app/controllers', as: 'foo-bar'},
            [
              get('/', 'home', 'root'),
              resources('users', {only: ['index', 'show']})
            ]
          ],
          expected: [
            {handler: 'root', httpMethod: 'GET', path: 'api/v1/', require: '~/app/controllers/home'},
            [
              {handler: 'index', httpMethod: 'GET', path: 'api/v1/users', require: '~/app/controllers/users', as: 'foo-bar-users'},
              {handler: 'show', httpMethod: 'GET', path: 'api/v1/users/:id', require: '~/app/controllers/users', as: 'foo-bar-user'}
            ]
          ]
        },

        {
          description: 'multiple nested namespaces',
          args: [
            {path: 'api/v1', require: '~/app/controllers'},
            [
              get('/', 'home', 'root'),
              resources('users', {only: ['index', 'show']}),
              namespace({path: 'admin', require: 'some-other-path'}, [
                resources('offerings', {only: ['index']}),
                destroy('/destroy-site', 'home', 'destroyEverything')
              ])
            ]
          ],
          expected: [
            {handler: 'root', httpMethod: 'GET', path: 'api/v1/', require: '~/app/controllers/home'},
            [
              {handler: 'index', httpMethod: 'GET', path: 'api/v1/users', require: '~/app/controllers/users', as: 'api-v1-users'},
              {handler: 'show', httpMethod: 'GET', path: 'api/v1/users/:id', require: '~/app/controllers/users', as: 'api-v1-user'}
            ],
            [
              [
                {handler: 'index', httpMethod: 'GET', path: 'api/v1/admin/offerings', require: '~/app/controllers/some-other-path/offerings', as: 'api-v1-admin-offerings'}
              ],
              {handler: 'destroyEverything', httpMethod: 'DELETE', path: 'api/v1/admin/destroy-site', require: '~/app/controllers/some-other-path/home'}
            ]
          ]
        }
      ]
    )
  })
})

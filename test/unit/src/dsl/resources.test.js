/* @flow */
/* eslint-env jest */

import R from 'ramda'
import { DEFAULT_RESOURCES, resources, resourcePath } from '~/src/dsl/resources'
import { runTestCases } from '~/test/helpers/define-cases'

describe('~/src/dsl/resources', () => {
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
})

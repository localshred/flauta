/* @flow */
/* eslint-env jest */

import R from 'ramda'
import { applyNamespaceToRoute, destroy, get, head, patch, post, put, namespace } from '~/src/dsl'
import { resources } from '~/src/dsl/resources'
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

  describe('route methods', () => {
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

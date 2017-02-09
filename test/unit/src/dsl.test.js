/* @flow */
/* eslint-env jest */

import { applyNamespaceToRoute, namespace } from '~/src/dsl'
import { destroy, get } from '~/src/dsl/http'
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

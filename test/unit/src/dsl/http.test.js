/* @flow */
/* eslint-env jest */

import R from 'ramda'
import { destroy, get, head, patch, post, put } from '~/src/dsl/http'
import { runTestCases } from '~/test/helpers/define-cases'

describe('~/src/dsl/http', () => {
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
})


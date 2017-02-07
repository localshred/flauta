/* @flow */
/* eslint-env jest */

import { mergeIfPresent, tapLog } from '~/src/ramda-extensions'

describe('~/src/ramda-extensions', () => {
  describe('mergeIfPresent', () => {
    it('merges one object onto another if both are non-null', () => {
      const base = { foo: 'foo', bar: 'bar' }
      const other = { foo: 'foo other' }

      const expected = { foo: 'foo other', bar: 'bar' }
      const actual = mergeIfPresent(base, other)
      expect(actual).toEqual(expected)
    })

    it('does not perform a merge if the other object is null/undefined', () => {
      const base = { foo: 'foo', bar: 'bar' }
      expect(mergeIfPresent(base, null)).toEqual(base)
      expect(mergeIfPresent(base, undefined)).toEqual(base)
    })
  })

  describe('tapLog', () => {
    it('returns the data argument the same way tap does', () => {
      const data = [1, 2, 3]
      const noop = () => {}
      const actual = tapLog('A header', noop)(data)
      expect(actual).toBe(data)
    })

    it('logs a header and the given data to the console', () => {
      const data = [1, 2, 3]
      const logger = jest.fn()
      const actual = tapLog('A header', logger)(data)
      expect(actual).toBe(data)
      expect(logger).toHaveBeenCalledWith('--------', 'A header', data)
    })
  })
})

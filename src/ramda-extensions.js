/* @flow */
/** @namespace ramda-extensions */

import R from 'ramda'

/**
 * Given an argument, it returns if that argument is not nil (true) or nil (false).
 *
 * @function isPresent
 * @memberof ramda-extensions
 * @static
 * @param {*} value - The value to assert presence on.
 * @returns {boolean} - Whether the argument was nil or not.
 *
 * @example
 *
 * > isPresent(null)
 * false
 *
 * > isPresent(undefined)
 * false
 *
 * > isPresent({})
 * true
 *
 * > isPresent({foo: 'bar'})
 * true
 *
 * > isPresent([])
 * true
 *
 * > isPresent([1, 2, 3])
 * true
 *
 */
const isPresent: bool = R.pipe(R.isNil, R.not)

/**
 * Given an object and a possibly nil object, merge the second onto the first only if it's not nil.
 *
 * @function mergeIfPresent
 * @memberof ramda-extensions
 * @static
 * @param {object} base - The base object to merge onto.
 * @param {?object} other - The other argument to merge onto the base, if any.
 * @returns {object} - The result of the merge.
 *
 * @example
 *
 * > mergeIfPresent({foo: 'bar'}, null)
 * {foo: 'bar'}
 *
 * > mergeIfPresent({foo: 'bar'}, undefined)
 * {foo: 'bar'}
 *
 * > mergeIfPresent({foo: 'bar'}, {cat: 'meow'})
 * {foo: 'bar', cat: 'meow'}
 *
 * > mergeIfPresent({foo: 'bar', cat: 'meow'}, {foo: 'hello'})
 * {foo: 'hello', cat: 'meow'}
 *
 */
const mergeIfPresent = R.curry((
  base: Object,
  other: ?Object
) =>
  R.merge(base, R.defaultTo({}, other))
)

/**
 * Takes a property to return (if present) and a thunk to evaluate if not. If the target object
 * has the property it is returned. If the target object does not have the property then the thunk
 * is invoked and it's return value is returned instead.
 *
 * @function propOrLazy
 * @memberof ramda-extensions
 * @static
 * @param {string} prop - The property to access.
 * @param {function} thunk - The thunk to evaluate if the property is nil.
 * @param {object} target - The target object to access the property on.
 *
 * @returns {*} - The value of the property (if present), or the result of the evaluated thunk.
 *
 * @example
 *
 * > propOrLazy('foo', () => 'some expensive computation', { foo: 'bar' })
 * 'bar'
 *
 * > propOrLazy('foo', () => 'some expensive computation', {})
 * 'some expensive computation'
 *
 */
const propOrLazy = R.curry((
  prop: string,
  defaultThunk: () => any,
  target: Object
): any =>
  R.either(
    R.prop(prop),
    defaultThunk
  )(target)
)

/**
 * Fulfills a common use-case which is the desire to log out data flowing through a pipe at
 * a specific point in the pipeline with a specific tag value. tapLog taps into an R.pipe or
 * R.compose to log out the given data at that stage of the pipe/composition.
 *
 * See R.tap documentation for more information.
 *
 * @function tapLog
 * @memberof ramda-extensions
 * @static
 * @param {string} tag - The tag value to log out before the given data.
 * @param {function=} logger - The logger to use (default is console.log).
 * @param {...*} data - Any set of data you wish to log.
 *
 * @returns {...*} - The final data argument(s) provided are returned as with a normal tap.
 *
 * @example
 *
 *   R.pipe(
 *     tapLog('before'),    // logs { before: [[1, 2, 3]])
 *     R.map((x) => x * x),
 *     tapLog('mapped'),    // logs { mapped: [[1, 4, 9]]
 *     R.filter(isOdd),
 *     tapLog('filtered'),  // logs { filtered: [[1, 9]] }
 *   )([1, 2, 3])
 *
 * The preceding pipe would perform three map transformations over myData, logging the transformed
 * data after each map.
 *
 */
const tapLog = (tag: string, logger: (...data: Array<any>) => void = R.bind(console.log, console)): (...data: Array<any>) => any =>
  R.tap(
    (...data: Array<any>): any =>
      R.call(
        logger,
        R.pipe(R.length, R.repeat('-'), R.join(''))(tag),
        tag,
        ...data
      )
  )

export {
  isPresent,
  mergeIfPresent,
  propOrLazy,
  tapLog
}

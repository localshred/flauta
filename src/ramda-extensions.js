/* @flow */
/* @doctests */

import R from 'ramda'

// isPresent :: a -> Bool
//
// Given an argument, it returns if that argument is not nil (true) or nil (false).
//
// > isPresent(null)
// false
//
// > isPresent(undefined)
// false
//
// > isPresent({})
// true
//
// > isPresent({foo: 'bar'})
// true
//
// > isPresent([])
// true
//
// > isPresent([1, 2, 3])
// true
//
export const isPresent: bool = R.pipe(R.isNil, R.not)

// mergeIfPresent Object a :: a -> Maybe a -> a
//
// Given an object and a possibly nil object, merge the second onto the first only if it's not nil.
//
// > mergeIfPresent({foo: 'bar'}, null)
// {foo: 'bar'}
//
// > mergeIfPresent({foo: 'bar'}, undefined)
// {foo: 'bar'}
//
// > mergeIfPresent({foo: 'bar'}, {cat: 'meow'})
// {foo: 'bar', cat: 'meow'}
//
// > mergeIfPresent({foo: 'bar', cat: 'meow'}, {foo: 'hello'})
// {foo: 'hello', cat: 'meow'}
//
export const mergeIfPresent = R.curry((base: Object, other: Object | null) =>
  R.merge(base, R.defaultTo({}, other)))

// propOrLazy :: String -> (*) -> Object
//
// Takes a property to return (if present) and a thunk to evaluate if not. If the target object
// has the property it is returned. If the target object does not have the property then the thunk
// is invoked and it's return value is returned instead.
//
// > propOrLazy('foo', () => 'some expensive computation', { foo: 'bar' })
// 'bar'
//
// > propOrLazy('foo', () => 'some expensive computation', {})
// 'some expensive computation'
//
export const propOrLazy = R.curry((prop: string, defaultThunk: () => any, target: Object): any =>
  R.either(
    R.prop(prop),
    defaultThunk
  )(target)
)

// tapLog :: String -> * | [*] -> * | [*]
//
// tapLog fulfills a common use-case which is the desire to log out data flowing through a pipe at
// a specific point in the pipeline with a specific tag value. tapLog taps into an R.pipe or
// R.compose to log out the given data at that stage of the pipe/composition.
//
// See R.tap documentation for more information.
//
// For example:
//
//   R.pipe(
//     tapLog('before'),    // logs { before: [[1, 2, 3]])
//     R.map((x) => x * x),
//     tapLog('mapped'),    // logs { mapped: [[1, 4, 9]]
//     R.filter(isOdd),
//     tapLog('filtered'),  // logs { filtered: [[1, 9]] }
//   )([1, 2, 3])
//
// The preceding pipe would perform three map transformations over myData, logging the transformed
// data after each map.
//
export const tapLog = (tag: string): (...data: Array<any>) => any =>
  R.tap((...data: Array<any>): any => R.call(R.bind(console.log, console), '-----', tag, ...data))

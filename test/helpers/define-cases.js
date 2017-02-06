/* @flow */
/* eslint-env jest */

import R from 'ramda'
import { propOrLazy } from '~/src/ramda-extensions'

export type TestCase<A, E> =
  | [A, E]
  | {args: A, expected: E, description?: string}

export type TestCases<A, E> = Array<TestCase<A, E>>
export type AssertFunction<A, E> = (testCase: TestCase<A, E>) => bool | void

// caseDefiner :: (a -> void) -> a -> Number -> void
//
// caseDefiner takes an assert function, a testCase, and an index number and definess a new
// tests case (using `it`) which will pass the given testCase to the assert function during the
// test run.
//
// This is a shorthand way of defining tests when the test assertion itself is always the same but
// you want to feed in a number of test cases (of any shape). This is best used implicitly in
// conjunction with `runTestCases` which is defined below.
//
// For example:
//
//    const add = (x, y) => x + y
//
//    runTestCases(
//      ([args, expected]) => expect(add(...args)).toEqual(expected),
//      [
//        [[1, 2], 3],
//        [[1, 3], 4],
//        [[1, 4], 5],
//        [[1, 5], 6]
//      ]
//    )
//
export const caseDefiner = <A, E>(
  assertFn: AssertFunction<A, E>,
  testCase: TestCase<A, E>,
  index: number
): void => {
  const description: string = propOrLazy(
    'description',
    () => `case: ${JSON.stringify(testCase)}`,
    testCase
  )

  it(description, () => { assertFn(testCase) })
}

// runTestCases :: (* -> void) -> [*] -> void
//
// Binds the assert function to R.forEach (which will be invoked with the data and the index).
//
// For example:
//
//    const add = (x, y) => x + y
//
//    runTestCases(
//      ([args, expected]) => expect(add(...args)).toEqual(expected),
//      [
//        [[1, 2], 3],
//        [[1, 3], 4],
//        [[1, 4], 5],
//        [[1, 5], 6]
//      ]
//    )
//
export const runTestCases = <A, E>(
  assertFn: Function,
  testCases: TestCases<A, E>
) =>
  R.addIndex(R.forEach)(
    R.curry(caseDefiner)(assertFn),
    testCases
  )

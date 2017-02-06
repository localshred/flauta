import R from 'ramda'
import { routes } from '~/app/server/routes'
import { type Route } from '~/app/lib/router/dsl'

const FIELDS = ['as', 'httpMethod', 'path', 'require', 'handler']
const FIELD_SEPARATOR_DISTANCE = 4
const HEADERS = ['Path Helper', 'Verb', 'URI Pattern', 'Controller Module', 'Handler']

const log = R.bind(console.log, console)

const routeToPrintableProps = ([route: Route, _module: mixed]): Array<string> =>
  R.props(FIELDS, route)

const computeMaxFieldSizes = (lines: Array<Array<string>>): [Array<Array<string>>, Array<number>] =>
  R.pair(
    lines,
    R.pipe(
      R.transpose,
      R.map(R.reduce((fieldMaximum, field) => R.max(R.length(field), fieldMaximum), 0))
    )(lines)
  )

const printLine = R.curry((sizes: Array<number>, fields: Array<string>): void =>
  R.pipe(
    R.zip(sizes),
    R.map(printField),
    R.join(''),
    log
  )(fields)
)

const printLines = ([lines: Array<Array<string>>, sizes: Array<number>]): void =>
  R.forEach(printLine(sizes), lines)

const printField = R.curry(([size: number, field: string]): void => {
  const padLength = R.add(FIELD_SEPARATOR_DISTANCE, size)
  const padding = R.join('', R.repeat(' ', padLength))
  return (R.defaultTo('', field) + padding).substring(0, padLength)
})

const main = () =>
  R.pipe(
    R.map(routeToPrintableProps),
    R.prepend(HEADERS),
    computeMaxFieldSizes,
    printLines
  )(routes().routes)

main()

import fs from 'fs'
import minimist from 'minimist'
import path from 'path'
import R from 'ramda'
import { type Route } from '~/src/dsl'
import { type RouteModuleTuple } from '~/src/router'

type ParsedArguments = {
  _: Array<string>,
  babel?: bool
}

export type RouteModule = {
  resolve: () => Router,
  register: (app: express$Application) => Router,
}

const FIELDS = ['as', 'httpMethod', 'path', 'require', 'handler']
const FIELD_SEPARATOR_DISTANCE = 4
const HEADERS = ['Path Helper', 'Verb', 'URI Pattern', 'Controller Module', 'Handler']

const log = R.bind(console.log, console)

const routeToPrintableProps = ([route: Route, _module: mixed]): Array<string> =>
  R.props(FIELDS, route)

const routeToPrintablePropsWithError = ([route: Route, error: Error]): Array<string> =>
  R.pipe(
    R.props(R.tail(FIELDS)),
    R.append(R.prop('message', error))
  )(route)

const computeMaxFieldSizes = (lines: Array<Array<string>>): [Array<Array<string>>, Array<number>] =>
  R.pair(
    lines,
    R.pipe(
      R.transpose,
      R.map(R.reduce((fieldMaximum, field) => R.max(R.length(field || ''), fieldMaximum), 0)),
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
  const padLength = R.add(FIELD_SEPARATOR_DISTANCE, R.defaultTo(0, size))
  const padding = R.join('', R.repeat(' ', padLength))
  return (R.defaultTo('', field) + padding).substring(0, padLength)
})

const ensureReadableFile = (argv): ParsedArguments | Error => {
  const file = R.head(argv._)
  if (!fs.existsSync(file)) {
    throw new Error(`File '${file}' does not exist or is not readable`)
  }

  return argv
}

const requireRouterFile = (argv: ParsedArguments): Object | Error =>
  require(path.join('../../..', R.head(argv._)))

const optionallyEnableBabelRegister = (argv: ParsedArguments): ParsedArguments => {
  if (argv.babel) {
    require('babel-register')()
  }

  return argv
}

const printRouter = (routeModule: RouteModule) => {
  const router: Router = routeModule.resolve()
  printRoutes(router.routes)
  printInvalidRoutes(router.invalidRoutes)
}

const printRoutes = (routes: Array<RouteModuleTuple>): void =>
  R.unless(
    R.isEmpty,
    R.pipe(
    R.tap(() => console.log('[Valid Routes]')),
      R.map(routeToPrintableProps),
      R.prepend(HEADERS),
      computeMaxFieldSizes,
      printLines
    )
  )(routes)

const printInvalidRoutes = (invalidRoutes?: Array<?RouteModuleTuple>): void =>
  R.unless(
    R.isEmpty,
    R.pipe(
      R.tap(() => console.log('[Invalid Routes]')),
      R.map(routeToPrintablePropsWithError),
      R.prepend(R.append('Error', R.tail(HEADERS))),
      computeMaxFieldSizes,
      printLines
    )
  )(R.defaultTo([], invalidRoutes))

const main = () =>
  R.pipe(
    minimist,
    ensureReadableFile,
    optionallyEnableBabelRegister,
    requireRouterFile,
    printRouter
  )(process.argv.slice(2))

main()

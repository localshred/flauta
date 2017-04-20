/* @flow */

import { register, resolve } from '~/src/router'
import { namespace } from '~/src/dsl'
import { destroy, get, head, patch, post, put, route } from '~/src/dsl/http'
import { resources } from '~/src/dsl/resources'

export default { register, resolve, namespace, destroy, get, head, patch, post, put, route, resources }

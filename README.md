# Flauta

Flauta is configuration library that aims to provide a single-location routing DSL for server applications.
If you've used Rails before think [`config/routes.rb`][routes-rb]. Currently supports only Express.

Some features include:

+ Single file to declare all routes for use with Express.
+ Simple DSL to describe route endpoints; includes regular HTTP verbs, declaring resources, and namespace support.
+ Generated path helper functions for easily returning valid paths, with support for parameter replacements.
+ Script to print out the route declarations in an easy-to-consume format. Invalid routes are printed with the corresponding error.
+ Support for using `babel-register` in all requires in case you are writing application code that needs to be compiled first.

## Install

```shell
$ npm install --save flauta

# or

$ yarn add flauta
```

## Usage

1. Create a routes file somewhere in your server-side code (e.g. `server/routes.js`).
2. Populate the routes file with two functions: `register` and `resolve`. (See below for description and example)
3. Import your `register` function into the server file which creates your Express application and pass the express app to the `register` function.
4. Optionally print your route declaration by running `flauta path/to/routes.js`
4. Bask in the glory of being able to easily understand which routes your server supports.

### Example

Define your routes:

```javascript
// myapp/server/routes.js
import flauta from 'flauta'

// Provide a registration function pre-bound to your resolved routes
export const register = (app) => flauta.register(app, resolve())

// Define and resolve your routes. "Resolving" means to require all the controllers and ensure
// the expected handler functions are exported by those modules.
export resolve = flauta.resolve([

  // Configures the router to look for all your controllers in the server/controllers/ file tree.
  // NOTE: Since flauta will require your controllers for you, the base require path MUST be an
  // aboslute path. I recommend using path.join(__dirname, '../../../path/to/my/controllers')
  // as it will handle relative path resolution to the current directory of the routes.js file.
  flauta.namespace({path: '/', require: path.join(__dirname, 'controllers')}, [

    // Creates a route for the path / to be served by your server/controllers/home.js controller
    // with the exported function 'root' handling the request.
    flauta.get('/', 'home', 'root'),

    // If the resource doesn't have a corresponding controller it won't be registered
    // and a warning will be printed when you print your route definitions (see below).
    flauta.resource('bogus'),

    // Nested namespaces join url and require paths with their parent
    flauta.namespace({path: 'api/v1', require: 'api/v1'}, [
      // Creates 5 endpoints for working with the "users" resource:
      // + GET /api/v1/users (handler = index)
      // + GET /api/v1/users/:id (handler = show)
      // + POST /api/v1/users (handler = create)
      // + PATCH /api/v1/users/:id (handler = update)
      // + DELETE /api/v1/users/:id (handler = destroy)
      flauta.resources('users'),

      // Optionally restrict endpoints to register with 'only' or 'except' options:
      flauta.resources('todos', {only: ['index', 'create', 'show']}),

      // The inverse of above is:
      // flauta.resources('todos', {except: ['update', 'destroy']}),

      // ...
    ]),

    // ...
  ]),

  // ...
])
```

Then in your server file, import your `register` function and provide it with your express app:

```javascript
// server/app.js

import express from 'express'
import { register } from './routes'

const app = express()
register(app)
app.listen(process.env.PORT)
```

## Controller definitions

With flauta, a controller is simply a normal JS file that exports the expected handler functions. These
functions are exactly the same as you would write in a normal express app. If you want to have middleware
wrapping your endpoint handler just export an array of function references, the last being the route handler.


An example without middleware:

```javascript
// myapp/server/controllers/home.js

export function root(req, res) {
  res.json({ message: 'Hello, World!" })
}
```

An example with middelware:

```javascript
// myapp/server/controllers/home.js

function authMiddleware(req, res, next) { ... }
function loggerMiddleware(req, res, next) { ... }

function rootHandler(req, res) {
  res.json({ message: 'Hello, World!" })
}

export const root = [authMiddleware, loggerMiddleware, rootHandler]
```

## Printing your route definitions

In addition to the nicety of having all your routes defined in one place, we can actually provide a way
to print them to see the resolved state of your server side routes, meaning we can know exactly which
modules are required and used by our server, and which functions they expose to handle which endpoints.
The printer script is also babel-aware.

```shell
# If you don't need babel
$ ./node_modules/.bin/flauta path/to/my/routes.js
[Valid Routes]
Path Helper     Verb      URI Pattern          Controller Module                                      Handler
                GET       /                    /code/src/myapp/app/server/controllers/home            root
                POST      /api/v1/users        /code/src/myapp/app/server/controllers/api/v1/users    create
                DELETE    /api/v1/users/:id    /code/src/myapp/app/server/controllers/api/v1/users    destroy
api-v1-users    GET       /api/v1/users        /code/src/myapp/app/server/controllers/api/v1/users    index
api-v1-user     GET       /api/v1/users/:id    /code/src/myapp/app/server/controllers/api/v1/users    show
                PATCH     /api/v1/users/:id    /code/src/myapp/app/server/controllers/api/v1/users    update
                POST      /api/v1/todos        /code/src/myapp/app/server/controllers/api/v1/todos    create
api-v1-todos    GET       /api/v1/todos        /code/src/myapp/app/server/controllers/api/v1/todos    index
api-v1-todo     GET       /api/v1/todos/:id    /code/src/myapp/app/server/controllers/api/v1/todos    show
[Invalid Routes]
Verb      URI Pattern    Controller Module                               Handler    Error
POST      /bogus         /code/src/myapp/app/server/controllers/bogus    create     Cannot find module '/code/src/myapp/app/server/controllers/bogus'
DELETE    /bogus/:id     /code/src/myapp/app/server/controllers/bogus    destroy    Cannot find module '/code/src/myapp/app/server/controllers/bogus'
GET       /bogus         /code/src/myapp/app/server/controllers/bogus    index      Cannot find module '/code/src/myapp/app/server/controllers/bogus'
GET       /bogus/:id     /code/src/myapp/app/server/controllers/bogus    show       Cannot find module '/code/src/myapp/app/server/controllers/bogus'
PATCH     /bogus/:id     /code/src/myapp/app/server/controllers/bogus    update     Cannot find module '/code/src/myapp/app/server/controllers/bogus'
```

```shell
# Or if you need to use babel-register
$ ./node_modules/.bin/flauta --babel -- path/to/my/routes.js
```

  [routes-rb]: http://guides.rubyonrails.org/routing.html#listing-existing-routes "Rails Routing Guide"

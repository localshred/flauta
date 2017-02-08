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
// server/routes.js
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
    // with the exported function 'root'.
    flauta.get('/', 'home', 'root'),

    // Creates 5 endpoints for working with the "users" resource:
    // + GET /users (handler = index)
    // + GET /users/:id (handler = get)
    // + POST /users (handler = create)
    // + PATCH /users/:id (handler = update)
    // + DELETE /users/:id (handler = destroy)
    flauta.resources('users'),

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

## Printing your route definitions

```shell
# If you don't need babel
$ ./node_modules/.bin/flauta path/to/my/routes.js
[Valid Routes]
Path Helper         Verb      URI Pattern           Controller Module                                                        Handler
                    GET       /                     /code/src/services/enrollment/app/server/controllers/home                root
api-v1-offerings    GET       /api/v1/offerings     /code/src/services/enrollment/app/server/controllers/api/v1/offerings    index
                    POST      /api/v1/foobar        /code/src/services/enrollment/app/server/controllers/api/v1/foobar       create
                    DELETE    /api/v1/foobar/:id    /code/src/services/enrollment/app/server/controllers/api/v1/foobar       destroy
api-v1-foobars      GET       /api/v1/foobar        /code/src/services/enrollment/app/server/controllers/api/v1/foobar       index
[Invalid Routes]
Verb     URI Pattern           Controller Module                                                     Handler    Error
GET      /api/v1/foobar/:id    /code/src/services/enrollment/app/server/controllers/api/v1/foobar    show       Controller module missing the handler function
PATCH    /api/v1/foobar/:id    /code/src/services/enrollment/app/server/controllers/api/v1/foobar    update     Controller module missing the handler function
```

```
# Or if you do need babel
$ ./node_modules/.bin/flauta --babel -- path/to/my/routes.js
```

  [routes-rb]: http://guides.rubyonrails.org/routing.html#listing-existing-routes "Rails Routing Guide"

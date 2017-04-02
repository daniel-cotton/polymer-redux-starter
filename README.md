# Polymer Redux Starter Kit

[![Build Status](https://travis-ci.org/daniel-cotton/polymer-redux-starter.svg?branch=master)](https://travis-ci.org/daniel-cotton/polymer-redux-starter)

This template offers a starting point, based upon <a href="https://github.com/PolymerElements/polymer-starter-kit">Polymer App Toolbox - Starter Kit (PSK V2)</a>. Implementing <a href="https://github.com/tur-nr/polymer-redux">Polymer-Redux</a>, the PRPL pattern and Babel for ES2015 transpilation.

### Using The Starter

#### Dependencies

All dependencies are managed via Bower and NPM. Please ensure you have both
installed globally and run:

    bower install
    npm install

#### Start the development server

This command serves the app at `http://localhost:8080` and provides basic URL
routing for the app, in accordance with PSK V2:

    npm start

This development mode serve does not transpile any ES2015, we simply serve
the current directory via BrowserSync.

#### Build

This command performs a build of the app via Gulp, beginning with a Babel
transpliation of all project JavaScript.

The build will then optionally bundle any fragments with their dependencies.
In addition, a service-worker.js file is generated to pre-cache the app's routes
and fragments specified in `polymer.json`. The files are output to the
`dist` folder.

By default the below command will bundle the app output. This output is
generated using fragment bundling, suitable for serving from non
H2/push-compatible servers or to clients that do not support H2/Push.

    npm run build

If you are running a H2/Push compatible server - simply run the below
in order to recieve an un-bundled output.

    npm run build:unbundled

#### Run a clean of temporary and build files

This command removes all existing build and temporary files:

    npm run clean

#### Run tests

This command will run [Web Component Tester](https://github.com/Polymer/web-component-tester)
against the browsers currently installed on your machine and also run linting.

Note: The testing and will run POST Babel transpilation:

    npm test

### Adding a new view

You can extend the app by adding more views that will be demand-loaded
e.g. based on the route, or to progressively render non-critical sections of the
application. Each new demand-loaded fragment should be added to the list of
`fragments` in the included `polymer.json` file. This will ensure those
components and their dependencies are added to the list of pre-cached components
and will be included in the `bundled` build.


## FAQ

### What is the PRPL pattern?

The PRPL pattern, in a nutshell:

* **Push** components required for the initial route
* **Render** initial route ASAP
* **Pre-cache** components for remaining routes
* **Lazy-load** and progressively upgrade next routes on-demand

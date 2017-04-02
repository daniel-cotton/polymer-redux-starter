/* eslint-disable */

/*
    Constants
 */

const BUILD_DIR = 'dist/';
const TEST_DIR = '.tmp/';
/*
    Core Dependencies
 */
var gulp = require('gulp');
var del = require('del');
var gulpif = require('gulp-if');
var argv = require('yargs').argv;

/*
    Build Dependencies
 */
var polymerBuild = require('polymer-build');
var mergeStream = require('merge-stream');
var sourcemaps = require('gulp-sourcemaps');
var babel = require('gulp-babel');

/*
    Serve Dependencies
 */

var historyApiFallback = require('connect-history-api-fallback');
var browserSync = require('browser-sync');

/*
    Polymer Tool Construction
 */
var PolymerProject = polymerBuild.PolymerProject;
var HtmlSplitter = polymerBuild.HtmlSplitter;
var addServiceWorker = polymerBuild.addServiceWorker;
var sourcesHtmlSplitter = new HtmlSplitter();

/*
    Test Dependencies & setup
 */
require('web-component-tester').gulp.init(gulp, ['copy-temp']);

/*
    Config
 */

var swPreCache = require('./sw-precache-config.js');
var project = new PolymerProject(require('./polymer.json'));

/*
    Build Functions
 */

gulp.waitFor = function (stream) {
    return new Promise(function (resolve, reject) {
        stream.on('end', resolve);
        stream.on('error', function (error) {
            reject(new Error(error));
        });
    });
};

gulp.copy = function (src, dest) {
    return gulp.src(src, {base:"."})
        .pipe(gulp.dest(dest));
};

gulp.createServiceWorker = function (project, swPreCache, bundled) {
    return addServiceWorker({
        project: project,
        buildRoot: BUILD_DIR,
        swPrecacheConfig: swPreCache,
        bundled: bundled
    });
};

gulp.buildSources = function (sources) {
    return sources
        .pipe(sourcesHtmlSplitter.split()) // split streams
        .pipe(sourcemaps.init()) // Start preparing sourcemaps
        .pipe(gulpif('*.js', babel({
            presets: ['es2015']
        }))) // Babel transpiling
        .pipe(sourcemaps.write()) // Write those sourcemaps!
        .pipe(sourcesHtmlSplitter.rejoin());
};

gulp.getBuildStreams = function () {
    //  Build our build sources & import our dependencies. Then merge the streams.
    var stream = mergeStream(gulp.buildSources(project.sources()), project.dependencies());
    // Build bundled, if --bundled
    if (argv.bundled) {
        console.log('[BUILD] Bundling');
        return stream.pipe(project.bundler);
    } else {
        console.log('[BUILD] Returning Unbundled Output');
        return stream;
    }
};

/*
    Shared Tasks
 */

gulp.task('copy-temp', function () {
    gulp.copy('test/**/*', TEST_DIR);
    gulp.copy('bower_components/**/*', TEST_DIR);
    // Merge the streams
    return mergeStream(gulp.buildSources(project.sources()), project.dependencies())
    .pipe(gulp.dest(TEST_DIR)); // Pipe into build directory.
});

gulp.task('clean', function () {
    del([TEST_DIR]);
    del([BUILD_DIR]);
});


/*
     Executable 'Complete' Tasks
 */
gulp.task('serve', function () {
    browserSync({
        files: ["./**/*"],
        server: {
            baseDir: ".",
            middleware: [ historyApiFallback() ]
        }
    });
});

gulp.task('build', [], function (onComplete) {
    console.log("[BUILD] Beginning Production Build");
    // Merge the streams
    var stream = gulp.getBuildStreams();
    // Pipe into build directory.
    console.log("[BUILD] Piping output");
    stream = stream.pipe(gulp.dest(BUILD_DIR));
    // Once outputted into dist.
    gulp.waitFor(stream).then(function () {
        console.log("[BUILD] SW-Precaching");
        // generate a service worker!
        gulp.createServiceWorker(project, swPreCache, argv.bundled).then(function () {
            console.log("[BUILD] Build Complete!");
            onComplete();
        });
    }, function (error){
      console.error(error);
      console.error("[BUILD] Failed");
    });
});
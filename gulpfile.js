/* eslint-disable */

/*
    Constants
 */

const BUILD_DIR = 'dist/';

/*
    Core Dependencies
 */
var gulp = require('gulp');
var spawn = require('child_process').spawn;
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

var historyApiFallback = require('connect-history-api-fallback')
var browserSync = require('browser-sync');

/*
    Polymer Tool Construction
 */
var PolymerProject = polymerBuild.PolymerProject;
var HtmlSplitter = polymerBuild.HtmlSplitter;
var addServiceWorker = polymerBuild.addServiceWorker;
var sourcesHtmlSplitter = new HtmlSplitter();

/*
    Config
 */

var swPreCache = require('./sw-precache-config.js');
var project = new PolymerProject(require('./polymer.json'));

var isWin = /^win/.test(process.platform);

/*
    Build Functions
 */

gulp.waitFor = function (stream) {
    return new Promise(function (resolve, reject) {
        stream.on('end', resolve);
        stream.on('error', reject);
    });
};

gulp.spawnCmd = function (command) {
    if (isWin){
        return command + ".cmd";
    } else {
        return command;
    }
};

gulp.copy = function (src, dest) {
    return gulp.src(src, {base:"."})
        .pipe(gulp.dest(dest));
};
gulp.copyBase = function (src, dest, base) {
    return gulp.src(src, {base: base})
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
    console.log('Bundling');
    return stream.pipe(gulpif(argv.bundled, project.bundler));
};

/*
    Shared Tasks
 */

gulp.task('copy-temp', function () {
    gulp.copy('test/**/*', '.tmp');
    gulp.copy('bower_components/**/*', '.tmp');
    // Merge the streams
    return mergeStream(gulp.buildSources(project.sources()), project.dependencies())
    .pipe(gulp.dest(SERVE_DIR)); // Pipe into build directory.
});

gulp.task('test-exec', ['copy-temp'], function (onComplete) {
    gulp.copy('test/**/*', '.tmp');
    spawn(gulp.spawnCmd('polymer'), ['test'], { cwd: '.tmp/', stdio: 'inherit' })
        .on('close', function () {
            onComplete(null);
        }).on('error', function (error) {
            onComplete(error);
        });
});

gulp.task('test', ['test-exec'], function () {
    del(['.tmp/']);
});

gulp.task('clean', function () {
    del(['.tmp/']);
    del(['dist/']);
});


/*
     Executable 'Complete' Tasks
 */
gulp.task('serve', function () {
    browserSync({
        files: ["/**/*"],
        server: {
            baseDir: ".",
            middleware: [ historyApiFallback() ]
        }
    });
});

gulp.task('build', [], function (onComplete) {
    console.log("Beginning Production Build");
    // Merge the streams
    var stream = gulp.getBuildStreams();
    // Pipe into build directory.
    console.log("[BUILD] Piping output");
    stream = stream.pipe(gulp.dest(BUILD_DIR));
    console.log("[BUILD] Output Complete");
    // Once outputted into dist.
    gulp.waitFor(stream).then(function () {
        console.log("[BUILD] SW-Precaching");
        // generate a service worker!
        gulp.createServiceWorker(project, swPreCache, argv.bundled).then(function () {
            console.log("Build Complete!");
            onComplete();
        });
    }, function (error){
      console.error(error);
      console.error("[BUILD] Failed");
    });
});
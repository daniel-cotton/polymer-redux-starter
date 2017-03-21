/* eslint-disable */

/*
    Constants
 */

const BUILD_DIR = 'dist/';
const SERVE_DIR = '.tmp/';

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

gulp.waitFor = stream => {
    return new Promise((resolve, reject) => {
        stream.on('end', resolve);
        stream.on('error', reject);
    });
};

gulp.spawnCmd = command => {
    if (isWin){
        return command + ".cmd";
    } else {
        return command;
    }
};

gulp.copy = (src, dest) => {
    return gulp.src(src, {base:"."})
        .pipe(gulp.dest(dest));
};
gulp.copyBase = (src, dest, base) => {
    return gulp.src(src, {base: base})
        .pipe(gulp.dest(dest));
};

gulp.createServiceWorker = (project, swPreCache, bundled) => {
    return addServiceWorker({
        project: project,
        buildRoot: BUILD_DIR,
        swPrecacheConfig: swPreCache,
        bundled: bundled
    });
};

gulp.buildSources = sources => {
    return sources
        .pipe(sourcesHtmlSplitter.split()) // split streams
        .pipe(sourcemaps.init()) // Start preparing sourcemaps
        .pipe(gulpif('*.js', babel({
            presets: ['es2015']
        }))) // Babel transpiling
        .pipe(sourcemaps.write()) // Write those sourcemaps!
        .pipe(sourcesHtmlSplitter.rejoin());
};

gulp.getBuildStreams = () => {
    //  Build our build sources & import our dependencies. Then merge the streams.
    var stream = mergeStream(gulp.buildSources(project.sources()), project.dependencies());
    // Build bundled, if --bundled
    return stream.pipe(gulpif(argv.bundled, project.bundler));
};

/*
    Shared Tasks
 */

gulp.task('copy-temp', () => {
    gulp.copy('test/**/*', '.tmp');
    gulp.copy('bower_components/**/*', '.tmp');
    // Merge the streams
    return mergeStream(gulp.buildSources(project.sources()), project.dependencies())
    .pipe(gulp.dest(SERVE_DIR)); // Pipe into build directory.
});

gulp.task('test-exec', ['copy-temp'], onComplete => {
    gulp.copy('test/**/*', '.tmp');
    spawn(gulp.spawnCmd('polymer'), ['test'], { cwd: '.tmp/', stdio: 'inherit' })
        .on('close', () => {
            onComplete(null);
        }).on('error', error => {
            onComplete(error);
        });
});

gulp.task('test', ['test-exec'], () => {
    del(['.tmp/']);
});

gulp.task('clean', () => {
    del(['.tmp/']);
    del(['dist/']);
});


/*
     Executable 'Complete' Tasks
 */
gulp.task('serve', ['copy-temp'], () => {
    browserSync({
        files: [".tmp/**/*"],
        server: {
            baseDir: ".tmp/",
            middleware: [ historyApiFallback() ]
        }
    });
    gulp.watch(['./src/**/*', './bower_components/**/*']).on('change', function () {
        console.log("File-Changed, Updating.");
        gulp.waitFor(mergeStream(gulp.buildSources(gulp.src(['src/**/*.{js,html}', '!bower_components/**/*'], {base: '.'})), project.dependencies())
            .pipe(gulp.dest(SERVE_DIR))) // Pipe into build directory.
            .then(() => {
                console.log("Updated.");
            });
    });
});

gulp.task('build', [], onComplete => {
    console.log("Beginning Production Build");
    // Merge the streams
    var stream = gulp.getBuildStreams();
    // Pipe into build directory.
    stream = stream.pipe(gulp.dest(BUILD_DIR));
    // Once outputted into dist.
    gulp.waitFor(stream).then(() => {
        // generate a service worker!
        gulp.createServiceWorker(project, swPreCache, argv.bundled).then(() => {
            console.log("Build Complete!");
            onComplete();
        });
    });
});
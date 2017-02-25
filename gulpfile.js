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

/*
    Build Functions
 */

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
        buildRoot: 'production-build/',
        swPrecacheConfig: swPreCache,
        bundled: bundled
    });
};

gulp.buildSources = sources => {
    return sources
        .pipe(sourcesHtmlSplitter.split()) // split streams
        .pipe(sourcemaps.init())
        .pipe(gulpif('*.js', babel({
            presets: ['es2015']
        })))
        .pipe(sourcemaps.write())
        .pipe(sourcesHtmlSplitter.rejoin());
};

gulp.getBuildStreams = () => {
    var stream = mergeStream(gulp.buildSources(project.sources()), project.dependencies());
    // Build bundled, if --bundled
    return stream.pipe(gulpif(argv.bundled, project.bundler));
};

/*
    Shared Tasks
 */

gulp.task('transpile-es2015', [], () => {
    return gulp.buildSources(project.sources())
        .pipe(gulp.dest('.tmp/src'));
});

gulp.task('copy-temp', ['transpile-es2015'], () => {
    gulp.copy('test/**/*', '.tmp');
    gulp.copy('bower_components/**/*', '.tmp');
    gulp.copy('node_modules/**/*', '.tmp');
    gulp.copy('index.html', '.tmp');
    gulp.copy('bower.json', '.tmp');
    gulp.copy('package.json', '.tmp');
    gulp.copy('polymer.json', '.tmp');
    gulp.copy('manifest.json', '.tmp');
    gulp.copy('service-worker.js', '.tmp');
    gulp.copy('sw-precache-config.js', '.tmp');
    gulp.copy('images/**/*', '.tmp');
});

gulp.task('test-exec', ['copy-temp'], onComplete => {
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

gulp.task('serve', ['copy-temp'], onComplete => {
    spawn(gulp.spawnCmd('polymer'), ['serve', '--open', '.'], { cwd: '.tmp/', stdio: 'inherit' })
        .on('close', function (){
        }).on('error', function (error) {
        onComplete(error);
    });
    gulp.watch('src/**/*', ['copy-temp']);
});


/*
     Executable 'Complete' Tasks
 */

gulp.task('build', [], onComplete => {
    console.log("Beginning Production Build");
    // Merge the streams
    var stream = gulp.getBuildStreams();
    // Pipe into build directory.
    stream = stream.pipe(gulp.dest(BUILD_DIR));
    // Once outputted into dist.
    waitFor(stream).then(() => {
        // generate a service worker!
        gulp.createServiceWorker(project, swPreCache, argv.bundled).then(() => {
            console.log("Build Complete!");
            onComplete();
        });
    });
});
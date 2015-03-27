// Include gulp
var gulp = require('gulp');

// Include plug-ins
var jshint = require('gulp-jshint');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var less = require('gulp-less');
var minifyCss = require('gulp-minify-css');
var replace = require('gulp-replace');

// Concat and minify JS
gulp.task('build-js', function() {
    gulp.src(['./src/js/**.js', './src/js/libs/*.js'])
        .pipe(jshint())
        .pipe(concat('main.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('./public/js/'));
});

// Concat and minify less into CSS
gulp.task('build-css', function() {
    gulp.src('./src/less/*.less')
        .pipe(concat('main.min.css'))
        .pipe(less())
        .pipe(minifyCss())
        .pipe(gulp.dest('./public/css/'));
});

// Update AppCache file with random int to force browsers to re-download it
gulp.task('update-appcache', function() {
    gulp.src('./public/osmc_remote.appcache')
        .pipe(replace(/cachebreaker:.*/, 'cachebreaker:' + Math.random().toString().substr(2)))
        .pipe(gulp.dest('./public'));
});

// Set up default task and watches
gulp.task('default', ['build-js', 'build-css', 'update-appcache'], function() {
    gulp.watch('./src/js/*.js', ['build-js', 'update-appcache']);
    gulp.watch('./src/less/*.less', ['build-css', 'update-appcache']);
    gulp.watch('./public/*.html', ['update-appcache']);
});
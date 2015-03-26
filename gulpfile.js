// Include gulp
var gulp = require('gulp');

// Include plug-ins
var jshint = require('gulp-jshint');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var less = require('gulp-less');
var minifyCss = require('gulp-minify-css');

// Concat and minify JS
gulp.task('build-js', function() {
    gulp.src('./src/js/*.js')
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

// Set up default task and watches
gulp.task('default', ['build-js', 'build-css'], function() {
    gulp.watch('./src/js/*.js', ['build-js']);
    gulp.watch('./src/less/*.less', ['build-css']);
});
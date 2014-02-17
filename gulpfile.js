var gulp = require('gulp');
var gutil = require('gulp-util');
var livereload = require('gulp-livereload');
var connect = require('gulp-connect');

gulp.task('build', function() {
  gulp.src('./app/**/*.jade')
    .pipe(jade())
    .pipe(gulp.dest('./dist/'))
});

gulp.task('dev', function() {
  gulp.src('./app/**/*.jade')
    .pipe(jade())
    .pipe(gulp.dest('./.tmp/'))
});


gulp.task('connect', connect.server({
  root: ['.'],
  port: 1337,
  livereload: true,
  open: {
    file: 'demo/index.html',
    browser: 'google-chrome' // if not working OS X browser: 'Google Chrome'
  }
}));


gulp.task('default', [ 'connect' ]);
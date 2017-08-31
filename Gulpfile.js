const gulp = require('gulp'),
babel = require('gulp-babel'),
sourcemaps = require('gulp-sourcemaps'),
install = require('gulp-install'),
del = require('del'),
eslint = require('gulp-eslint');

gulp.task('copy', () => {
    return gulp
        .src(['./**/*', '.bowerrc', '!./public/bower_components/**', '!./backups/**', '!Dockerfile', '!docker-compose.yml', '!./resources/**', '!./build/**', '!README.md', '!./node_modules/**'])
        .pipe(gulp.dest('../build'));
});

gulp.task('build-es5', ['copy'], () => {
    return gulp
        .src(['**/*.js', '!./node_modules/**', '!./build/**'])
        .pipe(sourcemaps.init())
        .pipe(babel())
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('../build'));
});

gulp.task('install', ['build-es5'], () => {
	gulp.src(['../build/bower.json', '../build/package.json'])
	.pipe(install({allowRoot: true}));
});

gulp.task('remove', ['install'], () => {
	return del([
		'../build/backups/', '../build/resources/'
	], {force: true});
});

gulp.task('default', ['remove']), () => {}
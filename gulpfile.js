'use strict'
// это то, что уже вложено в gulp
const { src, dest, watch, parallel, series } = require('gulp');
const gulp = require('gulp')
const rigger = require("gulp-rigger");

const autoprefixer = require('gulp-autoprefixer');
const cssbeautify = require('gulp-cssbeautify');
const removeComments = require('gulp-strip-css-comments');
const rename = require('gulp-rename');
const sass = require('gulp-sass')(require('sass'));
const cssnano = require('gulp-cssnano');
const uglify = require('gulp-uglify');
const plumber = require('gulp-plumber');
const panini = require('panini');
const imagemin = require('gulp-imagemin');
const del = require('del');
const notify = require("gulp-notify");
const imagewebp = require("gulp-webp");
const browserSync = require('browser-sync').create();

/* Paths */
const srcPath = "src/";
const distPath = "dist/";

const path = {
	build: {
		html: distPath,
		css: distPath + "assets/css",
		js: distPath + "assets/js",
		images: distPath + "assets/images",
		fonts: distPath + "assets/fonts"
	},
	src: {
		html: srcPath + "*.html",
		css: srcPath + "assets/scss/*.scss",
		js: srcPath  + "assets/js/*.js",
		images: srcPath  + "assets/images/**/*.{jpg,jpeg,png,svg,gif,ico,webp,xnl,json}",
		fonts: srcPath  + "assets/fonts/**/*.{eot,woff,woff2,ttf,svg}"
	},
	watch: {
		html: srcPath + "**/*.html",
		css: srcPath + "assets/scss/**/*.scss",
		js: srcPath + "assets/js/**/*.js",
		images: srcPath + "assets/images/**/*.{jpg,jpeg,png,svg,gif,ico,webp,xnl,json}",
		fonts: srcPath + "assets/fonts/**/*.{eot,woff,woff2,ttf,svg}"
	},
	clean: "./" + distPath
};

function serve() {
	browserSync.init({
		server: {
			baseDir: "./" + distPath
		},
		notify: false // Отключаем уведомления, которое появляется в правом верхнем углу при обновлении страницы
	});
}

function html() {
	panini.refresh();   //перезагружает страницу
	return src(path.src.html, {base: srcPath})  // обращение к исходника
		.pipe(plumber())
		.pipe(panini({
			root: srcPath + "pages/",    // корень деректории
			layouts: srcPath + "tpl/layouts/",
			partials: srcPath + "tpl/partials/",
			data: srcPath + "tpl/data/"
		}))        // предотвращает ошибки
		// .pipe(fileinclude()) // собирает файлы
		// .pipe(webphtml())  // Сам пишет нужныйкод в html для вставки картинки
		.pipe(dest(path.build.html))   // выгрузка результата
		.pipe(browserSync.stream()); // Обновление страницы
}

function css() {
	return src(path.src.css, { base: srcPath + "assets/scss/"})
	.pipe(plumber({   // проверяет ошибки кода
		errorHandler: function (err) {   //| Красивое отображение ошибок 
			notify.onError({
				title: "SCSS Error",
				message: "Error: <%= error.message %>"
			})(err);
			this.emit('end');
		}
	}))
	.pipe(sass())
	.pipe(autoprefixer({
			overrideBrowserslist: ["last 5 versions"],
			cascade: true    // Стиль написания префиксов - каскад
		})
	)
	.pipe(cssbeautify())  // делается красивым
	.pipe(dest(path.build.css))   // выгрузка результата, обычный неминифцрованный;
	.pipe(cssnano({               // минифицирует
		zindex: false,              // чтобы случайно в min-файле не удалился z-index
		discardComments: {         // убирает все коментарии в минифицированном файле
			removeAll: true
		}
	}))
	.pipe(removeComments())  //удаляет комминтарии в минифицированном файле
	.pipe(rename({
		suffix: ".min",
		extname: ".css"
	}))  // добавление суффикса min
	.pipe(dest(path.build.css))
	.pipe(browserSync.reload({ stream: true }));
}

function js() {
	return src(path.src.js, { base: srcPath + "assets/js/" })
		.pipe(plumber({   // проверяет ошибки кода
			errorHandler: function (err) {   //| Красивое отображение ошибок 
				notify.onError({
					title: "JS Error",
					message: "Error: <%= error.message %>"
				})(err);
				this.emit('end');
			}
		}))
		.pipe(rigger())     // собирает все файлы js в один
		.pipe(dest(path.build.js))
		.pipe(uglify())      // минифицирование файла
		.pipe(rename({       // переименование файла
			suffix: ".min",
			extname: ".js"
		}))
		.pipe(dest(path.build.js)) // Путь куда перекидывается, объединённый и сжатый файл js
		.pipe(browserSync.reload({ stream: true }));  // автоматическое обновление js
}

function images() {
	return src(path.src.images, { base: srcPath + "assets/images/" })
		.pipe(imagemin([   // сжимает картинки
			imagemin.gifsicle({ interlaced: true }),
			imagemin.mozjpeg({ quality: 75, progressive: true }),  //качество
			imagemin.optipng({ optimizationLevel: 5 }),  //уровень оптимзации
			imagemin.svgo({
				plugins: [
					{ removeViewBox: true },
					{ cleanupIDs: false }
				]
			})
		]))
		.pipe(dest(path.build.images))
		.pipe(browserSync.reload({ stream: true }));
}

function webpImages() {
	return src(path.src.images, { base: srcPath + "assets/images/" })
		.pipe(imagewebp())
		.pipe(dest(path.build.images))
}

function fonts() {
	return src(path.src.fonts, { base: srcPath + "assets/fonts/" })
		.pipe(dest(path.build.fonts))
		.pipe(browserSync.reload({ stream: true }));
}

function clean() {
	return del(path.clean)
}

function watchFiles() {
	gulp.watch([path.watch.html], html)
	gulp.watch([path.watch.css], css)
	gulp.watch([path.watch.js], js)
	gulp.watch([path.watch.images], images)
	gulp.watch([path.watch.fonts], fonts)
}

const build = gulp.series(clean, gulp.parallel(html, css, js, images, fonts));
const watching = gulp.parallel(build, watchFiles, serve);

exports.html = html;
exports.css = css;
exports.js = js;
exports.images = images;
exports.webpImages = webpImages;
exports.fonts = fonts;
exports.clean = clean;
exports.build = build;
exports.watching = watching;
exports.default = watching;


module.exports = function(grunt) {

    grunt.initConfig({
        concat: {
            options: {
                separator: '\n'
            },
            dist: {
                src: [
                    "public/bower_components/angular/angular.min.js",
                    "public/bower_components/angular-aria/angular-aria.js",
                    "public/bower_components/hammerjs/hammer.js",
                    "public/bower_components/ngprogress/build/ngProgress.min.js",
                    "public/bower_components/angular-ui-router/release/angular-ui-router.min.js",
                    "public/bower_components/angular-material/angular-material.min.js",
                    "public/bower_components/angular-cookies/angular-cookies.min.js",
                    "public/bower_components/angular-translate/angular-translate.min.js",
                    "public/bower_components/angular-translate-storage-cookie/angular-translate-storage-cookie.min.js",
                    "public/bower_components/angular-translate-loader-static-files/angular-translate-loader-static-files.min.js",
                    "public/bower_components/angular-animate/angular-animate.min.js",
                    "public/bower_components/angular-md5/angular-md5.min.js",
                    "public/bower_components/moment/min/moment-with-locales.min.js",
                    "public/bower_components/angular-moment/angular-moment.min.js",
                    "public/bower_components/angular-redactor/angular-redactor.js",
                    "public/bower_components/jquery/dist/jquery.min.js",
                    "public/bower_components/redactor/redactor.js",
                    "public/bower_components/redactor/plugins/fontcolor.js",
                    "public/bower_components/redactor/plugins/imagemanager.js",
                    "public/bower_components/redactor/langs/zh_tw.js",
                    "public/bower_components/redactor/langs/zh_cn.js",
                    "public/bower_components/angular-disqus/angular-disqus.js",
                    "public/bower_components/timelinejs/build/js/storyjs-embed.js",
                    "public/bower_components/angular-bootstrap-datetimepicker/src/js/datetimepicker.js",
                    "public/rin.js",
                    "public/rin-jq.js"
                ],
                dest: 'public/rin.pr.js'
            }
        },
        concat_css: {
            options: {
            },
            all: {
                src: [
                    "public/bower_components/ngprogress/ngProgress.css",
                    "public/bower_components/angular-material/angular-material.min.css",
                    "public/bower_components/angular-material/themes/red-theme.css",
                    "public/bower_components/angular-material/themes/pink-theme.css",
                    "public/bower_components/angular-material/themes/deep-orange-theme.css",
                    "public/bower_components/angular-material/themes/purple-theme.css",
                    "public/bower_components/fontawesome/css/font-awesome.min.css",
                    "public/bower_components/redactor/redactor.css",
                    "public/bower_components/angular-bootstrap-datetimepicker/src/css/datetimepicker.css",
                    "public/styles/style.css"
                ],
                dest: "public/styles/app.css"
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-concat-css');
};

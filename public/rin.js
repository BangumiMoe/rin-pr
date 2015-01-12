"use strict";

/**
 * public/angular-prpr.js
 * Rin prpr!
 *
 * rin-pr project angular app
 * WE LOVE ACG
 *
 * */

var rin_version = '0.1.18';

function rin_template(templ) {
    return 'templates/' + templ + '.html?v=' + rin_version;
}

var disqus_shortname = 'bangumi';

var rin = angular.module('rin', [
        'ngProgress',
        'ui.router',
        'pascalprecht.translate',
        'ngMaterial',
        'ngAnimate',
        'ipCookie',
        'angular-md5',
        'angularMoment',
        'angular-redactor',
        'ngDisqus',
        'ui.bootstrap.datetimepicker'
    ])
        .run([
            '$rootScope',
            '$state',
            '$stateParams',
            '$translate',
            '$location',
            '$urlRouter',
            '$http',
            '$q',
            'amMoment',
            '$mdDialog',
            'ipCookie',
            'ngProgress',
            'redactorOptions',
            function ($rootScope,
                      $state,
                      $stateParams,
                      $translate,
                      $location,
                      $urlRouter,
                      $http,
                      $q,
                      amMoment,
                      $mdDialog,
                      ipCookie,
                      ngProgress,
                      redactorOptions) {
                ngProgress.start();
                $rootScope.$state = $state;
                $rootScope.$stateParams = $stateParams;

                var lastState = null;
                $rootScope.$on('$locationChangeSuccess', function (e) {
                    var curState;
                    var path = $location.path();
                    var m = path.match(/^\/([a-z]*)\/?/);
                    if (m && m[0]) {
                        curState = m[1] ? m[1] : 'root';
                    } else {
                        curState = $state.current ? $state.current.name : null;
                    }
                    if (curState && curState === lastState) {
                        e.preventDefault();
                    } else {
                        lastState = curState;
                        $urlRouter.sync();
                    }
                });

                var cache_list = ['user', 'team', 'tag'];
                var caches = {};
                for (var i = 0; i < cache_list.length; i++) {
                    caches[cache_list[i]] = new ObjectCache('_id');
                }

                $rootScope.switchLang = function (lang, notSetCookie) {
                    $rootScope.showAdditionLang = false;
                    $rootScope.lang = lang;
                    $translate.use(lang);
                    if (!notSetCookie) {
                        ipCookie('locale', lang, { expires: 365 }); // expires 1yr
                    }
                    amMoment.changeLocale(lang);
                    //moment.locale(newLocale);
                    redactorOptions.lang = lang;
                };
                $rootScope.showTorrentDetailsDialog = function (ev, torrent, callback) {
                    //var curpath = $location.path();
                    if (torrent._id) {
                        //$location.path('torrent/' + torrent._id);
                    }
                    $mdDialog.show({
                        controller: 'TorrentDetailsCtrl',
                        templateUrl: rin_template('torrent-details'),
                        targetEvent: ev,
                        locals: {torrent: torrent}
                    }).finally(function () {
                        if (callback) callback();
                    });
                };
                $rootScope.editTorrent = function (ev, torrent, user) {
                    $mdDialog.show({
                        controller: 'TorrentPublishCtrl',
                        templateUrl: rin_template('torrent-publish'),
                        targetEvent: ev,
                        locals: {torrent: torrent, user: user}
                    }).finally(function () {
                        $('.redactor-toolbar-tooltip').remove();
                    });
                };
                $rootScope.removeTorrent = function (ev, torrent, callback) {
                    ev.preventDefault();
                    if (confirm('Delete this torrent?')) {
                        $http.post('/api/torrent/remove', {_id: torrent._id}, {cache: false, responseType: 'json'})
                            .success(function (data) {
                                if (data && data.success) {
                                    callback(null);
                                } else {
                                    callback(true);
                                }
                            })
                            .error(function () {
                                callback(true);
                            });
                    }
                    ev.stopPropagation();
                };
                $rootScope.fetchTorrentUserAndTeam = function (lt, callback) {
                    var user_ids = [], team_ids = [];
                    for (var i = 0; i < lt.length; i++) {
                        if (lt[i].uploader_id && user_ids.indexOf(lt[i].uploader_id) < 0) {
                            user_ids.push(lt[i].uploader_id);
                        }
                        if (lt[i].team_id && team_ids.indexOf(lt[i].team_id) < 0) {
                            team_ids.push(lt[i].team_id);
                        }
                    }
                    var queries = [], qName = [];
                    var jobs = {user: {_ids: user_ids}, team: {_ids: team_ids}};
                    var datacb = function (dataArray) {
                        if (dataArray) {
                            for (var i = 0; i < dataArray.length; i++) {
                                var data = dataArray[i].data;
                                var k = qName[i];
                                caches[k].push(data);

                                var td = jobs[k].data; //obj
                                for (var j = 0; j < data.length; j++) {
                                    td[data[j]._id] = data[j];
                                }
                            }
                        }
                        for (var i = 0; i < lt.length; i++) {
                            if (jobs.user.data) {
                                lt[i].uploader = jobs.user.data[lt[i].uploader_id];
                            }
                            if (jobs.team.data) {
                                lt[i].team = jobs.team.data[lt[i].team_id];
                            }
                        }
                        if (callback) callback();
                    };
                    for (var k in jobs) {
                        if (jobs[k]._ids.length > 0) {
                            var r = caches[k].find(jobs[k]._ids);
                            if (r && r[1] && r[1].length) {
                                qName.push(k);
                                queries.push(
                                    $http.post('/api/' + k + '/fetch', {_ids: r[1]}, {responseType: 'json'})
                                );
                            }
                            //jobs[k].r = r;
                            jobs[k].data = r[0];
                        }
                    }
                    if (queries.length > 0) {
                        $q.all(queries).then(datacb);
                    } else {
                        datacb();
                        if (callback) callback();
                    }
                };

                $rootScope.fetchTags = function (tag_ids, transform, callback) {
                    if (typeof transform == 'function') {
                        callback = transform;
                        transform = false;
                    }
                    var r = caches.tag.find(tag_ids, true);
                    var datacb = function (data) {
                        if (transform) {
                            var tags = data;
                            var _tags = {};
                            tags.forEach(function (tag) {
                                _tags[tag._id] = tag;
                            });
                            data = _tags;
                        }
                        callback(null, data);
                    };
                    if (r && r[1] && r[1].length) {
                        $http.post('/api/tag/fetch', {_ids: r[1]}, {cache: false, responseType: 'json'})
                            .success(function (data) {
                                if (data) {
                                    caches.tag.push(data);
                                    data = r[0].concat(data);
                                } else {
                                    data = r[0];
                                }
                                datacb(data);
                            })
                            .error(function (data) {
                                callback(data);
                            });
                    } else {
                        datacb(r[0]);
                    }
                };
                var notSetCookie = true;
                var cookieLangConfig = ipCookie('locale');
                if (!cookieLangConfig) {
                    notSetCookie = false;
                    var langList = ['zh_tw', 'zh_cn', 'en'];
                    if (navigator.language) {
                        var lang = navigator.language
                            .toLowerCase()
                            .replace(/^en(-.+)/, 'en')
                            .replace('-', '_');
                        if (langList.indexOf(lang) >= 0) {
                            cookieLangConfig = lang;
                        }
                    }
                    if (!cookieLangConfig) {
                        cookieLangConfig = 'zh_tw';
                    }
                }
                $rootScope.switchLang(cookieLangConfig, notSetCookie);

                $urlRouter.listen();
            }
        ])
        .config([
            '$stateProvider',
            '$urlRouterProvider',
            '$httpProvider',
            '$locationProvider',
            '$translateProvider',
            '$compileProvider',
            'redactorOptions',
            '$disqusProvider',
            function ($stateProvider,
                      $urlRouterProvider,
                      $httpProvider,
                      $locationProvider,
                      $translateProvider,
                      $compileProvider,
                      redactorOptions,
                      $disqusProvider) {

                $translateProvider.useStaticFilesLoader({
                    prefix: 'i18n/',
                    suffix: '.json'
                });

                $locationProvider.hashPrefix('!');

                $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|magnet):/);

                $urlRouterProvider
                    // The `when` method says if the url is ever the 1st param, then redirect to the 2nd param
                    // Here we are just setting up some convenience urls.
                    // .when('/c?id', '/contacts/:id')
                    // .when('/user/:id', '/contacts/:id')
                    // If the url is ever invalid, e.g. '/asdf', then redirect to '/' aka the home state
                    .otherwise('/');

                $stateProvider
                    .state("root", {
                        url: "/",
                        templateUrl: rin_template('index-unified'),
                        controller: 'UnifiedIndexCtrl'
                    })
                    .state("tag", {
                        url: "/tag/:tag_id",
                        templateUrl: rin_template('tag-search'),
                        controller: 'TagSearchCtrl'
                    })
                    .state("bangumi", {
                        url: "/bangumi/list",
                        templateUrl: rin_template('bangumi-list'),
                        controller: 'BangumiListCtrl'
                    })
                    .state("torrent", {
                        url: "/torrent/:torrent_id",
                        templateUrl: rin_template('index-blank'),
                        controller: 'TorrentShowCtrl'
                    })
                    .state("search", {
                        url: "/search/:tag_id",
                        templateUrl: rin_template('search-filter'),
                        controller: 'SearchFilterCtrl'
                    })
                    .state("user-reset-password", {
                        url: "/user/reset-password/:reset_key",
                        templateUrl: rin_template('index-blank'),
                        controller: 'UserResetCtrl'
                    })
                    .state("help", {
                        url: "/help",
                        templateUrl: rin_template('page-help'),
                        controller: 'PageHelpCtrl'
                    });
                $urlRouterProvider.deferIntercept();

                $httpProvider.defaults.transformRequest = function (data) {
                    if (data === undefined)
                        return data;

                    var needMultipart = false;
                    angular.forEach(data, function (value, key) {
                        if (value instanceof FileList) {
                            needMultipart = true;
                        }
                    });
                    if (!needMultipart) {
                        //transform to JSON
                        return JSON.stringify(data);
                    }

                    var fd = new FormData();
                    angular.forEach(data, function (value, key) {
                        if (value instanceof FileList) {
                            if (value.length == 1) {
                                fd.append(key, value[0]);
                            } else {
                                angular.forEach(value, function (file, index) {
                                    fd.append(key + '_' + index, file);
                                });
                            }
                        } else {
                            fd.append(key, value);
                        }
                    });

                    return fd;
                };

                $httpProvider.defaults.headers.post['Content-Type'] = undefined;

                redactorOptions.buttonSource = true;
                redactorOptions.imageEnableUpload = false;      //disable upload
                redactorOptions.imageUpload = '/api/file/upload/image?for=redactor';
                redactorOptions.imageManagerJson = '/api/file/all/image';
                redactorOptions.plugins = ['fontsize', 'fontcolor', 'imagemanager', 'fullscreen'];

                $disqusProvider.setShortname(disqus_shortname);
                if (window.location.origin) {
                    $disqusProvider.setUrlPrefix(window.location.origin);
                } else {
                    var m = window.location.href.match(/(https?:\/\/[^\/]+)\/?/i);
                    if (m && m[0]) $disqusProvider.setUrlPrefix(m[1]);
                }
            }
        ])
        .filter('to_trusted', ['$sce', function ($sce) {
            return function (text) {
                return $sce.trustAsHtml(text);
            };
        }])
        .filter('tagname', ['$rootScope', function ($rootScope) {
            return function (tag) {
                if (!tag) {
                    return '';
                }
                var lang = $rootScope.lang;
                if (tag.locale && tag.locale[lang]) {
                    return tag.locale[lang];
                } else {
                    return tag.name;
                }
            };
        }])
        .directive('backgroundImage', function() {
            var m = new Date().getMonth();
            return function (scope, element, attrs) {
                element.css({
                    'background-image': 'url(/images/bg/m' + m + '.jpg)',
                    'background-size': 'cover',
                    '-webkit-background-size': 'cover',
                    '-moz-background-size': 'cover',
                    '-o-background-size': 'cover',
                    'background-attachment': 'fixed',
                    'background-position': 'center top',
                    'background-repeat': 'repeat-x'
                });
            };
        })
        .directive('torrentList', function () {
            return {
                restrict: 'A',
                scope: {
                    torrents: '=torrentList',
                    torrentProps: '=torrentProps'
                },
                templateUrl: rin_template('torrent-list'),
                link: function (scope, element, attrs) {
                    scope.showTorrentDetailsDialog = scope.$parent.showTorrentDetailsDialog;
                    if (scope.torrentProps) {
                        var tofuncs = ['user', 'team', 'loadMore', 'showTorrentEdit', 'editTorrent', 'removeTorrent'];
                        for (var i = 0; i < tofuncs.length; i++) {
                            scope[tofuncs[i]] = scope.$parent[tofuncs[i]];
                        }
                        var toprops = ['currentPage', 'totalPages'];
                        scope.$parent.$watchGroup(toprops, function (newValues) {
                            for (var i = 0; i < toprops.length; i++) {
                                scope[toprops[i]] = newValues[i];
                            }
                        });
                    }
                }
            };
        })
        .directive('ngEnter', function () {
            return function (scope, element, attrs) {
                element.bind("keydown keypress", function (event) {
                    if (event.which === 13) {
                        scope.$apply(function () {
                            scope.$eval(attrs.ngEnter);
                        });

                        event.preventDefault();
                    }
                });
            };
        })
        .directive("fileread", [function () {
            return {
                scope: {
                    fileread: "="
                },
                link: function (scope, element, attributes) {
                    element.bind("change", function (changeEvent) {
                        scope.$apply(function () {
                            //scope.fileread = changeEvent.target.files[0];
                            // or all selected files:
                            scope.fileread = changeEvent.target.files;
                        });
                    });
                }
            }
        }])
        .directive('newScope', function () {
            return {
                scope: true,
                priority: 450
            };
        })
        .controller('SidebarCtrl', [
            '$scope',
            '$rootScope',
            '$http',
            '$mdDialog',
            'md5',
            'ngProgress',
            function ($scope, $rootScope, $http, $mdDialog, md5, ngProgress) {
                $scope.isExpanded = false;
                $scope.setUser = function (user) {
                    if (user && user.email) {
                        user.emailHash = md5.createHash(user.email);
                    }
                    $scope.user = user;
                    $rootScope.user = user;
                };
                $scope.expand = function (ev) {
                    if ($scope.user) {
                        $scope.isExpanded = !$scope.isExpanded;
                    } else {
                        $scope.showSigninDialog(ev);
                    }
                };
                $scope.signout = function () {
                    ngProgress.start();
                    $http.delete('/api/user/signout', {cache: false, responseType: 'json'})
                        .success(function (data, status) {
                            if (data && data.success) {
                                $scope.setUser(null);
                                $scope.isExpanded = false;
                                ngProgress.complete();
                            }
                        });
                };
                $scope.showSigninDialog = function (ev) {
                    $mdDialog.show({
                        controller: 'UserSigninCtrl',
                        templateUrl: rin_template('user-signin'),
                        targetEvent: ev,
                        locals: {user: null}
                    }).then(function (user) {
                        $scope.setUser(user);
                        $scope.expand();
                    });
                };
                $scope.showTeamDialog = function (ev) {
                    $mdDialog.show({
                        controller: 'TeamActionsCtrl',
                        templateUrl: rin_template('team-actions'),
                        targetEvent: ev,
                        locals: {user: $scope.user}
                    }).then(function () {
                    }).finally(function () {
                        $('.redactor-toolbar-tooltip').remove();
                    });
                };
                $scope.showTagDialog = function (ev) {
                    $mdDialog.show({
                        controller: 'TagActionsCtrl',
                        templateUrl: rin_template('tag-actions'),
                        targetEvent: ev,
                        locals: {user: $scope.user}
                    }).then(function () {
                    }).finally(function () {
                    });
                };
                $scope.showBangumiDialog = function (ev) {
                    $mdDialog.show({
                        controller: 'BangumiActionsCtrl',
                        templateUrl: rin_template('bangumi-actions'),
                        targetEvent: ev,
                        clickOutsideToClose: false,
                        locals: {user: $scope.user}
                    }).then(function () {
                    }).finally(function () {
                    });
                };
                $scope.showPublishDialog = function (ev) {
                    $mdDialog.show({
                        controller: 'TorrentPublishCtrl',
                        templateUrl: rin_template('torrent-publish'),
                        targetEvent: ev,
                        clickOutsideToClose: false,
                        locals: {user: $scope.user, torrent: null}
                    }).then(function (torrent) {
                        if (torrent) {
                            torrent.uploader = $scope.user;
                            $rootScope.$emit('torrentAdd', torrent);
                        }
                    }).finally(function () {
                        $('.redactor-toolbar-tooltip').remove();
                    });
                };
                $scope.showUserDialog = function (ev, action) {
                    $mdDialog.show({
                        controller: 'UserActionsCtrl',
                        templateUrl: rin_template('user-actions'),
                        targetEvent: ev,
                        locals: {user: $scope.user, action: action}
                    }).then(function () {
                    }).finally(function () {
                    });
                };
                $rootScope.showUserDialog = $scope.showUserDialog;
                $http.get('/api/user/session', {cache: false, responseType: 'json'})
                    .success(function (data, status) {
                        if (data && data._id) {
                            $scope.setUser(data);
                        }
                    });
            }
        ])
        .controller('PageHelpCtrl', [
            '$scope',
            'ngProgress',
            function ($scope, ngProgress) {
                ngProgress.complete();
            }
        ])
        .controller('BangumiListCtrl', [
            '$scope',
            '$rootScope',
            '$http',
            'ngProgress',
            function ($scope, $rootScope, $http, ngProgress) {
                ngProgress.start();
                $scope.weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                $scope.weekDayThemes = ['red', 'pink', 'purple', 'blue', 'cyan', 'green', 'deep-orange'];
                $scope.bangumis = [];
                $scope.data = {};
                function fetchTags(tag_ids, bs) {
                    $rootScope.fetchTags(tag_ids, true, function (err, _tags) {
                        if (_tags) {
                            bs.forEach(function (b, i) {
                                if (b.tag_id) {
                                    bs[i].tag = _tags[b.tag_id];
                                }
                            });
                            if ($scope.teams) {
                                for (var k in $scope.teams) {
                                    if ($scope.teams[k]) {
                                        $scope.teams[k].forEach(function (tm) {
                                            tm.tag = _tags[tm.tag_id];
                                        });
                                    }
                                }
                            }
                        }
                        ngProgress.complete();
                    });
                }
                $http.get('/api/bangumi/current', {responseType: 'json'})
                    .success(function (data) {
                        if (data) {
                            var bs = data;
                            var bangumis = [];
                            var tag_ids = [];
                            for (var i = 0; i < bs.length; i++) {
                                tag_ids.push(bs[i].tag_id);
                                if (bangumis[bs[i].showOn]) {
                                    bangumis[bs[i].showOn].push(bs[i]);
                                } else {
                                    bangumis[bs[i].showOn] = [bs[i]];
                                }
                            }
                            $scope.bangumis = bangumis;
                            $http.post('/api/team/working', { tag_ids: tag_ids }, { cache: false, responseType: 'json' })
                                .success(function(data) {
                                    if (data) {
                                        $scope.teams = data;
                                        $scope.searchStates = {};

                                        var teamTagIds = [];
                                        for (var k in data) {
                                            if (data[k]) {
                                                data[k].forEach(function (tm) {
                                                    if (teamTagIds.indexOf(tm.tag_id) < 0) {
                                                        teamTagIds.push(tm.tag_id);
                                                    }
                                                });
                                            }
                                        }
                                        tag_ids = tag_ids.concat(teamTagIds);
                                    }
                                    fetchTags(tag_ids, bs);
                                })
                                .error(function () {
                                    fetchTags(tag_ids, bs);
                                });
                        }
                    })
                    .error(function (data) {
                        ngProgress.complete();
                    });
            }
        ])
        .controller('TorrentShowCtrl', [
            '$state',
            '$stateParams',
            '$scope',
            '$rootScope',
            '$location',
            '$http',
            '$mdDialog',
            'ngProgress',
            function ($state, $stateParams, $scope, $rootScope, $location, $http, $mdDialog, ngProgress) {
                var torrent_id = $stateParams.torrent_id;
                if (!torrent_id) {
                    $location.path('/');
                    return;
                }
                $http.post('/api/torrent/fetch', {_id: torrent_id}, {responseType: 'json'})
                    .success(function (data, status) {
                        if (data) {
                            var torrent = data;
                            $rootScope.fetchTorrentUserAndTeam([torrent], function () {
                                ngProgress.complete();
                            });
                            $rootScope.showTorrentDetailsDialog(null, torrent, function () {
                                if ($state.current && $state.current.name == 'torrent') {
                                    $location.path('/');
                                }
                            });
                        } else {
                            ngProgress.complete();
                        }
                    })
                    .error(function (data, status) {
                        ngProgress.complete();
                    });
            }
        ])
        .controller('UserResetCtrl', [
            '$stateParams',
            '$scope',
            '$window',
            '$mdDialog',
            'ngProgress',
            function ($stateParams, $scope, $window, $mdDialog, ngProgress) {
                ngProgress.complete();
                var resetKey = $stateParams.reset_key;
                if (!resetKey) {
                    $window.location = '/';
                    return;
                }
                $mdDialog.show({
                    controller: 'UserSigninCtrl',
                    templateUrl: rin_template('user-signin'),
                    clickOutsideToClose: false,
                    locals: {user: {resetKey: resetKey}}
                }).then(function (user) {
                    $window.location = '/';
                });
            }
        ])
        .controller('UserSigninCtrl', [
            '$scope',
            '$http',
            '$filter',
            '$mdDialog',
            'md5',
            'ngProgress',
            'user',
            function ($scope, $http, $filter, $mdDialog, md5, ngProgress, user) {
                var ja = JobActionsWrapper($scope, ngProgress);
                $scope.user = user ? user : {};
                if (user) {
                    $scope.isForgot = true;
                }
                $scope.switchMode = function (type) {
                    if (!ja.reset()) {
                        return;
                    }
                    if (type == 'forgot') {
                        $scope.isRegister = false;
                        $scope.isForgot = true;
                    } else if ($scope.isForgot) {
                        $scope.isRegister = false;
                        $scope.isForgot = false;
                    } else {
                        $scope.isRegister = !$scope.isRegister;
                    }
                };
                $scope.signin = function () {
                    if (!ja.reset()) {
                        return;
                    }
                    if ($scope.user.username && $scope.user.password) {
                        ja.start();
                        var u = {
                            username: $scope.user.username,
                            password: md5.createHash($scope.user.password)
                        };
                        $http.post('/api/user/signin', u, {cache: false, responseType: 'json'})
                            .success(function (data, status) {
                                if (data && data.success) {
                                    ja.succeed();
                                    $mdDialog.hide(data.user);
                                } else {
                                    var msg;
                                    if (data && data.message) {
                                        msg = $filter('translate')(data.message);
                                    }
                                    ja.fail(msg);
                                }
                            })
                            .error(function (data, status) {
                                ja.fail();
                            });
                    }
                };
                $scope.register = function () {
                    if (!ja.reset()) {
                        return;
                    }
                    if ($scope.user.password != $scope.user.password2
                        || $scope.user.password.length < 6) {
                        $scope.user.password = $scope.user.password2 = '';
                        ja.fail();
                        return;
                    }
                    if ($scope.user.username && $scope.user.password && $scope.user.email) {
                        ja.start();
                        var u = {
                            username: $scope.user.username,
                            email: $scope.user.email,
                            password: md5.createHash($scope.user.password)
                        };
                        $http.post('/api/user/register', u, {cache: false, responseType: 'json'})
                            .success(function (data, status) {
                                if (data && data.success) {
                                    ja.succeed();
                                    $mdDialog.hide(data.user);

                                    var ok = $filter('translate')('Got it!');
                                    var title = $filter('translate')('Need to verify');
                                    var message = $filter('translate')('Done! We\'ve sent you an email with instructions to verify your account.');
                                    $mdDialog.show(
                                        $mdDialog.alert()
                                            .title(title)
                                            .content(message)
                                            .ok(ok)
                                        //.targetEvent(ev)
                                    );
                                } else {
                                    var msg;
                                    if (data && data.message) {
                                        msg = $filter('translate')(data.message);
                                    }
                                    ja.fail(msg);
                                }
                            })
                            .error(function (data, status) {
                                ja.fail();
                            });
                    }
                };
                $scope.reset = function (ev) {
                    if (!ja.reset()) {
                        return;
                    }
                    if (!$scope.user.resetKey && $scope.user.username && $scope.user.email) {
                        ja.start();
                        var u = {
                            username: $scope.user.username,
                            email: $scope.user.email
                        };
                        $http.post('/api/user/reset-password/request', u, {cache: false, responseType: 'json'})
                            .success(function (data, status) {
                                if (data && data.success) {
                                    ja.succeed();
                                    $mdDialog.cancel();

                                    var ok = $filter('translate')('Got it!');
                                    var title = $filter('translate')('Reset Password');
                                    var message = $filter('translate')('Done! We\'ve sent you an email with instructions to reset your password.');
                                    $mdDialog.show(
                                        $mdDialog.alert()
                                            .title(title)
                                            .content(message)
                                            .ok(ok)
                                        //.targetEvent(ev)
                                    );
                                } else {
                                    ja.fail();
                                }
                            })
                            .error(function (data, status) {
                                ja.fail();
                            });
                    } else if ($scope.user.resetKey) {
                        if ($scope.user.password != $scope.user.password2
                            || $scope.user.password.length < 6) {
                            $scope.user.password = $scope.user.password2 = '';
                            ja.fail();
                            return;
                        }
                        ja.start();
                        var u = {
                            username: $scope.user.username,
                            password: md5.createHash($scope.user.password),
                            resetKey: $scope.user.resetKey
                        };
                        $http.post('/api/user/reset-password', u, {cache: false, responseType: 'json'})
                            .success(function (data, status) {
                                if (data && data.success) {
                                    ja.succeed();
                                    $mdDialog.hide();
                                } else {
                                    ja.fail();
                                }
                            })
                            .error(function (data, status) {
                                ja.fail();
                            });
                    }
                };
                $scope.close = function () {
                    $mdDialog.cancel();
                };
            }
        ])
        .controller('UserActionsCtrl', [
            '$scope',
            '$rootScope',
            '$http',
            '$mdDialog',
            '$q',
            'md5',
            'user',
            'action',
            'ngProgress',
            function ($scope, $rootScope, $http, $mdDialog, $q, md5, user, action, ngProgress) {
                var ja = JobActionsWrapper($scope, ngProgress);
                $scope.subscriptions = [];
                $scope.focus_line = [];
                $scope.storrents = [];
                $scope.gravatarSubDomain = $rootScope.lang == 'zh_cn' ? 'cn' : ($rootScope.lang == 'zh_tw' ? 'zh-tw' : 'en');

                $scope.showTorrentEdit = true;
                $scope.removeTorrent = function (ev, torrent, i) {
                    $rootScope.removeTorrent(ev, torrent, function (err) {
                        if (!err) {
                            if ($scope.data.selectedIndex == 1) {
                                $scope.mytorrents.splice(i, 1);
                            } else {
                                $scope.teamtorrents.splice(i, 1);
                            }
                        }
                    });
                };
                $scope.editTorrent = function (ev, torrent, i) {
                    $rootScope.editTorrent(ev, torrent, $scope.user, function (err, torrent) {
                        if (!err) {
                            if ($scope.data.selectedIndex == 1) {
                                $scope.mytorrents[i] = torrent;
                            } else {
                                $scope.teamtorrents[i] = torrent;
                            }
                        }
                    });
                };

                $scope.user = user;
                $scope.data = {};
                var set_subscribe = false;
                if (action && action.type == 'subscribe'
                    && action.selectedTagIds.length > 0) {
                    set_subscribe = true;
                    $scope.data.selectedIndex = 1;
                }

                ngProgress.start();
                var queries = [];
                queries.push($http.get('/api/user/subscribe/collections', {responseType: 'json'}));
                queries.push($http.get('/api/torrent/my', {responseType: 'json'}));
                if (user.team_id) {
                    queries.push($http.get('/api/torrent/team', {responseType: 'json'}));
                    queries.push($http.post('/api/team/fetch', {_id: user.team_id}, {responseType: 'json'}));
                }
                $q.all(queries).then(function (dataArray) {
                    var cols = dataArray[0].data;
                    if ((cols && cols.length) || set_subscribe) {
                        var tag_ids = [];
                        if (!cols) {
                            cols = [];
                        }
                        for (var i = 0; i < cols.length; i++) {
                            for (var j = 0; j < cols[i].length; j++) {
                                tag_ids.push(cols[i][j]);
                            }
                        }
                        if (set_subscribe) {
                            for (var i = 0; i < action.selectedTagIds.length; i++) {
                                tag_ids.push(action.selectedTagIds[i]);
                            }
                        }
                        if (tag_ids.length > 0) {
                            $rootScope.fetchTags(tag_ids, true, function (err, _tags) {
                                if (_tags) {
                                    var _cols = [];
                                    for (var i = 0; i < cols.length; i++) {
                                        var l = [];
                                        for (var j = 0; j < cols[i].length; j++) {
                                            if (_tags[cols[i][j]]) {
                                                l.push(_tags[cols[i][j]]);
                                            }
                                        }
                                        if (l.length > 0) {
                                            _cols.push(l);
                                        }
                                    }
                                    if (set_subscribe) {
                                        var l = [];
                                        for (var i = 0; i < action.selectedTagIds.length; i++) {
                                            if (_tags[action.selectedTagIds[i]]) {
                                                l.push(_tags[action.selectedTagIds[i]]);
                                            }
                                        }
                                        if (l.length > 0) {
                                            _cols.push(l);
                                        }
                                    }
                                    if (_cols.length > 0) {
                                        $scope.subscriptions = _cols;
                                        $scope.focus_line = new Array(_cols.length);
                                    }
                                }
                            });
                        }
                    }
                    var mytorrents = dataArray[1].data.torrents;
                    if (mytorrents) {
                        for (var i = 0; i < mytorrents.length; i++) {
                            //all self
                            mytorrents[i].uploader = user;
                        }
                    }
                    $scope.mytorrents = mytorrents;

                    if (user.team_id) {
                        var teamtorrents = dataArray[2].data.torrents;
                        var team = dataArray[3].data;

                        $scope.team = team;
                        $scope.teamtorrents = teamtorrents;

                        var user_ids = [];
                        if (teamtorrents) {
                            teamtorrents.forEach(function (t) {
                                user_ids.push(t.uploader_id);
                            });
                        }
                        if (user_ids.length > 0) {
                            $http.post('/api/user/fetch', {_ids: user_ids}, {responseType: 'json'})
                                .success(function (data) {
                                    for (var i = 0; i < teamtorrents.length; i++) {
                                        //in profile page not shown team logo
                                        //teamtorrents[i].team = team;
                                        for (var j = 0; j < data.length; j++) {
                                            if (teamtorrents[i].uploader_id == data[j]._id) {
                                                teamtorrents[i].uploader = data[j];
                                                break;
                                            }
                                        }
                                    }
                                    ngProgress.complete();
                                });
                        } else {
                            ngProgress.complete();
                        }
                    } else {
                        ngProgress.complete();
                    }
                });
                $scope.showTorrentDetailsDialog = function (ev, torrent) {
                };
                $scope.addLine = function () {
                    $scope.subscriptions.push([]);
                    for (var i = 0; i < $scope.focus_line.length; i++) {
                        $scope.focus_line[i] = false;
                    }
                    $scope.ifocus = $scope.focus_line.length;
                    $scope.focus_line.push(true);
                };
                $scope.ifocus = 0;
                $scope.removeLine = function (i) {
                    $scope.subscriptions.splice(i, 1);
                    if ($scope.ifocus == i) {
                        $scope.ifocus = -1;
                    }
                    $scope.focus_line.splice(i, 1);
                };
                $scope.editLine = function (i) {
                    $scope.ifocus = i;
                    $scope.focus_line[i] = true;
                    for (var j = 0; j < $scope.focus_line.length; j++) {
                        $scope.focus_line[j] = (j == i);
                    }
                };
                $scope.removeTag = function (i, tag) {
                    var f = $scope.subscriptions[i];
                    var j = f.indexOf(tag);
                    if (j >= 0) {
                        f.splice(j, 1);
                    }
                    if (i == $scope.ifocus) {
                        $scope.previewTorrents();
                    }
                };
                $scope.addKeywordsTag = function (i) {
                    if ($scope.ifocus < 0 || !$scope.keywordsTags) {
                        return;
                    }
                    var f = $scope.subscriptions[$scope.ifocus];
                    if (f.indexOf($scope.keywordsTags[i]) >= 0) {
                        return;
                    }
                    f.push($scope.keywordsTags[i]);
                    $scope.previewTorrents();
                };
                $scope.previewTorrents = function () {
                    $scope.storrents.splice(0, 5);
                    if ($scope.ifocus < 0) {
                        return;
                    }
                    var f = $scope.subscriptions[$scope.ifocus];
                    var tag_ids = [];
                    for (var i = 0; i < f.length; i++) {
                        tag_ids.push(f[i]._id);
                    }
                    if (tag_ids.length < 0) {
                        return;
                    }
                    ja.start();
                    $http.post('/api/torrent/search', {tag_id: tag_ids}, {responseType: 'json'})
                        .success(function (data) {
                            if (data && data.length) {
                                if (data.length > 5) {
                                    data = data.slice(0, 5)
                                }
                                $rootScope.fetchTorrentUserAndTeam(data, function () {
                                    ja.succeed();
                                });
                                Array.prototype.push.apply($scope.storrents, data);
                            } else {
                                ja.succeed();
                            }
                        })
                        .error(function () {
                            ja.succeed();
                        });
                };
                $scope.save = function () {
                    if (!ja.reset()) {
                        return;
                    }
                    if ($scope.data.selectedIndex == 1) {
                        //Subscription
                        var subs_tag_ids = [];
                        for (var i = 0; i < $scope.subscriptions.length; i++) {
                            var f = $scope.subscriptions[i];
                            var curtag_ids = [];
                            for (var j = 0; j < f.length; j++) {
                                curtag_ids.push(f[j]._id);
                            }
                            if (curtag_ids.length > 0) {
                                subs_tag_ids.push(curtag_ids);
                            }
                        }

                        ja.start();
                        $http.post('/api/user/subscribe/update', {collections: subs_tag_ids}, {responseType: 'json'})
                            .success(function (data) {
                                if (data && data.success) {
                                    ja.succeed();
                                } else {
                                    ja.fail();
                                }
                            })
                            .error(function () {
                                ja.fail();
                            });
                        return;
                    }
                    if (!$scope.user.password || !$scope.user.new_password) {
                        return;
                    }
                    if ($scope.user.new_password.length < 6) {
                        return;
                    }
                    if ($scope.user.new_password != $scope.user.new_password2) {
                        $scope.user.new_password = $scope.user.new_password2 = '';
                        ja.fail();
                        return;
                    }
                    var u = {
                        password: md5.createHash($scope.user.password),
                        new_password: md5.createHash($scope.user.new_password)
                    };
                    $http.post('/api/user/update', u, {responseType: 'json'})
                        .success(function (data) {
                            if (data && data.success) {
                                ja.succeed();
                                $scope.user.password = '';
                                $scope.user.new_password = $scope.user.new_password2 = '';
                                $mdDialog.hide();
                            } else {
                                ja.fail();
                            }
                        })
                        .error(function () {
                            ja.fail();
                        });
                };
                $scope.close = function () {
                    $mdDialog.cancel();
                };

                $scope.canceler = null;
                $scope.$watch('data.tagname', function (newValue, oldValue) {
                    if ($scope.canceler) {
                        $scope.canceler.resolve();
                    }
                    var tagname = newValue;
                    if (tagname && tagname.length >= 2) {
                        $scope.canceler = $q.defer();
                        $http.post('/api/tag/search',
                            {name: tagname, keywords: true, multi: true},
                            {responseType: 'json', timeout: $scope.canceler.promise})
                            .success(function (data) {
                                if (data && data.found) {
                                    $scope.keywordsTags = data.tag;
                                } else {
                                    $scope.keywordsTags = null;
                                }
                                $scope.canceler = null;
                            })
                            .error(function () {
                                $scope.canceler = null;
                            });
                    } else {
                        $scope.keywordsTags = null;
                    }
                });
            }
        ])
        .controller('TeamActionsCtrl', [
            '$scope',
            '$http',
            '$q',
            '$mdDialog',
            'user',
            'ngProgress',
            function ($scope, $http, $q, $mdDialog, user, ngProgress) {
                var ja = JobActionsWrapper($scope, ngProgress);
                $scope.user = user;
                $scope.data = {};
                $scope.sync = {};
                $scope.syncSites = ['dmhy', 'ktxp', 'popgo', 'camoe'];
                for (var i = 0; i < $scope.syncSites.length; i++) {
                    $scope.sync[$scope.syncSites[i]] = {};
                }
                $scope.newteam = {};
                $scope.jointeam = {};
                if (user.team_id) {
                    $http.get('/api/team/myteam', {responseType: 'json'})
                        .success(function (data) {
                            $scope.team = data;
                            if (data.admin_id == user._id) {
                                //is admin
                                $http.get('/api/team/members/pending', {responseType: 'json'})
                                    .success(function (data) {
                                        $scope.teamPendingMembers = data;
                                    });
                            }
                        });
                    $http.get('/api/team/members', {responseType: 'json'})
                        .success(function (data) {
                            $scope.teamMembers = data;
                        });
                    $http.get('/api/team/sync/get', {cache: false, responseType: 'json'})
                        .success(function (data) {
                            if (data) {
                                for (var i = 0; i < $scope.syncSites.length; i++) {
                                    var site = $scope.syncSites[i];
                                    if (data[site]) {
                                        $scope.sync[site] = data[site];
                                    }
                                }
                            }
                        });
                } else {
                    $http.get('/api/team/myjoining', {responseType: 'json'})
                        .success(function (data) {
                            $scope.teamJoining = data;
                            $scope.jointeam.name = data.name;
                        });
                    $http.get('/api/team/pending', {cache: false, responseType: 'json'})
                        .success(function (data) {
                            $scope.teamPending = data;
                        });
                }
                if (user.group == 'admin') {
                    $http.get('/api/team/all/pending', {cache: false, responseType: 'json'})
                        .success(function (data) {
                            var tr = data;
                            $scope.teamRequests = tr;
                            var user_ids = [];
                            data.forEach(function (t) {
                                user_ids.push(t.admin_id);
                            });
                            if (user_ids.length > 0) {
                                $http.post('/api/user/fetch', {_ids: user_ids}, {responseType: 'json'})
                                    .success(function (data) {
                                        for (var i = 0; i < tr.length; i++) {
                                            for (var j = 0; j < data.length; j++) {
                                                if (tr[i].admin_id == data[j]._id) {
                                                    tr[i].admin = data[j];
                                                    break;
                                                }
                                            }
                                        }
                                    });
                            }
                        });
                }

                $scope.join = function () {
                    if ($scope.canceler || !ja.reset()) {
                        return;
                    }
                    var jt = $scope.jointeam;
                    if (jt && jt.name) {
                        ja.start();
                        $http.post('/api/team/join', jt, {cache: false, responseType: 'json'})
                            .success(function (data) {
                                if (data && data.success) {
                                    $http.get('/api/team/myjoining', {responseType: 'json'})
                                        .success(function (data) {
                                            if (data) {
                                                ja.succeed();
                                                $scope.keywordsTags = null;
                                                $scope.teamJoining = data;
                                                $scope.jointeam.name = data.name;
                                            } else {
                                                ja.fail();
                                            }
                                        })
                                        .error(function () {
                                            ja.fail();
                                        });
                                }
                            });
                    }
                };
                $scope.remove = function (ev, team_id, user_id) {
                    if (!ja.reset()) {
                        return;
                    }
                    var j = {team_id: team_id, user_id: user_id};
                    $http.post('/api/team/remove', j, {cache: false, responseType: 'json'})
                        .success(function (data) {
                            if (data && data.success) {
                                var tm = $scope.teamMembers;
                                for (var i = 0; i < tm.length; i++) {
                                    if (tm[i]._id == user_id) {
                                        tm.splice(i, 1);
                                        break;
                                    }
                                }
                            }
                        });
                };
                $scope.approve = function (ev, team_id, user_id, isMember) {
                    if (!ja.reset()) {
                        return;
                    }
                    var j = {team_id: team_id, user_id: user_id};
                    if (isMember) j.type = 'member';
                    $http.post('/api/team/approve', j, {cache: false, responseType: 'json'})
                        .success(function (data) {
                            if (data && data.success) {
                                var tr = isMember ? $scope.teamPendingMembers : $scope.teamRequests;
                                for (var i = 0; i < tr.length; i++) {
                                    if (isMember && tr[i]._id == user_id) {
                                        $scope.teamMembers.push(tr[i]);
                                        tr.splice(i, 1);
                                        break;
                                    }
                                    if (!isMember && tr[i]._id == team_id) {
                                        tr.splice(i, 1);
                                        break;
                                    }
                                }
                            }
                        });
                };
                $scope.reject = function (ev, team_id, user_id, isMember) {
                    if (!ja.reset()) {
                        return;
                    }
                    var j = {team_id: team_id, user_id: user_id};
                    if (isMember) j.type = 'member';
                    $http.post('/api/team/reject', j, {cache: false, responseType: 'json'})
                        .success(function (data) {
                            if (data && data.success) {
                                var tr = isMember ? $scope.teamPendingMembers : $scope.teamRequests;
                                for (var i = 0; i < tr.length; i++) {
                                    if ((isMember && tr[i]._id == user_id)
                                        || (!isMember && tr[i]._id == team_id)) {
                                        tr.splice(i, 1);
                                        break;
                                    }
                                }
                            }
                        });
                };
                $scope.approveMember = function (ev, team_id, user_id) {
                    return $scope.approve(ev, team_id, user_id, true);
                };
                $scope.rejectMember = function (ev, team_id, user_id) {
                    return $scope.reject(ev, team_id, user_id, true);
                };
                $scope.save = function () {
                    if (!ja.reset()) {
                        return;
                    }
                    if ($scope.data.selectedIndex == 3) {
                        //Team Sync
                        if ($scope.sync) {
                            ja.start();
                            $http.post('/api/team/sync/update', {sync: $scope.sync}, {
                                cache: false,
                                responseType: 'json'
                            })
                                .success(function (data) {
                                    if (data && data.success) {
                                        ja.succeed();
                                    } else {
                                        ja.fail();
                                    }
                                })
                                .error(function (data) {
                                    ja.fail();
                                });
                        }
                        return;
                    }
                    var t = $scope.team;
                    if (t) {
                        //&& (t.new_icon || t.signature) maybe t.signature -> ''
                        ja.start();
                        var nt = {
                            _id: t._id,
                            icon: t.new_icon
                        };
                        if (t.signature) {
                            nt.signature = t.signature;
                        } else {
                            nt.signature = '';
                        }
                        $http.post('/api/team/update', nt, {cache: false, responseType: 'json'})
                            .success(function (data) {
                                if (data && data.success) {
                                    ja.succeed();
                                    //refresh
                                    $http.get('/api/team/myteam', {cache: false, responseType: 'json'})
                                        .success(function (data) {
                                            $scope.team = data;
                                        });
                                } else {
                                    ja.fail();
                                }
                            })
                            .error(function (data) {
                                ja.fail();
                            });
                    }
                };
                $scope.submit = function () {
                    if (!ja.reset()) {
                        return;
                    }
                    var nt = $scope.newteam;
                    if (nt && nt.name && nt.certification) {
                        ja.start();
                        $http.post('/api/team/register', nt, {cache: false, responseType: 'json'})
                            .success(function (data) {
                                if (data && data.success) {
                                    ja.succeed();
                                    $scope.teamPending = data.team;
                                } else {
                                    ja.fail();
                                }
                            })
                            .error(function (data) {
                                ja.fail();
                            });
                    }
                };
                $scope.close = function () {
                    $mdDialog.cancel();
                };

                $scope.selectTag = function (tag) {
                    $scope.jointeam.name = tag.name;
                };

                $scope.canceler = null;
                $scope.$watch('jointeam.name', function (newValue, oldValue) {
                    if ($scope.canceler) {
                        $scope.canceler.resolve();
                    }
                    if ($scope.teamJoining && $scope.teamJoining._id) {
                        $scope.canceler = null;
                        $scope.keywordsTags = null;
                        return;
                    }
                    var tagname = newValue;
                    if (tagname && tagname.length >= 2) {
                        $scope.canceler = $q.defer();
                        $http.post('/api/tag/search',
                            {name: tagname, type: 'team', keywords: true, multi: true},
                            {responseType: 'json', timeout: $scope.canceler.promise})
                            .success(function (data) {
                                if (data && data.found) {
                                    $scope.keywordsTags = data.tag;
                                } else {
                                    $scope.keywordsTags = null;
                                }
                                $scope.canceler = null;
                            })
                            .error(function () {
                                $scope.canceler = null;
                            });
                    } else {
                        $scope.keywordsTags = null;
                    }
                });
            }
        ])
        .controller('TagActionsCtrl', [
            '$scope',
            '$http',
            '$mdDialog',
            '$q',
            'user',
            'ngProgress',
            function ($scope, $http, $mdDialog, $q, user, ngProgress) {
                var ja = JobActionsWrapper($scope, ngProgress);
                $scope.tagTypeList = ['team', 'bangumi', 'lang', 'resolution', 'format', 'misc'];
                $scope.user = user;
                $scope.tag = {};
                $scope.tag_locale = [];

                function getTagLocale() {
                    if (!$scope.tag.synonyms || $scope.tag.synonyms.length <= 0) {
                        return;
                    }
                    var locale = {};
                    var tagl = $scope.tag_locale;
                    for (var i = 0; i < tagl.length; i++) {
                        if (tagl[i] && $scope.tag.synonyms[i]) {
                            if (tagl[i].indexOf(',') >= 0) {
                                var locs = tagl[i].split(',');
                                for (var j = 0; j < locs.length; j++) {
                                    if (locs[j]) {
                                        locale[locs[j]] = $scope.tag.synonyms[i];
                                    }
                                }
                            } else {
                                locale[tagl[i]] = $scope.tag.synonyms[i];
                            }
                        }
                    }
                    return locale;
                }

                function setTagLocale() {
                    if (!$scope.tag.synonyms || !$scope.tag.locale
                        || $scope.tag.synonyms.length <= 0) {
                        $scope.tag_locale = [''];
                        return;
                    }
                    var tagl = [];
                    for (var k in $scope.tag.locale) {
                        var i = $scope.tag.synonyms.indexOf($scope.tag.locale[k]);
                        if (i >= 0) {
                            if (tagl[i]) {
                                tagl[i] += ',' + k;
                            } else {
                                tagl[i] = k;
                            }
                        }
                    }
                    $scope.tag_locale = tagl;
                }

                $scope.search = function () {
                    if ($scope.canceler || !ja.reset()) {
                        return;
                    }
                    if ($scope.tag.name) {
                        ja.start();
                        $http.post('/api/tag/search', {name: $scope.tag.name}, {cache: false, responseType: 'json'})
                            .success(function (data) {
                                if (data && data.success) {
                                    ja.succeed();
                                    if (data.found) {
                                        $scope.tag = data.tag;
                                        setTagLocale();
                                    } else {
                                        $scope.tag.synonyms = [''];
                                        $scope.tag_locale = [''];
                                        $scope.notfound = true;
                                    }
                                    $scope.keywordsTags = null;
                                } else {
                                    ja.fail();
                                }
                            })
                            .error(function (data) {
                                ja.fail();
                            });
                    }
                };
                $scope.increase = function () {
                    $scope.tag.synonyms.push('');
                    $scope.tag_locale.push('');
                };
                $scope.remove = function (i) {
                    $scope.tag.synonyms.splice(i, 1);
                    $scope.tag_locale.splice(i, 1);
                };
                $scope.add = function () {
                    if (!ja.reset()) {
                        return;
                    }
                    if ($scope.notfound) {
                        ja.start();
                        var t = {
                            name: $scope.tag.name,
                            type: $scope.tag.type,
                            synonyms: $scope.tag.synonyms,
                            locale: getTagLocale()
                        };
                        $http.post('/api/tag/add', t, {cache: false, responseType: 'json'})
                            .success(function (data) {
                                if (data && data.success) {
                                    ja.succeed();
                                    $scope.notfound = false;
                                    $scope.tag = data.tag;
                                } else {
                                    ja.fail();
                                }
                            })
                            .error(function (data) {
                                ja.fail();
                            });
                    }
                };
                $scope.save = function () {
                    if (!ja.reset()) {
                        return;
                    }
                    if ($scope.tag._id) {
                        ja.start();
                        var t = {
                            _id: $scope.tag._id,
                            name: $scope.tag.name,
                            type: $scope.tag.type,
                            synonyms: $scope.tag.synonyms,
                            locale: getTagLocale()
                        };
                        $http.post('/api/tag/update', t, {cache: false, responseType: 'json'})
                            .success(function (data) {
                                if (data && data.success) {
                                    ja.succeed();
                                } else {
                                    ja.fail();
                                }
                            })
                            .error(function (data) {
                                ja.fail();
                            });
                    }
                };
                $scope.delete = function () {
                    if (!ja.reset()) {
                        return;
                    }
                    if ($scope.tag._id) {
                        ja.start();
                        $http.post('/api/tag/remove', {_id: $scope.tag._id}, {cache: false, responseType: 'json'})
                            .success(function (data) {
                                if (data && data.success) {
                                    ja.succeed();
                                    $scope.notfound = false;
                                    $scope.tag = {};
                                    $scope.tag_locale = [];
                                } else {
                                    ja.fail();
                                }
                            })
                            .error(function (data) {
                                ja.fail();
                            });
                    }
                };
                $scope.selectTag = function (tag) {
                    $scope.tag = tag;
                    setTagLocale();
                    $scope.keywordsTags = null;
                };
                $scope.close = function () {
                    $mdDialog.cancel();
                };

                $scope.canceler = null;
                $scope.$watch('tag.name', function (newValue, oldValue) {
                    if ($scope.canceler) {
                        $scope.canceler.resolve();
                    }
                    if ($scope.tag._id) {
                        $scope.canceler = null;
                        $scope.keywordsTags = null;
                        return;
                    }
                    var tagname = newValue;
                    if (tagname && tagname.length >= 2) {
                        $scope.canceler = $q.defer();
                        $http.post('/api/tag/search',
                            {name: tagname, keywords: true, multi: true},
                            {responseType: 'json', timeout: $scope.canceler.promise})
                            .success(function (data) {
                                if (data && data.found) {
                                    $scope.keywordsTags = data.tag;
                                } else {
                                    $scope.keywordsTags = null;
                                }
                                $scope.canceler = null;
                            })
                            .error(function () {
                                $scope.canceler = null;
                            });
                    } else {
                        $scope.keywordsTags = null;
                    }
                });
            }
        ])
        .controller('BangumiActionsCtrl', [
            '$scope',
            '$http',
            '$filter',
            '$mdDialog',
            'user',
            'ngProgress',
            function ($scope, $http, $filter, $mdDialog, user, ngProgress) {
                var ja = JobActionsWrapper($scope, ngProgress);
                $scope.user = user;
                $scope.data = {};
                $scope.bangumi = {};
                $scope.newbangumi = {timezone: 9, showOn: 0};
                $scope.date = null;
                $scope.weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

                function timezoneT(date) {
                    var d = new Date(date);
                    var utc = d.getTime() + (d.getTimezoneOffset() * 60000);
                    var offset = parseInt($scope.newbangumi.timezone);
                    return new Date(utc + (3600000 * offset));
                }

                function isValid(bgm) {
                    if (bgm && bgm.name && bgm.credit
                        && bgm.startDate && bgm.endDate && bgm.showOn >= 0) {
                        return true;
                    }
                    return false;
                }

                $scope.setDate = function (type) {
                    $scope.settingDate = type;
                };
                $scope.add = function () {
                    if (!ja.reset()) {
                        return;
                    }
                    if (isValid($scope.newbangumi)
                        && $scope.newbangumi.icon
                        && $scope.newbangumi.cover) {
                        ja.start();
                        var t = {
                            name: $scope.newbangumi.name,
                            credit: $scope.newbangumi.credit,
                            startDate: $scope.newbangumi.startDate.getTime(),
                            endDate: $scope.newbangumi.endDate.getTime(),
                            showOn: $scope.newbangumi.showOn,
                            icon: $scope.newbangumi.icon,
                            cover: $scope.newbangumi.cover
                        };
                        $http.post('/api/bangumi/add', t, {cache: false, responseType: 'json'})
                            .success(function (data) {
                                if (data && data.success) {
                                    ja.succeed();
                                    //Move to Management
                                    $scope.data.selectedIndex = 1;
                                    $scope.bangumi = data.bangumi;
                                } else {
                                    ja.fail();
                                }
                            })
                            .error(function (data) {
                                ja.fail();
                            });
                    }
                };
                $scope.save = function () {
                    if (!ja.reset()) {
                        return;
                    }
                    var t = {
                        _id: $scope.bangumi._id,
                        name: $scope.bangumi.name,
                        credit: $scope.bangumi.credit,
                        startDate: $scope.newbangumi.startDate.getTime(),
                        endDate: $scope.newbangumi.endDate.getTime(),
                        showOn: $scope.newbangumi.showOn,
                        icon: $scope.bangumi.icon,
                        cover: $scope.bangumi.cover
                    };
                    if (t._id && isValid(t)) {
                        ja.start();
                        $http.post('/api/bangumi/update', t, {cache: false, responseType: 'json'})
                            .success(function (data) {
                                if (data && data.success) {
                                    ja.succeed();
                                } else {
                                    ja.fail();
                                }
                            })
                            .error(function (data) {
                                ja.fail();
                            });
                    }
                };
                $scope.search = function () {
                    if (!ja.reset()) {
                        return;
                    }
                    if ($scope.bangumi.name) {
                        ja.start();
                        $http.post('/api/bangumi/search', {name: $scope.bangumi.name},
                            { cache: false, responseType: 'json' })
                            .success(function (data) {
                                if (data && data.success && data.found) {
                                    ja.succeed();
                                    $scope.bangumi = data.bangumi;

                                    var d1 = new Date(data.bangumi.startDate);
                                    var d2 = new Date(data.bangumi.endDate);
                                    $scope.newbangumi['startDate'] = d1;
                                    $scope.newbangumi['endDate'] = d2;
                                    $scope.newbangumi['startDateFormat'] = $filter('amDateFormat')(d1, 'YYYY/MM/DD HH:mm:ss');
                                    $scope.newbangumi['endDateFormat'] = $filter('amDateFormat')(d2, 'YYYY/MM/DD HH:mm:ss');
                                    $scope.newbangumi['showOn'] = data.bangumi.showOn;
                                } else {
                                    ja.fail();
                                }
                            })
                            .error(function (data) {
                                ja.fail();
                            });
                    }
                };
                $scope.delete = function () {
                    if (!ja.reset()) {
                        return;
                    }
                    if ($scope.bangumi._id) {
                        $scope.working = true;
                        $http.post('/api/bangumi/remove', {_id: $scope.bangumi._id},
                            { cache: false, responseType: 'json' })
                            .success(function (data) {
                                if (data && data.success) {
                                    ja.succeed();
                                    $scope.bangumi = {};
                                } else {
                                    ja.fail();
                                }
                            })
                            .error(function (data) {
                                ja.fail();
                            });
                    }
                };
                $scope.close = function () {
                    $mdDialog.cancel();
                };
                $scope.$watch("newbangumi.date", function (newValue, oldValue) {
                    if ($scope.settingDate) {
                        $scope.newbangumi[$scope.settingDate + 'Format'] = $filter('amDateFormat')(newValue, 'YYYY/MM/DD HH:mm:ss');
                        $scope.newbangumi[$scope.settingDate] = timezoneT(newValue);
                        $scope.settingDate = '';
                    }
                });
                $scope.$watch("newbangumi.timezone", function (newValue, oldValue) {
                    $scope.newbangumi.startDate = $scope.newbangumi.endDate = null;
                    $scope.newbangumi.startDateFormat = $scope.newbangumi.endDateFormat = '';
                });
            }
        ])
        .controller('TorrentPublishCtrl', [
            '$scope',
            '$rootScope',
            '$state',
            '$filter',
            '$http',
            '$timeout',
            '$mdDialog',
            '$mdToast',
            '$q',
            'user',
            'torrent',
            'ngProgress',
            function ($scope, $rootScope, $state, $filter, $http, $timeout, $mdDialog, $mdToast, $q, user, torrent, ngProgress) {
                var ja = JobActionsWrapper($scope, ngProgress);
                $scope.user = user;
                $scope.tags = [];
                $scope.categoryTags = [];
                $http.get('/api/tag/misc', {responseType: 'json'})
                    .success(function (data) {
                        if (data && data.length) {
                            $scope.categoryTags = data;
                            $scope.categoryTag = data[0];
                            for (var i = 0; i < data.length; i++) {
                                if (torrent) {
                                    if (data[i]._id == torrent.category_tag_id) {
                                        $scope.categoryTag = data[i];
                                        break;
                                    }
                                } else if (data[i].name.toLowerCase() == 'donga') {
                                    $scope.categoryTag = data[i];
                                    break;
                                }
                            }
                        }
                    });
                if (torrent) {
                    $scope.torrent = torrent;
                    if (torrent.team_id) {
                        $scope.torrent.inteam = true;
                    }
                    if (torrent.tag_ids && torrent.tag_ids.length > 0) {
                        $rootScope.fetchTags(torrent.tag_ids, function (err, tags) {
                            if (tags) {
                                $scope.tags = tags;
                            }
                        });
                    }
                } else {
                    $scope.torrent = {};
                    if (user.team_id) {
                        $scope.torrent.inteam = true;
                    }
                }

                $scope.publish = function () {
                    if (!ja.reset()) {
                        return;
                    }
                    if ($scope.categoryTag && $scope.torrent.title && $scope.torrent.introduction
                        && $scope.torrent.title.length < 128) {
                        if (!$scope.torrent._id && !$scope.torrent_file) {
                            return;
                        }

                        ja.start();
                        var nt = {
                            category_tag_id: $scope.categoryTag._id,
                            title: $scope.torrent.title,
                            introduction: $scope.torrent.introduction,
                            tag_ids: [],
                            inteam: $scope.torrent.inteam ? '1' : ''
                        };
                        for (var j = 0; j < $scope.tags.length; j++) {
                            nt.tag_ids.push($scope.tags[j]._id);
                        }
                        var apiUrl;
                        if ($scope.torrent._id) {
                            apiUrl = '/api/torrent/update';
                            nt._id = $scope.torrent._id;
                        } else {
                            apiUrl = '/api/torrent/add';
                            if ($scope.torrent.teamsync) {
                                nt.teamsync = '1';
                            }
                            nt.file = $scope.torrent_file;
                        }
                        $http.post(apiUrl, nt, {cache: false, responseType: 'json'})
                            .success(function (data, status) {
                                if (data && data.success) {
                                    ja.succeed();
                                    $mdDialog.hide(data.torrent);
                                } else {
                                    var msg;
                                    if (data && data.message) {
                                        msg = $filter('translate')(data.message);
                                    }
                                    ja.fail(msg);
                                }
                            })
                            .error(function (data, status) {
                                ja.fail();
                            });
                    }
                };
                $scope.removeTag = function (i) {
                    $scope.tags.splice(i, 1);
                };
                $scope.addTag = function (i) {
                    if ($scope.newtag) {
                        $scope.working = true;
                        $http.post('/api/tag/search', {name: $scope.newtag}, {cache: false, responseType: 'json'})
                            .success(function (data) {
                                $scope.working = false;
                                if (data && data.found && data.tag) {
                                    var found = false;
                                    for (var j = 0; j < $scope.tags.length; j++) {
                                        if ($scope.tags[j]._id == data.tag._id) {
                                            found = true;
                                            break;
                                        }
                                    }
                                    if (!found) {
                                        $scope.tags.push(data.tag);
                                    }
                                    $scope.newtag = '';
                                }
                            })
                            .error(function () {
                                $scope.working = false;
                            });
                    }
                };
                $scope.contentSuggest = function () {
                    if ($scope.torrent.title) {
                        $scope.working = true;
                        $http.post('/api/torrent/suggest', {
                            title: $scope.torrent.title,
                            inteam: $scope.torrent.inteam
                        }, {cache: false, responseType: 'json'})
                            .success(function (data) {
                                $scope.working = false;
                                if (data && data._id) {
                                    if (data.teamsync) {
                                        $scope.torrent.teamsync = true;
                                    }
                                    if (data.team_id) {
                                        $scope.torrent.inteam = true;
                                    }
                                    $scope.torrent.introduction = data.introduction;
                                    var ts = data.tag_ids;
                                    if (ts && ts.length > 0) {
                                        var newTagIds = [];
                                        for (var i = 0; i < ts.length; i++) {
                                            var found = false;
                                            for (var j = 0; j < $scope.tags.length; j++) {
                                                if ($scope.tags[j]._id == ts[i]) {
                                                    found = true;
                                                    break;
                                                }
                                            }
                                            if (!found) {
                                                newTagIds.push(ts[i]);
                                            }
                                        }
                                        if (newTagIds.length > 0) {
                                            $rootScope.fetchTags(newTagIds, function (err, tags) {
                                                if (tags && tags.length > 0) {
                                                    var stags = [];
                                                    for (var i = 0; i < tags.length; i++) {
                                                        if (tags[i].type == 'misc') {
                                                            continue;
                                                        } else if (tags[i].type == 'resolution' || tags[i].type == 'lang') {
                                                            //only have one
                                                            var found = false;
                                                            for (var j = 0; j < $scope.tags.length; j++) {
                                                                if ($scope.tags[j].type == tags[i].type) {
                                                                    found = true;
                                                                    break;
                                                                }
                                                            }
                                                            if (!found) {
                                                                stags.push(tags[i]);
                                                            }
                                                        } else {
                                                            stags.push(tags[i]);
                                                        }
                                                    }
                                                    if (stags.length > 0) {
                                                        $scope.tags = $scope.tags.concat(stags);
                                                    }
                                                }
                                            });
                                        }
                                    }
                                }
                            })
                            .error(function () {
                                $scope.working = false;
                            });
                    }
                };
                $scope.getSuggest = function () {
                    if ($scope.torrent.title) {
                        $scope.working = true;
                        $http.post('/api/tag/suggest', {query: $scope.torrent.title}, {
                            cache: false,
                            responseType: 'json'
                        })
                            .success(function (data) {
                                $scope.working = false;
                                if (data && data.length > 0) {
                                    for (var i = 0; i < data.length; i++) {
                                        var ftags = null;
                                        var found = false;
                                        var j;
                                        if (data[i].type == 'misc') {
                                            ftags = $scope.categoryTags;
                                        } else {
                                            ftags = $scope.tags;
                                        }
                                        for (j = 0; j < ftags.length; j++) {
                                            if (ftags[j]._id == data[i]._id) {
                                                found = true;
                                                break;
                                            }
                                        }
                                        if (data[i].type == 'misc') {
                                            if (found) {
                                                $scope.categoryTag = ftags[j];
                                            }
                                        } else {
                                            if (!found) {
                                                $scope.tags.push(data[i]);
                                            }
                                        }
                                    }
                                }
                            })
                            .error(function () {
                                $scope.working = false;
                            });
                    }
                };
                $scope.close = function () {
                    $mdDialog.cancel();
                };
                //TODO: use onblur to instead
                var lastTimeout = null;
                $scope.$watch("torrent.title", function (newValue, oldValue) {
                    if (lastTimeout) $timeout.cancel(lastTimeout);
                    lastTimeout = $timeout($scope.getSuggest, 2000);
                });

                $scope.addKeywordsTag = function (i) {
                    if ($scope.keywordsTags && $scope.keywordsTags[i]) {
                        var tag = $scope.keywordsTags[i];
                        var found = false;
                        for (var j = 0; j < $scope.tags.length; j++) {
                            if ($scope.tags[j]._id == tag._id) {
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            $scope.tags.push(tag);
                        }
                    }
                };

                $scope.canceler = null;
                $scope.$watch('newtag', function (newValue, oldValue) {
                    if ($scope.canceler) {
                        $scope.canceler.resolve();
                    }
                    var tagname = newValue;
                    if (tagname && tagname.length >= 2) {
                        $scope.canceler = $q.defer();
                        $http.post('/api/tag/search',
                            {name: tagname, keywords: true, multi: true},
                            {responseType: 'json', timeout: $scope.canceler.promise})
                            .success(function (data) {
                                if (data && data.found) {
                                    $scope.keywordsTags = data.tag;
                                } else {
                                    $scope.keywordsTags = null;
                                }
                                $scope.canceler = null;
                            })
                            .error(function () {
                                $scope.canceler = null;
                            });
                    } else {
                        $scope.keywordsTags = null;
                    }
                });
            }
        ])
        .controller('TorrentDetailsCtrl', [
            '$scope',
            '$rootScope',
            '$http',
            '$timeout',
            '$mdDialog',
            '$window',
            'torrent',
            'ngProgress',
            function ($scope, $rootScope, $http, $timeout, $mdDialog, $window, torrent, ngProgress) {
                $scope.lang = $rootScope.lang;
                $scope.torrent = torrent;
                $scope.user = $rootScope.user;
                $scope.fileContainer = false;
                $scope.showComments = false;
                $scope.showSyncStatus = false;
                $timeout(rejustifyImagesInTorrentDetails, 500);
                if (torrent.content && torrent.content.length <= 1) {
                    $scope.fileContainer = true;
                }
                if (torrent.tag_ids && torrent.tag_ids.length > 0) {
                    $rootScope.fetchTags(torrent.tag_ids, function (err, tags) {
                        if (tags) {
                            $scope.torrent.tags = tags;
                        }
                    });
                }
                $scope.downloadTorrent = function (torrent) {
                    torrent.downloads += 1;
                    var downloadLink = '/download/torrent/' + torrent._id +
                        '/' + torrent.title.replace(/[\:\<\>\/\\\|\*\?\"]/g, '_') + '.torrent';
                    var urlCreator = $window.URL || $window.webkitURL || $window.mozURL || $window.msURL;
                    var link = document.createElement("a");
                    if (urlCreator && "download" in link) {
                        ngProgress.start();
                        $http.get(downloadLink, {responseType: 'arraybuffer'})
                            .success(function (data) {
                                ngProgress.complete();
                                var blob = new Blob([data], {type: 'application/octet-stream'});
                                var url = urlCreator.createObjectURL(blob);
                                link.setAttribute("href", url);
                                link.setAttribute("download", torrent.title + '.torrent');
                                var event = document.createEvent('MouseEvents');
                                // deprecated method, improvement needed
                                event.initMouseEvent('click', true, true, $window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
                                link.dispatchEvent(event);
                            })
                            .error(function (err) {
                                ngProgress.complete();
                                // TODO error message
                            });
                    } else {
                        // urlCreator not support, redirect to normal http download
                        window.location = downloadLink;
                    }
                };

                $scope.edit = function (ev) {
                    $rootScope.editTorrent(ev, $scope.torrent, $scope.user, function () {
                    });
                };
                $scope.close = function () {
                    $mdDialog.cancel();
                };
            }
        ])
        .controller('UnifiedIndexCtrl', [
            '$scope',
            '$rootScope',
            '$state',
            '$http',
            '$q',
            '$mdDialog',
            'ngProgress',
            function ($scope, $rootScope, $state, $http, $q, $mdDialog, ngProgress) {
                ngProgress.start();
                $scope.currentPage = 0;
                $rootScope.$on('torrentAdd', function (ev, torrent) {
                    $scope.lattorrents.unshift(torrent);
                });
                $scope.removeTorrent = function (ev, torrent, i) {
                    $rootScope.removeTorrent(ev, torrent, function (err) {
                        if (!err) {
                            $scope.lattorrents.splice(i, 1);
                        }
                    });
                };
                $scope.editTorrent = function (ev, torrent, i) {
                    $rootScope.editTorrent(ev, torrent, $scope.user, function (err, torrent) {
                        if (!err) {
                            $scope.lattorrents[i] = torrent;
                        }
                    });
                };
                $scope.lattorrents = [];
                $scope.coltorrents = [];
                var latestTorrents = $http.get('/api/torrent/latest', {cache: false}),
                    recentBangumis = $http.get('/api/bangumi/recent', {cache: false}),
                    timelineBangumis = $http.get('/api/bangumi/timeline', {cache: false}),
                    colTorrents = $http.get('/api/torrent/collections', {cache: false});
                //DONT check $rootScope.user, since it load user
                var q = [latestTorrents, recentBangumis, timelineBangumis, colTorrents];
                $q.all(q).then(function (dataArray) {
                    $scope.totalPages = dataArray[0].data.page;
                    Array.prototype.push.apply($scope.lattorrents, dataArray[0].data.torrents);
                    Array.prototype.push.apply($scope.coltorrents, dataArray[3].data);
                    $scope.currentPage = 1;
                    // Calculate week day on client side may cause errors
                    $scope.availableDays = [];
                    $scope.data = {};
                    $scope.data.selectedIndex = 2;

                    var tag_ids = [];
                    var rbs = dataArray[1].data;
                    var startSlide = 0;
                    rbs.forEach(function (rb) {
                        tag_ids.push(rb.tag_id);
                    });
                    function getShowList() {
                        var weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        var showList = [];
                        var aDays = [];
                        var tempList = {};
                        var avdays = {};
                        var theFirstDay = 0;
                        rbs.forEach(function (rb) {
                            if (tempList[rb.showOn]) {
                                tempList[rb.showOn].push(rb);
                            } else {
                                tempList[rb.showOn] = [rb];
                            }
                            avdays[rb.showOn] = true;
                        });
                        //find the first day
                        var maxCount = 0;
                        for (var i = 0; i < weekDays.length; i++) {
                            var count = 0;
                            for (var j = i; j < i + 4; j++) {
                                var k = j % weekDays.length;
                                if (avdays[k]) {
                                    count++;
                                }
                            }
                            if (count > maxCount) {
                                maxCount = count;
                                theFirstDay = i;
                            }
                        }
                        for (var j = theFirstDay; j < theFirstDay + 4; j++) {
                            var k = j % weekDays.length;
                            aDays.push(weekDays[k]);
                            showList.push(tempList[k]);
                        }
                        if (showList.length > 1 && showList[0] && showList[1]
                            && showList[0].length > 0 && showList[1].length > 0) {
                            startSlide = showList[0].length;
                            if (showList[2] && showList[2].length > 0) {
                                startSlide += showList[1].length;
                                if (showList[3] && showList[3].length > 0) {
                                    //end on the third day (today)
                                    startSlide += 1;
                                }
                            }
                        }
                        $scope.availableDays = aDays;
                        $scope.showList = showList;
                    }

                    getShowList();

                    var ts = [].concat($scope.lattorrents).concat($scope.coltorrents);
                    $rootScope.fetchTorrentUserAndTeam(ts, function () {
                        ngProgress.complete();
                    });
                    $rootScope.fetchTags(tag_ids, true, function (err, _tags) {
                        if (_tags) {
                            rbs.forEach(function (rb, i) {
                                if (rbs[i].tag_id) {
                                    rbs[i].tag = _tags[rbs[i].tag_id];
                                }
                            });
                            getShowList();
                        }
                    });

                    //set timelinejs lazyload path
                    window.embed_path = '/scripts/timelinejs/';

                    var lang = $rootScope.lang;
                    lang = lang.replace('_', '-'); //like 'zh-tw'
                    createStoryJS({
                        type: 'timeline',
                        width: '100%',
                        height: '500',
                        lang: lang,
                        start_at_slide: startSlide,
                        source: dataArray[2].data,
                        embed_id: 'bangumi-timeline-embed'
                    });
                });
                var loadMore = function () {
                    ngProgress.start();
                    $http.get('/api/torrent/page/' + ($scope.currentPage + 1), {cache: false, responseType: 'json'})
                        .success(function (data) {
                            if (data && data.torrents) {
                                var nt = data.torrents;
                                $rootScope.fetchTorrentUserAndTeam(nt, function () {
                                    ngProgress.complete();
                                });
                                Array.prototype.push.apply($scope.lattorrents, nt);
                                //$scope.torrents = $scope.torrents.concat(nt);
                                $scope.currentPage += 1;
                            } else {
                                ngProgress.complete();
                            }
                        })
                        .error(function () {
                            ngProgress.complete();
                        });
                };
                $scope.loadMore = loadMore;
            }
        ])
        .controller('TagSearchCtrl', [
            '$stateParams',
            '$scope',
            '$rootScope',
            '$http',
            '$q',
            'ngProgress',
            function ($stateParams, $scope, $rootScope, $http, $q, ngProgress) {
                ngProgress.start();
                $scope.removeTorrent = function (ev, torrent, i) {
                    $rootScope.removeTorrent(ev, torrent, function (err) {
                        if (!err) {
                            $scope.torrents.splice(i, 1);
                        }
                    });
                };
                $scope.editTorrent = function (ev, torrent, i) {
                };
                var tag_id = $stateParams.tag_id;
                var reqTag = $http.post('/api/tag/fetch', {_id: tag_id}, {responseType: 'json'}),
                    reqTorrents = $http.post('/api/torrent/search', {tag_id: tag_id}, {responseType: 'json'});
                $q.all([reqTag, reqTorrents]).then(function (dataArray) {
                    $scope.tag = dataArray[0].data;
                    $scope.torrents = dataArray[1].data;
                    /*
                    //This part for tag opt search

                    $scope.optTags = [];
                    $scope.tags = [];

                    var tag_ids = [];
                    //TODO: tag_ids need from server
                    for (var i = 0; i < $scope.torrents.length; i++) {
                        if ($scope.torrents[i].tag_ids) {
                            tag_ids = tag_ids.concat($scope.torrents[i].tag_ids);
                        }
                    }
                    if (tag_ids.length > 0) {
                        $rootScope.fetchTags(tag_ids, function (err, tags) {
                            if (tags) {
                                for (var i = 0; i < tags.length; i++) {
                                    if (tags[i]._id == $scope.tag._id) {
                                        tags.splice(i, 1);
                                        break;
                                    }
                                }
                                $scope.optTags = tags;
                            }
                        });
                    }*/
                    $rootScope.fetchTorrentUserAndTeam($scope.torrents, function () {
                        ngProgress.complete();
                    });
                });
            }
        ])
        .controller('SearchFilterCtrl', [
            '$scope',
            '$rootScope',
            '$state',
            '$stateParams',
            '$location',
            '$http',
            '$q',
            '$mdDialog',
            'ngProgress',
            function ($scope, $rootScope, $state, $stateParams, $location, $http, $q, $mdDialog, ngProgress) {
                $scope.selectedTags = [];
                var selectedTagIds = [];
                $scope.searchByTitle = false;
                $scope.tags = {};
                $scope.tagTypeList = ['lang', 'resolution', 'format', 'misc', 'bangumi', 'team'];
                $scope.torrents = [];
                $scope.searched = false;
                $scope.tagsCollapse = true;
                $scope.rsslink = '/rss/latest';
                ngProgress.start();

                $scope.addSubscribe = function (ev) {
                    if (selectedTagIds.length <= 0) {
                        return;
                    }
                    $rootScope.showUserDialog(ev, {type: 'subscribe', selectedTagIds: selectedTagIds});
                };

                $scope.update = function () {
                    if (selectedTagIds.length <= 0) {
                        $location.path('/search/index');
                        return;
                    }
                    if (typeof selectedTagIds === 'string') {
                        $location.path('/search/' + selectedTagIds);
                    } else {
                        var location_path = '/search/';
                        for (var i = 0; i < selectedTagIds.length; i++) {
                            location_path += selectedTagIds[i];
                            if (i < selectedTagIds.length - 1) {
                                location_path += '+';
                            }
                        }
                        $location.path(location_path);
                    }
                    updateSearchResults(selectedTagIds, function (err, ts) {
                        $scope.searched = true;
                        if (!err && ts) {
                            $scope.torrents = ts;
                        } else {
                            $scope.torrents = [];
                        }
                    });
                };

                var queries = [];
                queries.push($http.get('/api/tag/popbangumi', {responseType: 'json'}));
                queries.push($http.get('/api/tag/team', {responseType: 'json'}));
                queries.push($http.get('/api/tag/common', {responseType: 'json'}));
                if ($stateParams.tag_id && $stateParams.tag_id !== 'index') {
                    if ($stateParams.tag_id.indexOf('+') !== -1) {
                        var param_tag_ids = $stateParams.tag_id.split('+');
                        queries.push($http.post('/api/tag/fetch', {_ids: param_tag_ids}, {responseType: 'json'}));
                    } else {
                        queries.push($http.post('/api/tag/fetch', {_id: $stateParams.tag_id}, {responseType: 'json'}));
                    }
                }
                $q.all(queries).then(function (dataArray) {
                    var tags = {};
                    for (var i = 0; i < 3; i++) {
                        if (dataArray[i].data) {
                            for (var j = 0; j < dataArray[i].data.length; j++) {
                                var t = dataArray[i].data[j];
                                if (tags[t.type]) {
                                    tags[t.type].push(t);
                                } else {
                                    tags[t.type] = [t];
                                }
                            }
                        }
                    }

                    $scope.tags = tags;
                    if (dataArray.length > 3) {
                        if (dataArray[3].data instanceof Array) {
                            dataArray[3].data.forEach(function (tag) {
                                if (tag && tag._id) {
                                    $scope.addTag(tag, true);
                                }
                            });
                        } else {
                            var tag = dataArray[3].data;
                            if (tag && tag._id) {
                                $scope.addTag(tag, true);
                            }
                        }
                        $scope.update();
                    } else {
                        ngProgress.complete();
                    }
                });

                $scope.searchTag = function (tagname) {
                    if (!tagname || tagname.length < 2) {
                        return;
                    }
                    ngProgress.start();
                    $scope.searching = 'Searching...';
                    $http.post('/api/tag/search', {name: tagname, multi: true}, {responseType: 'json'})
                        .success(function (data) {
                            ngProgress.complete();
                            if (data.success && data.found) {
                                $scope.searching = 'Search results for: ';
                                for (var i = 0; i < data.tag.length; i++) {
                                    $scope.addTag(data.tag[i], true);
                                }
                                $scope.update();
                            } else {
                                $scope.searching = 'No results found for: ';
                            }
                        })
                        .error(function () {
                            ngProgress.complete();
                            $scope.searching = 'Server error when searching for: ';
                        });
                };

                $scope.canceler = null;
                $scope.$watch('newTagName', function (newValue, oldValue) {
                    if ($scope.canceler) {
                        $scope.canceler.resolve();
                    }
                    var tagname = newValue;
                    if (tagname && tagname.length >= 2) {
                        $scope.canceler = $q.defer();
                        $http.post('/api/tag/search',
                            {name: tagname, keywords: true, multi: true},
                            {responseType: 'json', timeout: $scope.canceler.promise})
                            .success(function (data) {
                                if (data && data.found) {
                                    $scope.keywordsTags = data.tag;
                                } else {
                                    $scope.keywordsTags = null;
                                }
                                $scope.canceler = null;
                            })
                            .error(function () {
                                $scope.canceler = null;
                            });
                    } else {
                        $scope.keywordsTags = null;
                    }
                });

                $scope.searchTitle = function (title) {
                    if (!title || title.length < 2) {
                        return;
                    }
                    updateSearchResults(title, function (err, ts) {
                        $scope.searched = true;
                        if (!err && ts) {
                            $scope.torrents = ts;
                        } else {
                            $scope.torrents = [];
                        }
                    });
                };
                var indexOfById = function (ts, t) {
                    if (!ts) {
                        return -1;
                    }
                    for (var i = 0; i < ts.length; i++) {
                        if (ts[i]._id == t._id) {
                            return i;
                        }
                    }
                    return -1;
                };
                $scope.addTag = function (tag, notupdate) {
                    var i = indexOfById($scope.tags[tag.type], tag);
                    if (i >= 0) {
                        $scope.tags[tag.type].splice(i, 1);
                    }
                    if (indexOfById($scope.selectedTags, tag) >= 0) {
                        return;
                    } else {
                        $scope.selectedTags.push(tag);
                        selectedTagIds.push(tag._id);
                    }
                    if (notupdate) {
                        return;
                    }
                    $scope.update();
                };
                $scope.removeTag = function (tag) {
                    var i = indexOfById($scope.selectedTags, tag);
                    if (i >= 0) {
                        $scope.selectedTags.splice(i, 1);
                        selectedTagIds.splice(selectedTagIds.indexOf(tag._id), 1);
                    }
                    if ($scope.tags[tag.type]) {
                        $scope.tags[tag.type].push(tag);
                    } else {
                        $scope.tags[tag.type] = [tag];
                    }
                    if ($scope.selectedTags.length === 0) {
                        $scope.searched = false;
                        $scope.rsslink = '/rss/latest';
                    }
                    $scope.update();
                };
                var updateSearchResults = function (tag_ids, callback) {
                    ngProgress.start();
                    var b = {};
                    var rsslink = '/rss/tags/';
                    var apiUrl = '/api/torrent/search';
                    if (typeof tag_ids == 'string') {
                        //title
                        b.title = tag_ids;
                        rsslink = '';
                        apiUrl += '/title';
                    } else {
                        b.tag_id = tag_ids;
                        tag_ids.forEach(function (tag_id, i) {
                            rsslink += tag_id + ((i + 1) < tag_ids.length ? '+' : '');
                        });
                    }
                    $scope.rsslink = rsslink;

                    $http.post(apiUrl, b, {responseType: 'json'})
                        .success(function (data) {
                            if (data && data.length) {
                                $rootScope.fetchTorrentUserAndTeam(data, function () {
                                    ngProgress.complete();
                                    callback(null, data);
                                });
                            } else {
                                ngProgress.complete();
                                callback();
                            }
                        })
                        .error(function () {
                            ngProgress.complete();
                            callback();
                        });
                }
            }
        ])
    ;

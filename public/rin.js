"use strict";

/**
 * public/angular-prpr.js
 * Rin prpr!
 *
 * rin-pr project angular app
 * WE LOVE ACG
 *
 * */

var rin = angular.module('rin', [
    'ngProgress',
    'ui.router',
    'pascalprecht.translate',
    'ngMaterial',
    'ngAnimate',
    'ngCookies',
    'angular-md5',
    'angularMoment',
    'angular-redactor'
])
    .run([
        '$rootScope',
        '$state',
        '$stateParams',
        '$translate',
        'amMoment',
        '$mdDialog',
        '$translateCookieStorage',
        'ngProgress',
        'redactorOptions',
        function (
            $rootScope,
            $state,
            $stateParams,
            $translate,
            amMoment,
            $mdDialog,
            $translateCookieStorage,
            ngProgress,
            redactorOptions
        ) {
            ngProgress.start();
            $rootScope.$state = $state;
            $rootScope.$stateParams = $stateParams;
            $rootScope.switchLang = function(lang, notSetCookie) {
                $rootScope.lang = lang;
                $translate.use(lang);
                if (!notSetCookie) {
                    $translateCookieStorage.set('cookieLangConfig', lang);
                }
                amMoment.changeLocale(lang);
                redactorOptions.lang = lang;
            };
            $rootScope.showTorrentDetailsDialog = function (ev, torrent) {
                $mdDialog.show({
                    controller: 'TorrentDetailsCtrl',
                    templateUrl: 'templates/torrent-details.html',
                    targetEvent: ev,
                    locals: { torrent: torrent }
                });
            };
            var cookieLangConfig = $translateCookieStorage.get('cookieLangConfig');
            if (!cookieLangConfig) {
                cookieLangConfig = 'en';
            }
            $rootScope.switchLang(cookieLangConfig, true);
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
        function (
            $stateProvider,
            $urlRouterProvider,
            $httpProvider,
            $locationProvider,
            $translateProvider,
            $compileProvider,
            redactorOptions
        ) {

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
                    templateUrl: 'templates/index-unified.html',
                    controller: 'UnifiedIndexCtrl'
                })
                .state("tag", {
                    url: "/tag/:tag_id",
                    templateUrl: 'templates/tag-search.html',
                    controller: 'TagSearchCtrl'
                });

            $httpProvider.defaults.transformRequest = function(data) {
                if (data === undefined)
                  return data;

                var needMultipart = false;
                angular.forEach(data, function(value, key) {
                  if (value instanceof FileList) {
                    needMultipart = true;
                  }
                });
                if (!needMultipart) {
                  //transform to JSON
                  return JSON.stringify(data);
                }

                var fd = new FormData();
                angular.forEach(data, function(value, key) {
                  if (value instanceof FileList) {
                    if (value.length == 1) {
                      fd.append(key, value[0]);
                    } else {
                      angular.forEach(value, function(file, index) {
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

            redactorOptions.imageUpload = '/api/file/upload/image?for=redactor';
            redactorOptions.imageManagerJson = '/api/file/all/image';
            redactorOptions.plugins = ['fontcolor', 'imagemanager'];
        }
    ])
    .filter('to_trusted', ['$sce', function($sce) {
        return function(text) {
            return $sce.trustAsHtml(text);
        };
    }])
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
    .controller('SidebarCtrl', [
        '$scope',
        '$http',
        '$mdDialog',
        'md5',
        'ngProgress',
        function($scope, $http, $mdDialog, md5, ngProgress) {
            $scope.isExpanded = false;
            $scope.setUser = function (user) {
                if (user && user.email) {
                    user.emailHash = md5.createHash(user.email);
                }
                $scope.user = user;
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
                $http.get('/api/user/signout', { cache: false, responseType: 'json' })
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
                    templateUrl: 'templates/user-signin.html',
                    targetEvent: ev
                }).then(function (user) {
                    $scope.setUser(user);
                    $scope.expand();
                });
            };
            $scope.showTeamDialog = function (ev) {
                $mdDialog.show({
                    controller: 'TeamActionsCtrl',
                    templateUrl: 'templates/team-actions.html',
                    targetEvent: ev,
                    locals: { user: $scope.user }
                }).then(function () {
                }).finally(function() {
                    $('.redactor-toolbar-tooltip').remove();
                });
            };
            $scope.showPublishDialog = function (ev) {
                $mdDialog.show({
                    controller: 'TorrentPublishCtrl',
                    templateUrl: 'templates/torrent-publish.html',
                    targetEvent: ev,
                    locals: { user: $scope.user }
                }).then(function (torrent) {
                    //TODO: add torrent to list
                    if (torrent) {
                        $scope.state.reload();
                    }
                }).finally(function() {
                    $('.redactor-toolbar-tooltip').remove();
                });
            };
            $http.get('/api/user/session', { cache: false, responseType: 'json' })
                .success(function (data, status) {
                    if (data && data._id) {
                        $scope.setUser(data);
                    }
                });
        }
    ])
    .controller('UserSigninCtrl', [
        '$scope',
        '$http',
        '$mdDialog',
        'md5',
        'ngProgress',
        function($scope, $http, $mdDialog, md5, ngProgress) {
            $scope.working = false;
            $scope.user = {};
            function jobError() {
                $scope.working = false;
                $scope.jobFailed = true;
            }
            $scope.switchMode = function() {
                if ($scope.working) {
                    return;
                }
                $scope.jobFailed = false;
                $scope.isRegister = !$scope.isRegister;
            };
            $scope.signin = function() {
                if ($scope.working) {
                    return;
                }
                $scope.jobFailed = false;
                if ($scope.user.username && $scope.user.password) {
                    $scope.working = true;
                    ngProgress.start();
                    var u = {
                        username: $scope.user.username,
                        password: md5.createHash($scope.user.password)
                    };
                    $http.post('/api/user/signin', u, { cache: false, responseType: 'json' })
                        .success(function(data, status) {
                            if (data && data.success) {
                                $mdDialog.hide(data.user);
                            } else {
                                jobError();
                            }
                            ngProgress.complete();
                        })
                        .error(function(data, status) {
                            jobError();
                            ngProgress.complete();
                        });
                }
            };
            $scope.register = function() {
                if ($scope.working) {
                    return;
                }
                $scope.jobFailed = false;
                if ($scope.user.password != $scope.user.password2
                    || $scope.user.password.length < 6) {
                    $scope.user.password = $scope.user.password2 = '';
                    jobError();
                    return;
                }
                if ($scope.user.username && $scope.user.password && $scope.user.email) {
                    $scope.working = true;
                    ngProgress.start();
                    var u = {
                        username: $scope.user.username,
                        email: $scope.user.email,
                        password: md5.createHash($scope.user.password)
                    };
                    $http.post('/api/user/register', u, { cache: false, responseType: 'json' })
                        .success(function(data, status) {
                            if (data && data.success) {
                                $mdDialog.hide(data.user);
                            } else {
                                jobError();
                            }
                            ngProgress.complete();
                        })
                        .error(function(data, status) {
                            jobError();
                            ngProgress.complete();
                        });
                }
            };
            $scope.cancel = function() {
                $mdDialog.cancel();
            };
        }
    ])
    .controller('TeamActionsCtrl', [
        '$scope',
        '$http',
        '$mdDialog',
        'user',
        'ngProgress',
        function($scope, $http, $mdDialog, user, ngProgress) {
            $scope.user = user;
            $scope.data = {};
            $scope.newteam = {};
            $scope.jointeam = {};
            $scope.working = false;
            $scope.jobFailed = false;
            if (user.team_id) {
                $http.get('/api/team/myteam', { responseType: 'json' })
                    .success(function (data) {
                        $scope.team = data;
                        if (data.admin_id == user._id) {
                            //is admin
                            $http.get('/api/team/members/pending', { responseType: 'json' })
                                .success(function (data) {
                                    $scope.teamPendingMembers = data;
                                });
                        }
                    });
                $http.get('/api/team/members', { responseType: 'json' })
                    .success(function (data) {
                        $scope.teamMembers = data;
                    });
            } else {
                $http.get('/api/team/myjoining', { responseType: 'json' })
                    .success(function (data) {
                        $scope.teamJoining = data;
                        $scope.jointeam.name = data.name;
                    });
                $http.get('/api/team/pending', { cache: false, responseType: 'json' })
                    .success(function (data) {
                        $scope.teamPending = data;
                    });
            }
            if (user.group == 'admin') {
                $http.get('/api/team/all/pending', { cache: false, responseType: 'json' })
                    .success(function (data) {
                        var tr = data;
                        $scope.teamRequests = tr;
                        var user_ids = [];
                        data.forEach(function (t) {
                            user_ids.push(t.admin_id);
                        });
                        if (user_ids.length > 0) {
                            $http.post('/api/user/fetch', {_ids: user_ids}, { responseType: 'json' })
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
            function jobError() {
                $scope.working = false;
                $scope.jobFailed = true;
            }
            $scope.join = function () {
                $scope.jobFailed = false;
                var jt = $scope.jointeam;
                if (jt && jt.name) {
                    $http.post('/api/team/join', jt, { cache: false, responseType: 'json' })
                        .success(function (data) {
                            if (data && data.success) {
                                $http.get('/api/team/myjoining', { responseType: 'json' })
                                    .success(function (data) {
                                        $scope.teamJoining = data;
                                        $scope.jointeam.name = data.name;
                                    });
                            }
                        });
                }
            };
            $scope.remove = function (ev, team_id, user_id) {
                $scope.jobFailed = false;
                var j = { team_id: team_id, user_id: user_id };
                $http.post('/api/team/remove', j, { cache: false, responseType: 'json' })
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
                $scope.jobFailed = false;
                var j = { team_id: team_id, user_id: user_id };
                if (isMember) j.type = 'member';
                $http.post('/api/team/approve', j, { cache: false, responseType: 'json' })
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
                $scope.jobFailed = false;
                var j = { team_id: team_id, user_id: user_id };
                if (isMember) j.type = 'member';
                $http.post('/api/team/reject', j, { cache: false, responseType: 'json' })
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
                $scope.jobFailed = false;
                var t = $scope.team;
                if (t && (t.new_icon || t.signature)) {
                    $scope.working = true;
                    var nt = {
                        _id: t._id,
                        icon: t.new_icon,
                        signature: t.signature
                    };
                    $http.post('/api/team/update', nt, { cache: false, responseType: 'json' })
                        .success(function (data) {
                            if (data && data.success) {
                                $scope.working = false;
                                //refresh
                                $http.get('/api/team/myteam', { cache: false, responseType: 'json' })
                                    .success(function (data) {
                                        $scope.team = data;
                                    });
                            } else {
                                jobError();
                            }
                        })
                        .error(function (data) {
                            jobError();
                        });
                }
            };
            $scope.submit = function () {
                $scope.jobFailed = false;
                var nt = $scope.newteam;
                if (nt && nt.name && nt.certification) {
                    $scope.working = true;
                    $http.post('/api/team/register', nt, { cache: false, responseType: 'json' })
                        .success(function (data) {
                            if (data && data.success) {
                                $scope.working = false;
                                $scope.teamPending = data.team;
                            } else {
                                jobError();
                            }
                        })
                        .error(function (data) {
                            jobError();
                        });
                }
            };
            $scope.close = function () {
                $mdDialog.hide();
            };
        }
    ])
    .controller('TorrentPublishCtrl', [
        '$scope',
        '$http',
        '$mdDialog',
        'user',
        'ngProgress',
        function($scope, $http, $mdDialog, user, ngProgress) {
            $scope.user = user;
            $scope.working = false;
            $scope.torrent = {};
            function jobError() {
                $scope.working = false;
                $scope.jobFailed = true;
            }
            $scope.publish = function () {
                if ($scope.working) {
                    return;
                }
                $scope.jobFailed = false;
                if ($scope.torrent.title && $scope.torrent.introduction && $scope.torrent_file) {
                    $scope.working = true;
                    var nt = {
                        title: $scope.torrent.title,
                        introduction: $scope.torrent.introduction,
                        file: $scope.torrent_file,
                        inteam: $scope.torrent.inteam
                    };
                    ngProgress.complete();
                    $http.post('/api/torrent/add', nt, { cache: false, responseType: 'json' })
                        .success(function(data, status) {
                            if (data && data.success) {
                                $mdDialog.hide(data.user);
                            } else {
                                jobError();
                            }
                            ngProgress.complete();
                        })
                        .error(function(data, status) {
                            jobError();
                            ngProgress.complete();
                        });
                }
            };
            $scope.cancel = function() {
                $mdDialog.cancel();
            };
        }
    ])
    .controller('TorrentDetailsCtrl', [
        '$scope',
        '$http',
        '$mdDialog',
        'torrent',
        'ngProgress',
        function($scope, $http, $mdDialog, torrent, ngProgress) {
            $scope.torrent = torrent;

            $scope.close = function() {
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
        function($scope, $rootScope, $state, $http, $q, $mdDialog, ngProgress) {
            ngProgress.start();
            var latestTorrents = $http.get('/api/torrent/latest', { cache: false }),
                recentBangumis = $http.get('/api/bangumi/recent', { cache: false }),
                timelineBangumis = $http.get('/api/bangumi/timeline', { cache: false });
            $q.all([latestTorrents, recentBangumis, timelineBangumis]).then(function(dataArray) {
                var lt = dataArray[0].data.torrents;
                var user_ids = [], team_ids = [];
                for (var i = 0; i < lt.length; i++) {
                    if (lt[i].uploader_id) {
                        user_ids.push(lt[i].uploader_id);
                    }
                    if (lt[i].team_id) {
                        team_ids.push(lt[i].team_id);
                    }
                }
                if (user_ids.length > 0) {
                    $http.post('/api/user/fetch', {_ids: user_ids}, { responseType: 'json' })
                        .success(function (data, status) {
                            if (data) {
                                for (var i = 0; i < lt.length; i++) {
                                    for (var j = 0; j < data.length; j++) {
                                        if (lt[i].uploader_id == data[j]._id) {
                                            lt[i].uploader = data[j];
                                            break;
                                        }
                                    }
                                }
                            }
                        });
                }
                if (team_ids.length > 0) {
                    $http.post('/api/team/fetch', {_ids: team_ids}, { responseType: 'json' })
                        .success(function (data, status) {
                            if (data) {
                                for (var i = 0; i < lt.length; i++) {
                                    for (var j = 0; j < data.length; j++) {
                                        if (lt[i].team_id == data[j]._id) {
                                            lt[i].team = data[j];
                                            break;
                                        }
                                    }
                                }
                            }
                        });
                }
                $scope.latestTorrents = lt;
                // Calculate week day on client side may cause errors
                $scope.availableDays = [];
                var weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                var showList = [];
                var tempList = {};
                dataArray[1].data.forEach(function(rb) {
                    if (tempList[weekDays[rb.showOn]]) {
                        tempList[weekDays[rb.showOn]].push(rb);
                    } else {
                        tempList[weekDays[rb.showOn]] = [rb];
                    }
                });
                weekDays.forEach(function(day) {
                    if (tempList[day]) {
                        $scope.availableDays.push(day);
                        showList.push(tempList[day]);
                    }
                });
                $scope.showList = showList;
                $scope.data.selectedIndex = 1;

                var lang = $rootScope.lang;
                lang = lang.replace('_', '-'); //like 'zh-tw'
                createStoryJS({
                    type:       'timeline',
                    width:      '100%',
                    height:     '400',
                    lang:       lang,
                    source:     dataArray[2].data,
                    embed_id:   'bangumi-timeline-embed'
                });

                ngProgress.complete();
            });
        }
    ])
    .controller('TagSearchCtrl', [
        '$stateParams',
        '$scope',
        '$http',
        '$q',
        'ngProgress',
        function($stateParams, $scope, $http, $q, ngProgress) {
            ngProgress.start();
            var tag_id = $stateParams.tag_id;
            var reqTag = $http.post('/api/tag/fetch', { _id: tag_id }, { responseType: 'json' }),
                reqTorrents = $http.post('/api/torrent/search', { tag_id: tag_id }, { responseType: 'json' });
            $q.all([reqTag, reqTorrents]).then(function(dataArray) {
                $scope.tag = dataArray[0].data;
                $scope.torrents = dataArray[1].data;
                ngProgress.complete();
            });
        }
    ])
    .run(function($rootScope) {

    })
;

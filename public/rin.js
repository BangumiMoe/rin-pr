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
    'angular-redactor',
    'ui.bootstrap.datetimepicker'
])
    .run([
        '$rootScope',
        '$state',
        '$stateParams',
        '$translate',
        '$http',
        '$q',
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
            $http,
            $q,
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
                //moment.locale(newLocale);
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
            $rootScope.fetchTorrentUserAndTeam = function (lt, callback) {
                var user_ids = [], team_ids = [];
                for (var i = 0; i < lt.length; i++) {
                    if (lt[i].uploader_id) {
                        user_ids.push(lt[i].uploader_id);
                    }
                    if (lt[i].team_id) {
                        team_ids.push(lt[i].team_id);
                    }
                }
                var queries = [], qName = [];
                if (user_ids.length > 0) {
                    qName.push('user');
                    queries.push(
                        $http.post('/api/user/fetch', {_ids: user_ids}, { responseType: 'json' })
                    );
                }
                if (team_ids.length > 0) {
                    qName.push('team');
                    queries.push(
                        $http.post('/api/team/fetch', {_ids: team_ids}, { responseType: 'json' })
                    );

                }
                if (queries.length > 0) {
                    $q.all(queries).then(function(dataArray) {
                        for (var k = 0; k < dataArray.length; k++) {
                            var data = dataArray[k].data;
                            for (var i = 0; i < lt.length; i++) {
                                for (var j = 0; j < data.length; j++) {
                                    if (qName[k] == 'user') {
                                        if (lt[i].uploader_id == data[j]._id) {
                                            lt[i].uploader = data[j];
                                            break;
                                        }
                                    } else if (qName[k] == 'team') {
                                        if (lt[i].team_id == data[j]._id) {
                                            lt[i].team = data[j];
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        if (callback) callback();
                    });
                } else {
                    if (callback) callback();
                }
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
                $http.delete('/api/user/signout', { cache: false, responseType: 'json' })
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
            $scope.showTagDialog = function (ev) {
                $mdDialog.show({
                    controller: 'TagActionsCtrl',
                    templateUrl: 'templates/tag-actions.html',
                    targetEvent: ev,
                    locals: { user: $scope.user }
                }).then(function () {
                }).finally(function() {
                });
            };
            $scope.showBangumiDialog = function (ev) {
                $mdDialog.show({
                    controller: 'BangumiActionsCtrl',
                    templateUrl: 'templates/bangumi-actions.html',
                    targetEvent: ev,
                    locals: { user: $scope.user }
                }).then(function () {
                }).finally(function() {
                });
            };
            $scope.showPublishDialog = function (ev) {
                $mdDialog.show({
                    controller: 'TorrentPublishCtrl',
                    templateUrl: 'templates/torrent-publish.html',
                    targetEvent: ev,
                    clickOutsideToClose: false,
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
        '$filter',
        '$mdDialog',
        'md5',
        'ngProgress',
        function($scope, $http, $filter, $mdDialog, md5, ngProgress) {
            $scope.working = false;
            $scope.user = {};
            function jobError() {
                $scope.working = false;
                $scope.jobFailed = true;
            }
            $scope.switchMode = function(type) {
                if ($scope.working) {
                    return;
                }
                $scope.jobFailed = false;
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
            $scope.reset = function(ev) {
                if ($scope.working) {
                    return;
                }
                $scope.jobFailed = false;
                if ($scope.user.username && $scope.user.email) {
                    $scope.working = true;
                    ngProgress.start();
                    var u = {
                        username: $scope.user.username,
                        email: $scope.user.email
                    };
                    $http.post('/api/user/reset-password', u, { cache: false, responseType: 'json' })
                        .success(function(data, status) {
                            if (data && data.success) {
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
            $scope.close = function() {
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
                $mdDialog.cancel();
            };
        }
    ])
    .controller('TagActionsCtrl', [
        '$scope',
        '$http',
        '$mdDialog',
        'user',
        'ngProgress',
        function($scope, $http, $mdDialog, user, ngProgress) {
            $scope.user = user;
            $scope.tag = {};
            $scope.jobFailed = false;
            $scope.working = false;
            function jobError() {
                $scope.working = false;
                $scope.jobFailed = true;
            }
            $scope.search = function() {
                $scope.jobFailed = false;
                if ($scope.tag.name) {
                    $scope.working = true;
                    $http.post('/api/tag/search', {name: $scope.tag.name}, { cache: false, responseType: 'json' })
                        .success(function (data) {
                            if (data && data.success) {
                                $scope.working = false;
                                if (data.found) {
                                    $scope.tag = data.tag;
                                } else {
                                    $scope.tag.synonyms = [''];
                                    $scope.notfound = true;
                                }
                            } else {
                                jobError();
                            }
                        })
                        .error(function (data) {
                            jobError();
                        });
                }
            };
            $scope.increase = function() {
                $scope.tag.synonyms.push('');
            };
            $scope.remove = function(i) {
                $scope.tag.synonyms.splice(i, 1);
            };
            $scope.add = function() {
                $scope.jobFailed = false;
                if ($scope.notfound) {
                    $scope.working = true;
                    var t = {
                        name: $scope.tag.name,
                        synonyms: $scope.tag.synonyms
                    };
                    $http.post('/api/tag/add', t, { cache: false, responseType: 'json' })
                        .success(function (data) {
                            if (data && data.success) {
                                $scope.working = false;
                                $scope.notfound = false;
                                $scope.tag = data.tag;
                            } else {
                                jobError();
                            }
                        })
                        .error(function (data) {
                            jobError();
                        });
                }
            };
            $scope.save = function() {
                $scope.jobFailed = false;
                if ($scope.tag._id) {
                    $scope.working = true;
                    var t = {
                        _id: $scope.tag._id,
                        name: $scope.tag.name,
                        synonyms: $scope.tag.synonyms
                    };
                    $http.post('/api/tag/update', t, { cache: false, responseType: 'json' })
                        .success(function (data) {
                            if (data && data.success) {
                                $scope.working = false;
                            } else {
                                jobError();
                            }
                        })
                        .error(function (data) {
                            jobError();
                        });
                }
            };
            $scope.delete = function() {
                $scope.jobFailed = false;
                if ($scope.tag._id) {
                    $scope.working = true;
                    $http.post('/api/tag/remove', {_id: $scope.tag._id}, { cache: false, responseType: 'json' })
                        .success(function (data) {
                            if (data && data.success) {
                                $scope.working = false;
                                $scope.notfound = false;
                                $scope.tag = {};
                            } else {
                                jobError();
                            }
                        })
                        .error(function (data) {
                            jobError();
                        });
                }
            };
            $scope.close = function() {
                $mdDialog.cancel();
            };
        }
    ])
    .controller('BangumiActionsCtrl', [
        '$scope',
        '$http',
        '$filter',
        '$mdDialog',
        'user',
        'ngProgress',
        function($scope, $http, $filter, $mdDialog, user, ngProgress) {
            $scope.user = user;
            $scope.data = {};
            $scope.bangumi = {};
            $scope.newbangumi = { timezone: 9, showOn: 0 };
            $scope.jobFailed = false;
            $scope.working = false;
            $scope.date = null;
            $scope.weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            function jobError() {
                $scope.working = false;
                $scope.jobFailed = true;
            }
            function timezoneT(date) {
                var d = new Date(date);
                var utc = d.getTime() + (d.getTimezoneOffset() * 60000);
                var offset = parseInt($scope.newbangumi.timezone);
                return new Date(utc + (3600000*offset));
            }
            function isValid(bgm) {
                if (bgm && bgm.name && bgm.credit
                    && bgm.startDate && bgm.endDate && bgm.showOn >= 0) {
                    return true;
                }
                return false;
            }
            $scope.setDate = function(type) {
                $scope.settingDate = type;
            };
            $scope.add = function() {
                $scope.jobFailed = false;
                if (isValid($scope.newbangumi)
                    && $scope.newbangumi.icon
                    && $scope.newbangumi.cover) {
                    $scope.working = true;
                    var t = {
                        name: $scope.newbangumi.name,
                        credit: $scope.newbangumi.credit,
                        startDate: $scope.newbangumi.startDate.getTime(),
                        endDate: $scope.newbangumi.endDate.getTime(),
                        showOn: $scope.newbangumi.showOn,
                        icon: $scope.newbangumi.icon,
                        cover: $scope.newbangumi.cover
                    };
                    $http.post('/api/bangumi/add', t, { cache: false, responseType: 'json' })
                        .success(function (data) {
                            if (data && data.success) {
                                $scope.working = false;
                                //Move to Management
                                $scope.data.selectedIndex = 1;
                                $scope.bangumi = data.bangumi;
                            } else {
                                jobError();
                            }
                        })
                        .error(function (data) {
                            jobError();
                        });
                }
            };
            $scope.save = function() {
                $scope.jobFailed = false;
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
                    $scope.working = true;
                    $http.post('/api/bangumi/update', t, { cache: false, responseType: 'json' })
                        .success(function (data) {
                            if (data && data.success) {
                                $scope.working = false;
                            } else {
                                jobError();
                            }
                        })
                        .error(function (data) {
                            jobError();
                        });
                }
            };
            $scope.search = function() {
                $scope.jobFailed = false;
                if ($scope.bangumi.name) {
                    $scope.working = true;
                    $http.post('/api/bangumi/search', {name: $scope.bangumi.name}, { cache: false, responseType: 'json' })
                        .success(function (data) {
                            if (data && data.success && data.found) {
                                $scope.working = false;
                                $scope.bangumi = data.bangumi;

                                var d1 = new Date(data.bangumi.startDate);
                                var d2 = new Date(data.bangumi.endDate);
                                $scope.newbangumi['startDate'] = d1;
                                $scope.newbangumi['endDate'] = d2;
                                $scope.newbangumi['startDateFormat'] = $filter('amDateFormat')(d1, 'YYYY/MM/DD HH:mm:ss');
                                $scope.newbangumi['endDateFormat'] = $filter('amDateFormat')(d2, 'YYYY/MM/DD HH:mm:ss');
                                $scope.newbangumi['showOn'] = data.bangumi.showOn;
                            } else {
                                jobError();
                            }
                        })
                        .error(function (data) {
                            jobError();
                        });
                }
            };
            $scope.delete = function() {
                $scope.jobFailed = false;
                if ($scope.bangumi._id) {
                    $scope.working = true;
                    $http.post('/api/bangumi/remove', {_id: $scope.bangumi._id}, { cache: false, responseType: 'json' })
                        .success(function (data) {
                            if (data && data.success) {
                                $scope.working = false;
                                $scope.bangumi = {};
                            } else {
                                jobError();
                            }
                        })
                        .error(function (data) {
                            jobError();
                        });
                }
            };
            $scope.close = function() {
                $mdDialog.cancel();
            };
            $scope.$watch("newbangumi.date", function(newValue, oldValue) {
                if ($scope.settingDate) {
                    $scope.newbangumi[$scope.settingDate + 'Format'] = $filter('amDateFormat')(newValue, 'YYYY/MM/DD HH:mm:ss');
                    $scope.newbangumi[$scope.settingDate] = timezoneT(newValue);
                    $scope.settingDate = '';
                }
            });
            $scope.$watch("newbangumi.timezone", function(newValue, oldValue) {
                $scope.newbangumi.startDate = $scope.newbangumi.endDate = null;
                $scope.newbangumi.startDateFormat = $scope.newbangumi.endDateFormat = '';
            });
        }
    ])
    .controller('TorrentPublishCtrl', [
        '$scope',
        '$http',
        '$timeout',
        '$mdDialog',
        'user',
        'ngProgress',
        function($scope, $http, $timeout, $mdDialog, user, ngProgress) {
            $scope.user = user;
            $scope.working = false;
            $scope.torrent = {};
            $scope.tags = [];
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
                        tag_ids: [],
                        file: $scope.torrent_file,
                        inteam: $scope.torrent.inteam ? '1' : ''
                    };
                    for (var j = 0; j < $scope.tags.length; j++) {
                        nt.tag_ids.push($scope.tags[j]._id);
                    }
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
            $scope.removeTag = function (i) {
                $scope.tags.splice(i, 1);
            };
            $scope.addTag = function (i) {
                if ($scope.newtag) {
                    $scope.working = true;
                    $http.post('/api/tag/search', {name: $scope.newtag}, { cache: false, responseType: 'json' })
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
            $scope.getSuggest = function () {
                if ($scope.torrent.title) {
                    $scope.working = true;
                    $http.get('/api/tag/suggest?s=' + $scope.torrent.title, { cache: false, responseType: 'json' })
                        .success(function (data) {
                            $scope.working = false;
                            if (data && data.length > 0) {
                                for (var i = 0; i < data.length; i++) {
                                    var found = false;
                                    for (var j = 0; j < $scope.tags.length; j++) {
                                        if ($scope.tags[j]._id == data[i]._id) {
                                            found = true;
                                            break;
                                        }
                                    }
                                    if (!found) {
                                        $scope.tags.push(data[i]);
                                    }
                                }
                            }
                        })
                        .error(function () {
                            $scope.working = false;
                        });
                }
            };
            $scope.close = function() {
                $mdDialog.cancel();
            };
            //TODO: use onblur to instead
            var lastTimeout = null;
            $scope.$watch("torrent.title", function(newValue, oldValue) {
                if (lastTimeout) $timeout.cancel(lastTimeout);
                lastTimeout = $timeout($scope.getSuggest, 2000);
            });
        }
    ])
    .controller('TorrentDetailsCtrl', [
        '$scope',
        '$http',
        '$mdDialog',
        '$window',
        'torrent',
        'ngProgress',
        function($scope, $http, $mdDialog, $window, torrent, ngProgress) {
            $scope.torrent = torrent;
            $scope.fileContainer = false;
            if (torrent.tag_ids && torrent.tag_ids.length > 0) {
                $http.post('/api/tag/fetch', { _ids: torrent.tag_ids }, { responseType: 'json' })
                    .success(function (data) {
                        if (data) {
                            $scope.torrent.tags = data;
                        }
                    });
            }
            $scope.downloadTorrent = function(torrent) {
                torrent.downloads += 1;
                var urlCreator = $window.URL || $window.webkitURL || $window.mozURL || $window.msURL;
                var link = document.createElement("a");
                if (urlCreator && "download" in link) {
                    ngProgress.start();
                    var t = { _id: torrent._id, file_id: torrent.file_id };
                    $http.post('/api/torrent/download', { torrent: t }, { responseType: 'arraybuffer' })
                        .success(function(data) {
                            ngProgress.complete();
                            var blob = new Blob([ data ], { type: 'application/octet-stream' });
                            var url = urlCreator.createObjectURL(blob);
                            link.setAttribute("href", url);
                            link.setAttribute("download", torrent.title + '.torrent');
                            var event = document.createEvent('MouseEvents');
                            // deprecated method, improvement needed
                            event.initMouseEvent('click', true, true, $window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
                            link.dispatchEvent(event);
                        })
                        .error(function(err) {
                            ngProgress.complete();
                            // TODO error message
                        });
                } else {
                    window.location = '/download/torrent/' + torrent._id;
                }
            };

            $scope.fileContainerSwitch = function() {
                $scope.fileContainer = !$scope.fileContainer;
            };
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
                $rootScope.fetchTorrentUserAndTeam(lt, function () {
                    ngProgress.complete();
                });
                $scope.torrents = lt;
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
            });
        }
    ])
    .controller('TagSearchCtrl', [
        '$stateParams',
        '$scope',
        '$rootScope',
        '$http',
        '$q',
        'ngProgress',
        function($stateParams, $scope, $rootScope, $http, $q, ngProgress) {
            ngProgress.start();
            var tag_id = $stateParams.tag_id;
            var reqTag = $http.post('/api/tag/fetch', { _id: tag_id }, { responseType: 'json' }),
                reqTorrents = $http.post('/api/torrent/search', { tag_id: tag_id }, { responseType: 'json' });
            $q.all([reqTag, reqTorrents]).then(function(dataArray) {
                $scope.optTags = [];
                $scope.tags = [];

                $scope.tag = dataArray[0].data;
                $scope.torrents = dataArray[1].data;
                var tag_ids = [];
                //TODO: tag_ids need from server
                for (var i = 0; i < $scope.torrents.length; i++) {
                    if ($scope.torrents[i].tag_ids) {
                        tag_ids = tag_ids.concat($scope.torrents[i].tag_ids);
                    }
                }
                if (tag_ids.length > 0) {
                    $http.post('/api/tag/fetch', { _ids: tag_ids }, { responseType: 'json' })
                        .success(function (data) {
                            for (var i = 0; i < data.length; i++) {
                                if (data[i]._id == $scope.tag._id) {
                                    data.splice(i, 1);
                                    break;
                                }
                            }
                            $scope.optTags = data;
                        });
                }
                $rootScope.fetchTorrentUserAndTeam($scope.torrents, function () {
                    ngProgress.complete();
                });
            });
            /*
            These functions should use with rss
            $scope.reSearch = function () {
                var tag_ids = [tag_id];
                for (var i = 0; i < $scope.tags.length; i++) {
                    tag_ids.push($scope.tags[i]._id);
                }
                if (tag_ids.length > 0) {
                    ngProgress.start();
                    $http.post('/api/torrent/search', { tag_id: tag_ids }, { responseType: 'json' })
                        .success(function (data) {
                            $scope.torrents = data;
                            if (data) {
                                $rootScope.fetchTorrentUserAndTeam($scope.torrents, function () {
                                    ngProgress.complete();
                                });
                            } else {
                                ngProgress.complete();
                            }
                        });
                }
            };
            $scope.addSearch = function (i) {
                $scope.tags.push($scope.optTags[i]);
                $scope.optTags.splice(i, 1);
                $scope.reSearch();
            };
            $scope.removeSearch = function (i) {
                $scope.optTags.push($scope.tags[i]);
                $scope.tags.splice(i, 1);
                $scope.reSearch();
            };
            */
        }
    ])
;

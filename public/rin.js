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
    'angular-md5',
    'angularMoment',
    'angular-redactor'
])
    .run(['$rootScope', '$state', '$stateParams', 'ngProgress',
        function ($rootScope, $state, $stateParams, ngProgress) {
            $rootScope.$state = $state;
            $rootScope.$stateParams = $stateParams;
        }
    ])
    .config([
        '$stateProvider',
        '$urlRouterProvider',
        '$httpProvider',
        function ($stateProvider, $urlRouterProvider, $httpProvider) {

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
        }
    ])
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
    .controller('sidebarCtrl', [
        '$scope',
        '$http',
        '$mdDialog',
        'md5',
        function($scope, $http, $mdDialog, md5) {
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
                $http.get('/api/user/signout', { cache: false, responseType: 'json' })
                    .success(function (data, status) {
                        if (data && data.success) {
                            $scope.setUser(null);
                            $scope.isExpanded = false;
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
            };
            $scope.showPublishDialog = function (ev) {
                $mdDialog.show({
                    controller: 'TorrentPublishCtrl',
                    templateUrl: 'templates/torrent-publish.html',
                    targetEvent: ev
                }).then(function (torrent) {
                    //TODO: add torrent to list
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
        function($scope, $http, $mdDialog, md5) {
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
                    $scope.user.password = md5.createHash($scope.user.password);
                    $http.post('/api/user/signin', $scope.user, { cache: false, responseType: 'json' })
                        .success(function(data, status) {
                            if (data && data.success) {
                                $mdDialog.hide(data.user);
                            } else {
                                jobError();
                            }
                        })
                        .error(function(data, status) {
                            jobError();
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
                    $scope.user.password = $scope.user.password2 = md5.createHash($scope.user.password);
                    $http.post('/api/user/register', $scope.user, { cache: false, responseType: 'json' })
                        .success(function(data, status) {
                            if (data && data.success) {
                                $mdDialog.hide(data.user);
                            } else {
                                jobError();
                            }
                        })
                        .error(function(data, status) {
                            jobError();
                        });
                }
            };
            $scope.cancel = function() {
                $mdDialog.cancel();
            };
        }
    ])
    .controller('TorrentPublishCtrl', [
        '$scope',
        '$http',
        '$mdDialog',
        function($scope, $http, $mdDialog) {
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
                    $http.post('/api/torrent/add', nt, { cache: false, responseType: 'json' })
                        .success(function(data, status) {
                            if (data && data.success) {
                                $mdDialog.hide(data.user);
                            } else {
                                jobError();
                            }
                        })
                        .error(function(data, status) {
                            jobError();
                        });
                }
            }
            $scope.cancel = function() {
                $mdDialog.cancel();
            };
        }
    ])
    .controller('UnifiedIndexCtrl', [
        '$scope',
        '$state',
        '$http',
        '$q',
        'ngProgress',
        function($scope, $state, $http, $q, ngProgress) {
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
                                            lt[i].uploader = data[j].username;
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
                                            lt[i].team = data[j].team;
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

                createStoryJS({
                    type:       'timeline',
                    width:      '100%',
                    height:     '400',
                    source:     dataArray[2].data,
                    embed_id:   'bangumi-timeline-embed'
                });

                ngProgress.complete();
            });
        }
    ])
    .run(function($rootScope) {

    })
;

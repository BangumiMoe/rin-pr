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
        function ($stateProvider, $urlRouterProvider) {

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
        }
    ])
    .controller('sidebarCtrl', [
        '$scope',
        '$http',
        '$mdDialog',
        'md5',
        function($scope, $http, $mdDialog, md5) {
            $scope.isExpanded = false;
            $scope.setUser = function (user) {
                if (user && user.email) {
                    //TODO: ? Failed to md5
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
        function($scope, $http, $mdDialog) {
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
            $scope.publishing = false;
            $scope.torrent = {};
            function publishError() {
                $scope.publishing = false;
                $scope.publishFailed = true;
            }
            $scope.publish = function () {
                if ($scope.publishing) {
                    return;
                }
                $scope.publishFailed = false;
                $scope.publishing = true;
                publishError();
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
                $scope.latestTorrents = dataArray[0].data.torrents;
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

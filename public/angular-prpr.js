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
    'ngAnimate'
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
                .state("home", {
                    url: "/",
                    templateUrl: 'templates/index-unified.html',
                    controller: 'unifiedIndexCtrl'
                })
        }
    ])
    .controller('unifiedIndexCtrl', [
        '$scope',
        '$state',
        '$http',
        '$q',
        'ngProgress',
        function($scope, $state, $http, $q, ngProgress) {
            ngProgress.start();
            var latestTorrents = $http.get('/api/torrents/latest', { cache: false }),
                recentBangumis = $http.get('/api/bangumi/recent', { cache: false });
            $q.all([latestTorrents, recentBangumis]).then(function(dataArray) {
                $scope.latestTorrents = dataArray[0].data;
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
                ngProgress.complete();
            });
        }
    ])

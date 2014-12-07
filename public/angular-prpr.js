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
        'ngProgress',
        function($scope, $state, $http, ngProgress) {
            ngProgress.start();
            $http
                .get('/api/torrents/latest')
                .success(function(data, status, headers, config) {
                    $scope.latestBangumis = data;

                    ngProgress.complete();
                }).
                error(function(data, status, headers, config) {
                    ngProgress.complete();
                });
        }
    ])

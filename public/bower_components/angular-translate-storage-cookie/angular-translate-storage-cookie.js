/*!
 * angular-translate - v2.5.0 - 2014-12-07
 * http://github.com/angular-translate/angular-translate
 * Copyright (c) 2014 ; Licensed MIT
 */
angular.module('pascalprecht.translate').factory('$translateCookieStorage', [
  '$cookieStore',
  function ($cookieStore) {
    var $translateCookieStorage = {
        get: function (name) {
          return $cookieStore.get(name);
        },
        set: function (name, value) {
          $cookieStore.put(name, value);
        },
        put: function (name, value) {
          $cookieStore.put(name, value);
        }
      };
    return $translateCookieStorage;
  }
]);
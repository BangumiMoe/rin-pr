
rin
.controller('AdminCtrl', [
    '$scope',
    '$rootScope',
    '$location',
    '$filter',
    '$mdDialog',
    'ngProgress',
    function ($scope, $rootScope, $location, $filter, $mdDialog, ngProgress) {
      ngProgress.complete();

      var user = $rootScope.user;
      $scope.user = user;

      if (!user || (user.group !== 'admin' && user.group !== 'staff')) {
        $location.url('/');
        return;
      }

      $rootScope.setTitle('Admin');

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

      if (!user || user.group !== 'admin') {
        return;
      }

      $scope.showAnnouncementDialog = function (ev) {
          $mdDialog.show({
              controller: 'AnnouncementNewCtrl',
              templateUrl: rin_template('announcement-new'),
              targetEvent: ev,
              clickOutsideToClose: false,
              locals: {user: $scope.user}
          }).then(function () {
          }).finally(function () {
          });
      };
    }
])
.controller('AnnouncementNewCtrl', [
  '$scope',
  '$http',
  '$filter',
  '$mdDialog',
  'user',
  'ngProgress',
  function ($scope, $http, $filter, $mdDialog, user, ngProgress) {
    var ja = JobActionsWrapper($scope, ngProgress);
    $scope.ann = {};
    $scope.publish = function () {
      if (!ja.reset()) {
        return;
      }
      if ($scope.ann.title && $scope.ann.content
        && $scope.ann.title.length < 128) {

        ja.start();
        var nann = {
          title: $scope.ann.title,
          content: $scope.ann.content
        };

        $http.post('/api/announcement/add', nann, {cache: false, responseType: 'json'})
          .success(function (data, status) {
            if (data && data.success) {
              ja.succeed();
              $mdDialog.hide();
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
    $scope.close = function () {
      $mdDialog.cancel();
    };
  }
]);

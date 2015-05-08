
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
    }
]);

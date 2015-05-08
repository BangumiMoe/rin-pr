
rin
.controller('PageHelpCtrl', [
    '$scope',
    'ngProgress',
    function ($scope, ngProgress) {
        ngProgress.complete();
    }
])
.controller('PageTellusCtrl', [
    '$scope',
    'ngProgress',
    function ($scope, ngProgress) {
        ngProgress.complete();
    }
])
.controller('PageAnnouncementCtrl', [
    '$scope',
    '$rootScope',
    '$http',
    'ngProgress',
    function ($scope, $rootScope, $http, ngProgress) {
      ngProgress.start();

      $scope.announcements = [];

      $http.get('/api/announcement/list', {cache: false, responseType: 'json'})
        .success(function (data) {
          $scope.user = $rootScope.user;
          if (data && data instanceof Array) {
            $scope.announcements = data;
          }
          ngProgress.complete();
        })
        .error(function () {
          ngProgress.complete();
        });

      $scope.remove = function (ev, ann) {
        if (ann && ann._id) {
          if (confirm('Do you really want to remove announcement \'' + ann.title + '\'?')) {
            $http.post('/api/announcement/remove', { _id: ann._id }, {cache: false, responseType: 'json'})
              .success(function (data) {
                if (data && data.success) {
                  var anns = $scope.announcements;
                  for (var i = 0; i < anns.length; i++) {
                    if (anns[i]._id == ann._id) {
                      anns.splice(i, 1);
                      break;
                    }
                  }
                }
              });
          }
        }
      };
    }
]);

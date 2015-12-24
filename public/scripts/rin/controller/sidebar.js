
rin
.controller('SidebarCtrl', [
    '$scope',
    '$rootScope',
    '$http',
    '$location',
    '$mdDialog',
    'md5',
    'ngProgress',
    '$disqus',
    function ($scope, $rootScope, $http, $location, $mdDialog, md5, ngProgress, $disqus) {
        $scope.isExpanded = false;
        $scope.setUser = function (user) {
            if (user) {
              if (user.email) {
                user.emailHash = md5.createHash(user.email);
              }
              if (user._id) {
                $http.get('/api/user/sso/disqus', {cache: false, responseType: 'json'})
                  .success(function (data) {
                    if (data) {
                      $disqus.sso(data);
                    }
                  });
              }
              if (user.receive_email !== false) {
                user.receive_email = true;
              }
            }
            $scope.user = user;
            $rootScope.user = user;
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
            $http.delete('/api/user/signout', {cache: false, responseType: 'json'})
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
                templateUrl: rin_template('user-signin'),
                targetEvent: ev,
                locals: {user: null}
            }).then(function (user) {
                $scope.setUser(user);
                $scope.expand();
            });
        };
        $scope.showTeamDialog = function (ev) {
            $mdDialog.show({
                controller: 'TeamActionsCtrl',
                templateUrl: rin_template('team-actions'),
                targetEvent: ev,
                locals: {user: $scope.user}
            }).then(function () {
            }).finally(function () {
                $('.redactor-toolbar-tooltip').remove();
            });
        };
        $scope.showPublishDialog = function (ev) {
            $mdDialog.showModal({
                controller: 'TorrentPublishNewCtrl',
                templateUrl: rin_template('torrent-publish-new'),
                targetEvent: ev,
                clickOutsideToClose: false,
                escapceToClose: false,
                locals: {user: $scope.user, torrent: null}
            }).then(function (torrent) {
                if (torrent) {
                    torrent.uploader = $scope.user;
                    $rootScope.$emit('torrentAdd', torrent);
                }
            }).finally(function () {
                $('.redactor-toolbar-tooltip').remove();
            });
        };
        $scope.showUserDialog = function (ev, action) {
            $mdDialog.show({
                controller: 'UserActionsCtrl',
                templateUrl: rin_template('user-actions'),
                targetEvent: ev,
                locals: {user: $scope.user, action: action}
            }).then(function () {
            }).finally(function () {
            });
        };
        $scope.showAdminCtrl = function (ev) {
            $location.url('/admin');
        };
        $rootScope.showUserDialog = $scope.showUserDialog;
        $http.get('/api/user/session', {cache: false, responseType: 'json'})
            .success(function (data, status) {
                if (data && data._id) {
                    $scope.setUser(data);
                }
            });
    }
]);

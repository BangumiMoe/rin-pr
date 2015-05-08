
rin
.controller('UserResetCtrl', [
    '$stateParams',
    '$scope',
    '$window',
    '$mdDialog',
    'ngProgress',
    function ($stateParams, $scope, $window, $mdDialog, ngProgress) {
        ngProgress.complete();
        var resetKey = $stateParams.reset_key;
        if (!resetKey) {
            $window.location = '/';
            return;
        }
        $mdDialog.show({
            controller: 'UserSigninCtrl',
            templateUrl: rin_template('user-signin'),
            clickOutsideToClose: false,
            locals: {user: {resetKey: resetKey}}
        }).then(function (user) {
            $window.location = '/';
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
    'user',
    function ($scope, $http, $filter, $mdDialog, md5, ngProgress, user) {
        var ja = JobActionsWrapper($scope, ngProgress);
        $scope.user = user ? user : {};
        if (user) {
            $scope.isForgot = true;
        }
        $scope.switchMode = function (type) {
            if (!ja.reset()) {
                return;
            }
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
        $scope.signin = function () {
            if (!ja.reset()) {
                return;
            }
            if ($scope.user.username && $scope.user.password) {
                ja.start();
                var u = {
                    username: $scope.user.username,
                    password: md5.createHash($scope.user.password)
                };
                $http.post('/api/user/signin', u, {cache: false, responseType: 'json'})
                    .success(function (data, status) {
                        if (data && data.success) {
                            ja.succeed();
                            $mdDialog.hide(data.user);
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
        $scope.register = function () {
            if (!ja.reset()) {
                return;
            }
            if ($scope.user.password != $scope.user.password2
                || $scope.user.password.length < 6) {
                $scope.user.password = $scope.user.password2 = '';
                ja.fail();
                return;
            }
            if ($scope.user.username && $scope.user.password && $scope.user.email) {
                ja.start();
                var u = {
                    username: $scope.user.username,
                    email: $scope.user.email,
                    password: md5.createHash($scope.user.password)
                };
                $http.post('/api/user/register', u, {cache: false, responseType: 'json'})
                    .success(function (data, status) {
                        if (data && data.success) {
                            ja.succeed();
                            $mdDialog.hide(data.user);

                            var ok = $filter('translate')('Got it!');
                            var title = $filter('translate')('Need to verify');
                            var message = $filter('translate')('Done! We\'ve sent you an email with instructions to verify your account.');
                            $mdDialog.show(
                                $mdDialog.alert()
                                    .title(title)
                                    .content(message)
                                    .ok(ok)
                                //.targetEvent(ev)
                            );
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
        $scope.reset = function (ev) {
            if (!ja.reset()) {
                return;
            }
            if (!$scope.user.resetKey && $scope.user.username && $scope.user.email) {
                ja.start();
                var u = {
                    username: $scope.user.username,
                    email: $scope.user.email
                };
                $http.post('/api/user/reset-password/request', u, {cache: false, responseType: 'json'})
                    .success(function (data, status) {
                        if (data && data.success) {
                            ja.succeed();
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
                            ja.fail();
                        }
                    })
                    .error(function (data, status) {
                        ja.fail();
                    });
            } else if ($scope.user.resetKey) {
                if ($scope.user.password != $scope.user.password2
                    || $scope.user.password.length < 6) {
                    $scope.user.password = $scope.user.password2 = '';
                    ja.fail();
                    return;
                }
                ja.start();
                var u = {
                    username: $scope.user.username,
                    password: md5.createHash($scope.user.password),
                    resetKey: $scope.user.resetKey
                };
                $http.post('/api/user/reset-password', u, {cache: false, responseType: 'json'})
                    .success(function (data, status) {
                        if (data && data.success) {
                            ja.succeed();
                            $mdDialog.hide();
                        } else {
                            ja.fail();
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
])
.controller('UserActionsCtrl', [
    '$scope',
    '$rootScope',
    '$http',
    '$mdDialog',
    '$q',
    'md5',
    'user',
    'action',
    'ngProgress',
    function ($scope, $rootScope, $http, $mdDialog, $q, md5, user, action, ngProgress) {
        var ja = JobActionsWrapper($scope, ngProgress);
        $scope.subscriptions = [];
        $scope.focus_line = [];
        $scope.storrents = [];
        $scope.gravatarSubDomain = $rootScope.lang == 'zh_cn' ? 'cn' : ($rootScope.lang == 'zh_tw' ? 'zh-tw' : 'en');

        $scope.showTorrentEdit = true;
        $scope.removeTorrent = function (ev, torrent, i) {
            $rootScope.removeTorrent(ev, torrent, function (err) {
                if (!err) {
                    if ($scope.data.selectedIndex == 2) {
                        $scope.mytorrents.splice(i, 1);
                    } else {
                        $scope.teamtorrents.splice(i, 1);
                    }
                }
            });
        };
        $scope.editTorrent = function (ev, torrent, i) {
            $rootScope.editTorrent(ev, torrent, $scope.user, function (err, torrent) {
                if (!err) {
                    if ($scope.data.selectedIndex == 1) {
                        $scope.mytorrents[i] = torrent;
                    } else {
                        $scope.teamtorrents[i] = torrent;
                    }
                }
            });
        };

        $scope.user = user;
        $scope.receive_email = user.receive_email !== false;
        $scope.data = {};
        var set_subscribe = false;
        if (action && action.type == 'subscribe'
            && action.selectedTagIds.length > 0) {
            set_subscribe = true;
            $scope.data.selectedIndex = 1;
        }

        $scope.selectedTeamIndex = -1;
        $scope.selectTeam = function (i) {
          if ($scope.selectedTeamIndex == i) {
            return;
          }
          $scope.selectedTeamIndex = i;

          $scope.team = $scope.teams[i];

          $scope.teamtorrents = null;
          $scope.teamtorrentsPageCount = 0;
          $scope.teamCurrentPage = 1;

          if (!$scope.team) {
            return;
          }

          var team_id = $scope.team._id;

          if (team_id) {

            ngProgress.start();

            $http.get('/api/torrent/team?team_id=' + team_id, {responseType: 'json'})
              .success(function (data) {

                if (!data) {
                  return;
                }

                var teamtorrents = data.torrents;

                $scope.teamtorrents = teamtorrents;
                $scope.teamtorrentsPageCount = data.page_count;

                var user_ids = [];
                if (teamtorrents) {
                  teamtorrents.forEach(function (t) {
                    if (user_ids.indexOf(t.uploader_id) < 0) {
                      user_ids.push(t.uploader_id);
                    }
                  });
                }
                if (user_ids.length > 0) {
                  $rootScope.fetchUsers(user_ids, true, function (err, _users) {
                    if (_users) {
                      for (var i = 0; i < teamtorrents.length; i++) {
                        teamtorrents[i].uploader = _users[teamtorrents[i].uploader_id];
                      }
                    }
                    ngProgress.complete();
                  });
                } else {
                  ngProgress.complete();
                }
              });
          }
        };

        ngProgress.start();
        var queries = [];
        queries.push($http.get('/api/user/subscribe/collections', {responseType: 'json'}));
        queries.push($http.get('/api/torrent/my', {responseType: 'json'}));
        queries.push($http.get('/api/team/myteam', {responseType: 'json'}));

        $q.all(queries).then(function (dataArray) {
            var cols = dataArray[0].data;
            if ((cols && cols.length) || set_subscribe) {
                var tag_ids = [];
                if (!cols) {
                    cols = [];
                }
                for (var i = 0; i < cols.length; i++) {
                    for (var j = 0; j < cols[i].length; j++) {
                        tag_ids.push(cols[i][j]);
                    }
                }
                if (set_subscribe) {
                    for (var i = 0; i < action.selectedTagIds.length; i++) {
                        tag_ids.push(action.selectedTagIds[i]);
                    }
                }
                if (tag_ids.length > 0) {
                    $rootScope.fetchTags(tag_ids, true, function (err, _tags) {
                        if (_tags) {
                            var _cols = [];
                            for (var i = 0; i < cols.length; i++) {
                                var l = [];
                                for (var j = 0; j < cols[i].length; j++) {
                                    if (_tags[cols[i][j]]) {
                                        l.push(_tags[cols[i][j]]);
                                    }
                                }
                                if (l.length > 0) {
                                    _cols.push(l);
                                }
                            }
                            if (set_subscribe) {
                                var l = [];
                                for (var i = 0; i < action.selectedTagIds.length; i++) {
                                    if (_tags[action.selectedTagIds[i]]) {
                                        l.push(_tags[action.selectedTagIds[i]]);
                                    }
                                }
                                if (l.length > 0) {
                                    _cols.push(l);
                                }
                            }
                            if (_cols.length > 0) {
                                $scope.subscriptions = _cols;
                                $scope.focus_line = new Array(_cols.length);
                            }
                        }
                    });
                }
            }
            var mytorrents = dataArray[1].data.torrents;
            if (mytorrents) {
                $rootScope.fetchTorrentUserAndTeam(mytorrents, function () {});
            }
            $scope.mytorrents = mytorrents;
            $scope.mytorrentsPageCount = dataArray[1].data.page_count;

            $scope.teams = dataArray[2].data;
            if ($scope.teams && $scope.teams.length == 1) {
              $scope.selectTeam(0);
            } else {
              ngProgress.complete();
            }
        });

        $scope.myCurrentPage = 1;
        $scope.$watch("data.selectedIndex", function (i) {
          if (i == 2) {
            //my
            $scope.currentPage = $scope.myCurrentPage;
            $scope.totalPages = $scope.mytorrentsPageCount;
          } else if (i == 3) {
            //team
            $scope.currentPage = $scope.teamCurrentPage;
            $scope.totalPages = $scope.teamtorrentsPageCount;
          } else {
            $scope.currentPage = 0;
            $scope.totalPages = 0;
          }
        });

        var loadMore = function () {
          var to = '';
          var selectedIndex = $scope.data.selectedIndex;
          var apiUrl = '/api/torrent/';
          if (selectedIndex == 2) {
            to = 'my?';
          } else if (selectedIndex == 3) {
            to = 'team?team_id=' + $scope.team._id + '&';
          } else {
            return;
          }
          if ($scope.currentPage >= $scope.totalPages) {
            return;
          }
          ngProgress.start();
          $http.get(apiUrl + to + 'p=' + ($scope.currentPage + 1), {cache: false, responseType: 'json'})
            .success(function (data) {
              if (data && data.torrents) {
                var nt = data.torrents;

                if (selectedIndex == 2) {
                  //my torrents, fetch user & team
                  $rootScope.fetchTorrentUserAndTeam(nt, function () {
                    ngProgress.complete();
                  });
                  Array.prototype.push.apply($scope.mytorrents, nt);
                  $scope.myCurrentPage += 1;
                } else if (selectedIndex == 3) {
                  //team torrents, fetch user only
                  var user_ids = [];
                  if (nt) {
                    nt.forEach(function (t) {
                      if (user_ids.indexOf(t.uploader_id) < 0) {
                        user_ids.push(t.uploader_id);
                      }
                    });
                  }
                  if (user_ids.length > 0) {
                    $rootScope.fetchUsers(user_ids, true, function (err, _users) {
                      for (var i = 0; i < nt.length; i++) {
                        nt[i].uploader = _users[nt[i].uploader_id];
                      }
                      ngProgress.complete();
                    });
                  }
                  Array.prototype.push.apply($scope.teamtorrents, nt);
                  $scope.teamCurrentPage += 1;
                }
                $scope.currentPage += 1;

              } else {
                ngProgress.complete();
              }
            })
            .error(function () {
              ngProgress.complete();
            });
        };
        $scope.loadMore = loadMore;

        $scope.showTorrentDetailsDialog = function (ev, torrent) {
        };
        $scope.addLine = function () {
            $scope.subscriptions.push([]);
            for (var i = 0; i < $scope.focus_line.length; i++) {
                $scope.focus_line[i] = false;
            }
            $scope.ifocus = $scope.focus_line.length;
            $scope.focus_line.push(true);
        };
        $scope.ifocus = 0;
        $scope.removeLine = function (i) {
            $scope.subscriptions.splice(i, 1);
            if ($scope.ifocus == i) {
                $scope.ifocus = -1;
            }
            $scope.focus_line.splice(i, 1);
        };
        $scope.editLine = function (i) {
            $scope.ifocus = i;
            $scope.focus_line[i] = true;
            for (var j = 0; j < $scope.focus_line.length; j++) {
                $scope.focus_line[j] = (j == i);
            }
        };
        $scope.removeTag = function (i, tag) {
            var f = $scope.subscriptions[i];
            var j = f.indexOf(tag);
            if (j >= 0) {
                f.splice(j, 1);
            }
            if (i == $scope.ifocus) {
                $scope.previewTorrents();
            }
        };
        $scope.addKeywordsTag = function (i) {
            if ($scope.ifocus < 0 || !$scope.keywordsTags) {
                return;
            }
            var f = $scope.subscriptions[$scope.ifocus];
            if (f.indexOf($scope.keywordsTags[i]) >= 0) {
                return;
            }
            f.push($scope.keywordsTags[i]);
            $scope.previewTorrents();
        };
        $scope.previewTorrents = function () {
            $scope.storrents.splice(0, 5);
            if ($scope.ifocus < 0) {
                return;
            }
            var f = $scope.subscriptions[$scope.ifocus];
            var tag_ids = [];
            for (var i = 0; i < f.length; i++) {
                tag_ids.push(f[i]._id);
            }
            if (tag_ids.length < 0) {
                return;
            }
            ja.start();
            $http.post('/api/torrent/search', {tag_id: tag_ids}, {responseType: 'json'})
                .success(function (data) {
                    if (data && data.length) {
                        if (data.length > 5) {
                            data = data.slice(0, 5)
                        }
                        $rootScope.fetchTorrentUserAndTeam(data, function () {
                            ja.succeed();
                        });
                        Array.prototype.push.apply($scope.storrents, data);
                    } else {
                        ja.succeed();
                    }
                })
                .error(function () {
                    ja.succeed();
                });
        };
        $scope.save = function () {
            if (!ja.reset()) {
                return;
            }
            if ($scope.data.selectedIndex == 1) {
                //Subscription
                var subs_tag_ids = [];
                for (var i = 0; i < $scope.subscriptions.length; i++) {
                    var f = $scope.subscriptions[i];
                    var curtag_ids = [];
                    for (var j = 0; j < f.length; j++) {
                        curtag_ids.push(f[j]._id);
                    }
                    if (curtag_ids.length > 0) {
                        subs_tag_ids.push(curtag_ids);
                    }
                }

                ja.start();
                $http.post('/api/user/subscribe/update', {collections: subs_tag_ids}, {responseType: 'json'})
                    .success(function (data) {
                        if (data && data.success) {
                            ja.succeed();
                        } else {
                            ja.fail();
                        }
                    })
                    .error(function () {
                        ja.fail();
                    });
                return;
            }

            var u = {};
            var need_update = false;
            if ($scope.user.new_password) {
              if (!$scope.user.password || $scope.user.new_password.length < 6) {
                ja.fail();
                return;
              }
              if ($scope.user.new_password != $scope.user.new_password2) {
                $scope.user.new_password = $scope.user.new_password2 = '';
                ja.fail();
                return;
              }
              u.password = md5.createHash($scope.user.password);
              u.new_password = md5.createHash($scope.user.new_password);
              need_update = true;
            }
            if (user.receive_email != $scope.receive_email) {
              u.receive_email = user.receive_email;
              $scope.receive_email = user.receive_email;
              need_update = true;
            }
            if (!need_update) {
              return;
            }
            $http.post('/api/user/update', u, {responseType: 'json'})
                .success(function (data) {
                    if (data && data.success) {
                        ja.succeed();
                        $scope.user.password = '';
                        $scope.user.new_password = $scope.user.new_password2 = '';
                        $mdDialog.hide();
                    } else {
                        ja.fail();
                    }
                })
                .error(function () {
                    ja.fail();
                });
        };
        $scope.close = function () {
            $mdDialog.cancel();
        };

        $scope.canceler = null;
        $scope.$watch('data.tagname', function (newValue, oldValue) {
            if ($scope.canceler) {
                $scope.canceler.resolve();
            }
            var tagname = newValue;
            if (tagname && tagname.length >= 2) {
                $scope.canceler = $q.defer();
                $http.post('/api/tag/search',
                    {name: tagname, keywords: true, multi: true},
                    {responseType: 'json', timeout: $scope.canceler.promise})
                    .success(function (data) {
                        if (data && data.found) {
                            $scope.keywordsTags = data.tag;
                        } else {
                            $scope.keywordsTags = null;
                        }
                        $scope.canceler = null;
                    })
                    .error(function () {
                        $scope.canceler = null;
                    });
            } else {
                $scope.keywordsTags = null;
            }
        });
    }
]);

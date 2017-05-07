
rin
.controller('TeamActionsCtrl', [
    '$scope',
    '$rootScope',
    '$http',
    '$q',
    '$mdDialog',
    'user',
    'ngProgress',
    function ($scope, $rootScope, $http, $q, $mdDialog, user, ngProgress) {
        var ja = JobActionsWrapper($scope, ngProgress);
        $scope.user = user;
        $scope.data = {};

        $scope.syncSites = ['dmhy', /*'ktxp', 'popgo', 'camoe',*/ 'acgrip', 'nyaa', 'acgnx'];
        var clearSync = function () {
          $scope.sync = {};
          for (var i = 0; i < $scope.syncSites.length; i++) {
            $scope.sync[$scope.syncSites[i]] = {};
          }
        };
        clearSync();

        $scope.newteam = {};
        $scope.jointeam = {};

        $scope.selectedTeamIndex = -1;
        $scope.selectTeam = function (i) {
          if ($scope.selectedTeamIndex == i) {
            return;
          }
          $scope.selectedTeamIndex = i;

          if ($scope.teams && $scope.teams[i]) {

            ngProgress.start();

            $scope.teamPendingMembers = null;
            $scope.teamMembers = null;
            clearSync();

            var team = $scope.teams[i];
            $scope.team = team;

            var teamquery = '?team_id=' + team._id;
            var queries = [];
            queries.push($http.get('/api/team/members' + teamquery, {responseType: 'json'}));
            queries.push($http.get('/api/team/sync/get' + teamquery, {cache: false, responseType: 'json'}));
            if (team.admin_ids && team.admin_ids.indexOf(user._id) !== -1) {
              //is admin
              queries.push($http.get('/api/team/members/pending' + teamquery, {responseType: 'json'}));
            }
            $q.all(queries).then(function (dataArray) {
              $scope.teamMembers = dataArray[0].data;
              if (dataArray[1].data) {
                var data = dataArray[1].data;
                for (var i = 0; i < $scope.syncSites.length; i++) {
                  var site = $scope.syncSites[i];
                  if (data[site]) {
                    $scope.sync[site] = data[site];
                  }
                }
              }
              if (queries.length > 2) {
                $scope.teamPendingMembers = dataArray[2].data;
              }

              ngProgress.complete();
            });
          }
        };

        $scope.isTeamAdmin = function (user_id) {
          if ($scope.team && $scope.team.admin_ids) {
            if ($scope.team.admin_ids.indexOf(user_id) !== -1) {
              return true;
            }
          }
          return false;
        };

        $scope.isTeamEditor = function (user_id) {
          if ($scope.team && $scope.team.editor_ids) {
            if ($scope.team.editor_ids.indexOf(user_id) !== -1) {
              return true;
            }
          }
          return false;
        };

        $http.get('/api/team/myteam', {responseType: 'json'})
            .success(function (data) {
              if (data && data.length > 0) {
                $scope.teams = data;
                $scope.data.selectedIndex = 0;

                var tag_ids = [];
                for (var i = 0; i < data.length; i++) {
                  if (data[i].tag_id) {
                    tag_ids.push(data[i].tag_id);
                  }
                }
                $rootScope.fetchTags(tag_ids, true, function (err, _tags) {
                  if (_tags) {
                    data.forEach(function (t, i) {
                      if (t.tag_id) {
                        data[i].tag = _tags[t.tag_id];
                      }
                    });
                  }
                });

                if (data.length === 1) {
                  $scope.selectTeam(0);
                }
              }
            });

        var getMyJoining = function () {
          $http.get('/api/team/myjoining', {responseType: 'json'})
            .success(function (data) {
              if (data && data.length > 0) {
                data = data[0];
                $scope.teamJoining = data;
                $scope.jointeam.name = data.name;
              }
            });
        };

        getMyJoining();

        $http.get('/api/team/pending', {cache: false, responseType: 'json'})
            .success(function (data) {
                $scope.teamPending = data;
            });

        if (user.group == 'admin') {
            $http.get('/api/team/all/pending', {cache: false, responseType: 'json'})
                .success(function (data) {
                    var tr = data;
                    $scope.teamRequests = tr;
                    var user_ids = [];
                    data.forEach(function (t) {
                      if (t.admin_id && user_ids.indexOf(t.admin_id) < 0) {
                        user_ids.push(t.admin_id);
                      }
                      /*if (t.admin_ids) {
                        user_ids = user_ids.concat(t.admin_ids);
                      }*/
                    });
                    if (user_ids.length > 0) {
                      $rootScope.fetchUsers(user_ids, true, function (err, _users) {
                        if (_users) {
                          for (var i = 0; i < tr.length; i++) {
                            tr[i].admin = _users[tr[i].admin_id];
                          }
                        }
                      });
                    }
                });
        }

        $scope.join = function () {
            if ($scope.canceler || !ja.reset()) {
                return;
            }
            var jt = $scope.jointeam;
            if (jt && jt.name) {
                ja.start();
                $http.post('/api/team/join', jt, {cache: false, responseType: 'json'})
                    .success(function (data) {
                        $scope.keywordsTags = null;
                        if (data && data.success) {
                          getMyJoining();
                          ja.succeed();
                        } else {
                          ja.fail();
                        }
                    })
                    .error(function () {
                        ja.fail();
                    });
            }
        };
        $scope.remove = function (ev, team_id, user_id, type) {
            if (!ja.reset()) {
                return;
            }
            var j = {team_id: team_id, user_id: user_id};
            if (type) j.type = type;
            $http.post('/api/team/remove', j, {cache: false, responseType: 'json'})
                .success(function (data) {
                    if (data && data.success) {
                      if (type == 'member') {
                        var tm = $scope.teamMembers;
                        for (var i = 0; i < tm.length; i++) {
                            if (tm[i]._id == user_id) {
                                tm.splice(i, 1);
                                break;
                            }
                        }
                      } else if (type == 'editor' || type == 'admin') {
                        var a_ids = type == 'editor' ? $scope.team.editor_ids : $scope.team.admin_ids;
                        for (var i = 0; i < a_ids.length; i++) {
                          if (a_ids[i] == user_id) {
                            a_ids.splice(i, 1);
                            break;
                          }
                        }
                      }
                    }
                });
        };
        $scope.approve = function (ev, team_id, user_id, type) {
            if (!ja.reset()) {
                return;
            }
            var j = {team_id: team_id, user_id: user_id};
            if (type) j.type = type;
            $http.post('/api/team/approve', j, {cache: false, responseType: 'json'})
                .success(function (data) {
                    if (data && data.success) {
                        if (type == 'admin') {
                          $scope.team.admin_ids.push(user_id);
                        } else if (type == 'editor') {
                          if (!$scope.team.editor_ids) {
                            $scope.team.editor_ids = [user_id];
                          } else {
                            $scope.team.editor_ids.push(user_id);
                          }
                        } else {
                          var isMember = type == 'member';
                          var tr = isMember ? $scope.teamPendingMembers : $scope.teamRequests;
                          for (var i = 0; i < tr.length; i++) {
                            if (isMember && tr[i]._id == user_id) {
                              $scope.teamMembers.push(tr[i]);
                              tr.splice(i, 1);
                              break;
                            }
                            if (!isMember && tr[i]._id == team_id) {
                              tr.splice(i, 1);
                              break;
                            }
                          }
                        }
                    }
                });
        };
        $scope.reject = function (ev, team_id, user_id, type) {
            if (!ja.reset()) {
                return;
            }
            var j = {team_id: team_id, user_id: user_id};
            if (type) j.type = type;
            $http.post('/api/team/reject', j, {cache: false, responseType: 'json'})
                .success(function (data) {
                    if (data && data.success) {
                        var isMember = type == 'member';
                        var tr = isMember ? $scope.teamPendingMembers : $scope.teamRequests;
                        for (var i = 0; i < tr.length; i++) {
                            if ((isMember && tr[i]._id == user_id)
                                || (!isMember && tr[i]._id == team_id)) {
                                tr.splice(i, 1);
                                break;
                            }
                        }
                    }
                });
        };
        $scope.approveMember = function (ev, team_id, user_id) {
            return $scope.approve(ev, team_id, user_id, 'member');
        };
        $scope.approveEditor = function (ev, team_id, user_id) {
          return $scope.approve(ev, team_id, user_id, 'editor');
        };
        $scope.approveAdmin = function (ev, team_id, user_id) {
          return $scope.approve(ev, team_id, user_id, 'admin');
        };
        $scope.rejectMember = function (ev, team_id, user_id) {
            return $scope.reject(ev, team_id, user_id, 'member');
        };
        $scope.removeEditor = function (ev, team_id, user_id) {
          return $scope.remove(ev, team_id, user_id, 'editor');
        };
        $scope.removeAdmin = function (ev, team_id, user_id) {
          return $scope.remove(ev, team_id, user_id, 'admin');
        };
        $scope.save = function () {
            if (!$scope.team) {
                return;
            }
            if (!ja.reset()) {
                return;
            }

            if ($scope.data.selectedIndex == 3) {
                //Team Sync
                if ($scope.sync) {
                    ja.start();
                    $http.post('/api/team/sync/update',
                      { sync: $scope.sync, team_id: $scope.team._id },
                      { cache: false, responseType: 'json' }
                    )
                        .success(function (data) {
                            if (data && data.success) {
                                ja.succeed();
                            } else {
                                ja.fail();
                            }
                        })
                        .error(function (data) {
                            ja.fail();
                        });
                }
                return;
            }
            var t = $scope.team;
            if (t) {
                //&& (t.new_icon || t.signature) maybe t.signature -> ''
                ja.start();
                var nt = {
                    _id: t._id,
                    icon: t.new_icon
                };
                if (t.signature) {
                    nt.signature = t.signature;
                } else {
                    nt.signature = '';
                }
                $http.post('/api/team/update', nt, {cache: false, responseType: 'json'})
                    .success(function (data) {
                        if (data && data.success) {
                            ja.succeed();
                            //no need refresh
                        } else {
                            ja.fail();
                        }
                    })
                    .error(function (data) {
                        ja.fail();
                    });
            }
        };
        $scope.submit = function () {
            if (!ja.reset()) {
                return;
            }
            var nt = $scope.newteam;
            if (nt && nt.name && nt.certification) {
                ja.start();
                $http.post('/api/team/register', nt, {cache: false, responseType: 'json'})
                    .success(function (data) {
                        if (data && data.success) {
                            ja.succeed();
                            $scope.teamPending = data.team;
                        } else {
                            ja.fail();
                        }
                    })
                    .error(function (data) {
                        ja.fail();
                    });
            }
        };
        $scope.close = function () {
            $mdDialog.cancel();
        };

        $scope.selectTag = function (tag) {
            $scope.jointeam.name = tag.name;
        };

        $scope.canceler = null;
        $scope.$watch('jointeam.name', function (newValue, oldValue) {
            if ($scope.canceler) {
                $scope.canceler.resolve();
            }
            if ($scope.teamJoining && $scope.teamJoining._id) {
                $scope.canceler = null;
                $scope.keywordsTags = null;
                return;
            }
            var tagname = newValue;
            if (tagname && tagname.length >= 2) {
                $scope.canceler = $q.defer();
                $http.post('/api/tag/search',
                    {name: tagname, type: 'team', keywords: true, multi: true},
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


rin
.controller('TorrentShowCtrl', [
    '$state',
    '$stateParams',
    '$scope',
    '$rootScope',
    '$location',
    '$http',
    '$mdDialog',
    'ngProgress',
    function ($state, $stateParams, $scope, $rootScope, $location, $http, $mdDialog, ngProgress) {
        var torrent_id = $stateParams.torrent_id;
        if (!torrent_id) {
            $location.path('/');
            return;
        }
        $http.post('/api/torrent/fetch', {_id: torrent_id}, {responseType: 'json'})
            .success(function (data, status) {
                if (data) {
                    var torrent = data;
                    $rootScope.fetchTorrentUserAndTeam([torrent], function () {
                        ngProgress.complete();
                    });
                    $rootScope.showTorrentDetailsDialog(null, torrent, function () {
                        if ($state.current && $state.current.name == 'torrent') {
                            $location.path('/');
                        }
                    });
                } else {
                    ngProgress.complete();
                }
            })
            .error(function (data, status) {
                ngProgress.complete();
            });
    }
])
.controller('TorrentPublishCtrl', [
    '$scope',
    '$rootScope',
    '$state',
    '$filter',
    '$http',
    '$timeout',
    '$mdDialog',
    '$mdToast',
    '$q',
    'user',
    'torrent',
    'ngProgress',
    function ($scope, $rootScope, $state, $filter, $http, $timeout, $mdDialog, $mdToast, $q, user, torrent, ngProgress) {
        var ja = JobActionsWrapper($scope, ngProgress);
        $scope.user = user;
        $scope.tags = [];
        $scope.categoryTags = [];
        $http.get('/api/tag/misc', {responseType: 'json'})
            .success(function (data) {
                if (data && data.length) {
                    $scope.categoryTags = data;
                    $scope.categoryTag = data[0];
                    for (var i = 0; i < data.length; i++) {
                        if (torrent && torrent.category_tag_id) {
                            if (data[i]._id == torrent.category_tag_id) {
                                $scope.categoryTag = data[i];
                                break;
                            }
                        } else if (data[i].name.toLowerCase() == 'donga') {
                            $scope.categoryTag = data[i];
                            break;
                        }
                    }
                }
            });

        if (torrent) {
          $scope.torrent = torrent;
          if (torrent.tag_ids && torrent.tag_ids.length > 0) {
            $rootScope.fetchTags(torrent.tag_ids, function (err, tags) {
              if (tags) {
                $scope.tags = tags;
              }
            });
          }
          if (torrent.content && torrent.file_id) {
            var torrent_content = torrent.content;
            $timeout(function () {
              var treedata = buildTreeview(torrent_content);
              var tree = new dhtmlXTreeObject("files_tree","100%","100%",0);
              tree.setImagePath('/images/dhxtree_skyblue/');
              tree.loadJSONObject(treedata);
            }, 600);
          }
        } else {
          $scope.torrent = {};
        }

        $http.get('/api/team/myteam', {responseType: 'json'})
            .success(function (data) {
              if (data && data.length > 0) {
                $scope.teams = data;

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

              }

              if ($scope.teams) {
                if (torrent) {
                    if (torrent.team_id) {
                      $scope.selectTeamByTeamId(torrent.team_id);
                    }
                } else {
                    $scope.selectTeam(0);
                }
              }
            });

        $scope.selectTeamByTeamId = function (team_id) {
          for (var i = 0; i < $scope.teams.length; i++) {
            if ($scope.teams[i]._id == team_id) {
              $scope.selectTeam(i);
              return i;
            }
          }
          return -1;
        };
        $scope.selectedTeamIndex = -1;
        $scope.selectTeam = function (i) {
          if ($scope.selectedTeamIndex == i) {
            return;
          }
          $scope.selectedTeamIndex = i;
          if (i >= 0) {
            $scope.team = $scope.teams[i];
            $scope.torrent.inteam = true;
            $scope.torrent.team_id = $scope.team._id;
          } else {
            $scope.team = null;
            $scope.torrent.inteam = false;
            $scope.torrent.team_id = '';
          }
        };

        $scope.delete = function (ev) {
            if (!ja.reset()) {
                return;
            }

            if ($rootScope.removeTorrent(ev, $scope.torrent, function (err) {
                if (!err) {
                    ja.succeed();
                    $mdDialog.hide();
                } else {
                    ja.fail();
                }
            })) {
              ja.start();
            }
        };

        $scope.publish = function () {
            if (!ja.reset()) {
                return;
            }
            if ($scope.categoryTag && $scope.torrent.title && $scope.torrent.introduction
                && $scope.torrent.title.length < 128) {
                if (!$scope.torrent._id && !($scope.torrent_file || $scope.torrent.file_id)) {
                    return;
                }

                ja.start();
                var nt = {
                    category_tag_id: $scope.categoryTag._id,
                    title: $scope.torrent.title,
                    introduction: $scope.torrent.introduction,
                    tag_ids: [],
                    btskey: $scope.torrent.btskey
                    //, inteam: $scope.torrent.inteam ? '1' : ''
                };
                if ($scope.torrent.team_id) {
                  nt.team_id = $scope.torrent.team_id;
                }
                for (var j = 0; j < $scope.tags.length; j++) {
                    nt.tag_ids.push($scope.tags[j]._id);
                }
                var apiUrl;
                if ($scope.torrent._id) {
                    apiUrl = '/api/torrent/update';
                    nt._id = $scope.torrent._id;
                } else {
                    apiUrl = '/api/torrent/add';
                    if ($scope.torrent.teamsync) {
                        nt.teamsync = '1';
                    }
                    // set file
                    if ($scope.torrent.file_id) {
                      nt.file_id = $scope.torrent.file_id;
                    } else {
                      nt.file = $scope.torrent_file;
                    }
                }
                $http.post(apiUrl, nt, {cache: false, responseType: 'json'})
                    .success(function (data, status) {
                        if (data && data.success) {
                            ja.succeed();
                            $mdDialog.hide(data.torrent);
                        } else {
                            var msg;
                            if (data && data.message) {
                                msg = $filter('translate')(data.message);
                            }
                            ja.fail(msg);
                        }
                    })
                    .error(function (data, status) {
                        ja.fail((data && data.message) ? data.message : null);
                    });
            } else {
              ja.fail('title too long or no introduction');
            }
        };
        $scope.removeTag = function (i) {
            $scope.tags.splice(i, 1);
        };
        $scope.addTag = function (i) {
            if ($scope.newtag) {
                $scope.working = true;
                $http.post('/api/tag/search', {name: $scope.newtag}, {cache: false, responseType: 'json'})
                    .success(function (data) {
                        $scope.working = false;
                        if (data && data.found && data.tag) {
                            var found = false;
                            for (var j = 0; j < $scope.tags.length; j++) {
                                if ($scope.tags[j]._id == data.tag._id) {
                                    found = true;
                                    break;
                                }
                            }
                            if (!found) {
                                $scope.tags.push(data.tag);
                            }
                            $scope.newtag = '';
                        }
                    })
                    .error(function () {
                        $scope.working = false;
                    });
            }
        };
        $scope.contentSuggest = function () {
            if ($scope.torrent.title) {
                $scope.working = true;
                $http.post('/api/torrent/suggest', {
                    title: $scope.torrent.title,
                    team_id: $scope.torrent.team_id
                }, {cache: false, responseType: 'json'})
                    .success(function (data) {
                        $scope.working = false;
                        if (data && data._id) {
                            if (data.teamsync) {
                                $scope.torrent.teamsync = true;
                            }
                            if (data.team_id) {
                                $scope.torrent.inteam = true;
                            }
                            $scope.torrent.introduction = data.introduction;
                            var ts = data.tag_ids;
                            if (ts && ts.length > 0) {
                                var newTagIds = [];
                                for (var i = 0; i < ts.length; i++) {
                                    var found = false;
                                    for (var j = 0; j < $scope.tags.length; j++) {
                                        if ($scope.tags[j]._id == ts[i]) {
                                            found = true;
                                            break;
                                        }
                                    }
                                    if (!found) {
                                        newTagIds.push(ts[i]);
                                    }
                                }
                                if (newTagIds.length > 0) {
                                    $rootScope.fetchTags(newTagIds, function (err, tags) {
                                        if (tags && tags.length > 0) {
                                            var stags = [];
                                            for (var i = 0; i < tags.length; i++) {
                                                if (tags[i].type == 'misc') {
                                                    continue;
                                                } else if (tags[i].type == 'resolution' || tags[i].type == 'lang') {
                                                    //only have one
                                                    var found = false;
                                                    for (var j = 0; j < $scope.tags.length; j++) {
                                                        if ($scope.tags[j].type == tags[i].type) {
                                                            found = true;
                                                            break;
                                                        }
                                                    }
                                                    if (!found) {
                                                        stags.push(tags[i]);
                                                    }
                                                } else {
                                                    stags.push(tags[i]);
                                                }
                                            }
                                            if (stags.length > 0) {
                                                $scope.tags = $scope.tags.concat(stags);
                                            }
                                        }
                                    });
                                }
                            }
                        }
                    })
                    .error(function () {
                        $scope.working = false;
                    });
            }
        };
        $scope.getSuggest = function () {
            if ($scope.torrent.title) {
                $scope.working = true;
                $http.post('/api/tag/suggest', {query: $scope.torrent.title}, {
                    cache: false,
                    responseType: 'json'
                })
                    .success(function (data) {
                        $scope.working = false;
                        if (data && data.length > 0) {
                            for (var i = 0; i < data.length; i++) {
                                var ftags = null;
                                var found = false;
                                var j;
                                if (data[i].type == 'misc') {
                                    ftags = $scope.categoryTags;
                                } else {
                                    ftags = $scope.tags;
                                }
                                for (j = 0; j < ftags.length; j++) {
                                    if (ftags[j]._id == data[i]._id) {
                                        found = true;
                                        break;
                                    }
                                }
                                if (data[i].type == 'misc') {
                                    if (found) {
                                        $scope.categoryTag = ftags[j];
                                    }
                                } else {
                                    if (!found) {
                                        $scope.tags.push(data[i]);
                                    }
                                }
                            }
                        }
                    })
                    .error(function () {
                        $scope.working = false;
                    });
            }
        };
        $scope.close = function () {
            $mdDialog.cancel();
        };
        //TODO: use onblur to instead
        var lastTimeout = null;
        $scope.$watch("torrent.title", function (newValue, oldValue) {
            if (lastTimeout) $timeout.cancel(lastTimeout);
            lastTimeout = $timeout($scope.getSuggest, 2000);
        });

        $scope.addKeywordsTag = function (i) {
            if ($scope.keywordsTags && $scope.keywordsTags[i]) {
                var tag = $scope.keywordsTags[i];
                var found = false;
                for (var j = 0; j < $scope.tags.length; j++) {
                    if ($scope.tags[j]._id == tag._id) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    $scope.tags.push(tag);
                }
            }
        };

        $scope.canceler = null;
        $scope.$watch('newtag', function (newValue, oldValue) {
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
])
.controller('TorrentPublishNewCtrl', [
    '$scope',
    '$rootScope',
    '$state',
    '$filter',
    '$http',
    '$timeout',
    '$mdDialog',
    '$mdToast',
    '$q',
    'user',
    'torrent',
    'ngProgress',
    'Upload',
    function ($scope, $rootScope, $state, $filter, $http, $timeout, $mdDialog, $mdToast, $q, user, torrent, ngProgress, Upload) {
        var ja = JobActionsWrapper($scope, ngProgress);
        $scope.showinfo = false;
        $scope.user = user;
        $scope.tags = [];
        $scope.categoryTags = [];
        $scope.uploadprocess = 0;
        $scope.uploading = 0;
        $http.get('/api/tag/misc', {responseType: 'json'})
            .success(function (data) {
                if (data && data.length) {
                    $scope.categoryTags = data;
                    $scope.categoryTag = data[0];
                    for (var i = 0; i < data.length; i++) {
                        if (torrent) {
                            if (data[i]._id == torrent.category_tag_id) {
                                $scope.categoryTag = data[i];
                                break;
                            }
                        } else if (data[i].name.toLowerCase() == 'donga') {
                            $scope.categoryTag = data[i];
                            break;
                        }
                    }
                }
            });

        if (torrent) {
          $scope.torrent = torrent;
          if (torrent.tag_ids && torrent.tag_ids.length > 0) {
            $rootScope.fetchTags(torrent.tag_ids, function (err, tags) {
              if (tags) {
                $scope.tags = tags;
              }
            });
          }
        } else {
          $scope.torrent = {};
        }

        $http.get('/api/team/myteam', {responseType: 'json'})
            .success(function (data) {
              if (data && data.length > 0) {
                $scope.teams = data;

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

              }

              if ($scope.teams) {
                if (torrent) {
                    if (torrent.team_id) {
                      $scope.selectTeamByTeamId(torrent.team_id);
                    }
                } else {
                    $scope.selectTeam(0);
                }
              }
            });

        $scope.backoldversion = function (ev) {
          // force back to old version
          $scope.torrent.file_id = null;
          $scope.torrent.content = null;
          $rootScope.newTorrent(ev, $scope.torrent, $scope.user, function () {
          });
        };

        $scope.reupload = function () {
          $scope.uploading = 0;
          $scope.showinfo = false;
        };

        // called when files are selected, dropped, or cleared
        $scope.upload = function ($file) {
          if (!$file) {
            return;
          }
          if (!ja.reset()) {
              return;
          }
          $scope.uploadprocess = 0;
          $scope.uploadfilename = $file.name;
          $scope.uploading = 1;

          var upload = Upload.upload({
            url: '/api/v2/torrent/upload',
            data: {
              file: $file,
              team_id: $scope.torrent.team_id
            }
          });

          upload.then(function(resp) {
            // successfully upload
            var msg;
            if (resp && resp.data) {
              if (resp.data.success) {
                $scope.showinfo = true;
                var torrent_content = resp.data.content;
                if ($scope.tree) {
                  $scope.tree.destructor();
                }
                $timeout(function () {
                  var treedata = buildTreeview(torrent_content);
                  var tree = new dhtmlXTreeObject("files_tree","100%","100%",0);
                  tree.setImagePath('/images/dhxtree_skyblue/');
                  tree.loadJSONObject(treedata);
                  $scope.tree = tree;
                }, 200);
                $scope.torrent.file_id = resp.data.file_id;
                $scope.torrent.content = torrent_content;
                $scope.recommend_torrents = resp.data.torrents;
                if ($scope.recommend_torrents && $scope.recommend_torrents.length) {
                  $scope.switchTorrent(null, $scope.recommend_torrents[0]);
                }
                return;
              } else if (resp.data.message) {
                msg = $filter('translate')(resp.data.message);
              }
            }
            ja.fail(msg);
            $scope.uploading = 0;
          }, function(resp) {
            // handle error
            if (resp && resp.data && resp.data.message) {
              ja.fail(resp.data.message);
            } else {
              ja.fail();
            }
            $scope.uploading = 0;
          }, function(evt) {
            // progress notify, only support integer value in this version of angular-md
            $scope.uploadprocess = parseInt(100.0 * evt.loaded / evt.total);
            if (evt.loaded >= evt.total) {
              $scope.uploading = 2;
            }
          });
        };

        $scope.switchTorrent = function (ev, torrent) {
          if (torrent) {
            $scope.selected_torrent = torrent;
            $scope.torrent.teamsync = torrent.teamsync;
          } else {
            $scope.selected_torrent = null;
          }
        };

        $scope.selectTeamByTeamId = function (team_id) {
          for (var i = 0; i < $scope.teams.length; i++) {
            if ($scope.teams[i]._id == team_id) {
              $scope.selectTeam(i);
              return i;
            }
          }
          return -1;
        };
        $scope.selectedTeamIndex = -1;
        $scope.selectTeam = function (i) {
          if ($scope.selectedTeamIndex == i) {
            return;
          }
          $scope.selectedTeamIndex = i;
          if (i >= 0) {
            $scope.team = $scope.teams[i];
            $scope.torrent.inteam = true;
            $scope.torrent.team_id = $scope.team._id;
          } else {
            $scope.team = null;
            $scope.torrent.inteam = false;
            $scope.torrent.team_id = '';
          }
        };

        $scope.furtheredit = function (ev, notempl) {
          if (!notempl && $scope.selected_torrent) {
            $scope.torrent.title = $scope.selected_torrent.predicted_title ? $scope.selected_torrent.predicted_title : $scope.selected_torrent.title;
            $scope.torrent.introduction = $scope.selected_torrent.introduction;
            $scope.torrent.btskey = $scope.selected_torrent.btskey;
            $scope.torrent.tag_ids = $scope.selected_torrent.tag_ids;
            $scope.torrent.category_tag_id = $scope.selected_torrent.category_tag_id;
          }
          $rootScope.newTorrent(ev, $scope.torrent, $scope.user, function () {
          });
        };

        $scope.fastpublish = function () {
            if (!ja.reset()) {
                return;
            }
            if (!$scope.selected_torrent) {
              return;
            }

            ja.start();
            var nt = {
              templ_torrent_id: $scope.selected_torrent._id,
              file_id: $scope.torrent.file_id,
              title: ($scope.selected_torrent.predicted_title ?
                $scope.selected_torrent.predicted_title : $scope.selected_torrent.title),
            };
            if ($scope.torrent.team_id) {
                nt.team_id = $scope.torrent.team_id;
            }
            if ($scope.torrent.teamsync) {
                nt.teamsync = '1';
            }
            $http.post('/api/v2/torrent/add', nt, {cache: false, responseType: 'json'})
                .success(function (data, status) {
                    if (data && data.success) {
                        ja.succeed();
                        $mdDialog.hide(data.torrent);
                    } else {
                        var msg;
                        if (data && data.message) {
                            msg = $filter('translate')(data.message);
                        }
                        ja.fail(msg);
                    }
                })
                .error(function (data, status) {
                    ja.fail((data && data.message) ? data.message : null);
                });
        };
        $scope.close = function () {
            $mdDialog.cancel();
        };
    }
])
.controller('TorrentDetailsCtrl', [
    '$scope',
    '$rootScope',
    '$http',
    '$timeout',
    '$mdDialog',
    '$window',
    'torrent',
    'ngProgress',
    function ($scope, $rootScope, $http, $timeout, $mdDialog, $window, torrent, ngProgress) {
        $scope.lang = $rootScope.lang;
        $scope.torrent = torrent;
        $scope.user = $rootScope.user;
        //$scope.fileContainer = false;
        $scope.showComments = false;
        $scope.showSyncStatus = false;
        $timeout(rejustifyImagesInTorrentDetails, 500);
        if (torrent.content && torrent.content.length <= 1) {
            $scope.fileContainer = true;
        }
        if (torrent.tag_ids && torrent.tag_ids.length > 0) {
            $rootScope.fetchTags(torrent.tag_ids, function (err, tags) {
                if (tags) {
                    $scope.torrent.tags = tags;
                }
            });
        }
        $scope.downloadTorrent = $rootScope.downloadTorrent;

        var user = $scope.user;
        if (user) {
          $scope.canEdit = (user._id == torrent.uploader_id)
            || user.group == 'admin' || user.group == 'staff';
          if (!$scope.canEdit && torrent.team) {
            var team = torrent.team;
            if (team.admin_ids && team.admin_ids.indexOf(user._id) !== -1) {
              $scope.canEdit = true;
            } else if (team.editor_ids && team.editor_ids.indexOf(user._id) !== -1) {
              $scope.canEdit = true;
            }
          }
        }

        $scope.edit = function (ev) {
            $rootScope.editTorrent(ev, $scope.torrent, $scope.user, function () {
            });
        };
        $scope.close = function () {
            $mdDialog.cancel();
        };
    }
]);


rin

.controller('TagActionsCtrl', [
    '$scope',
    '$http',
    '$mdDialog',
    '$q',
    'user',
    'ngProgress',
    function ($scope, $http, $mdDialog, $q, user, ngProgress) {
        var ja = JobActionsWrapper($scope, ngProgress);
        $scope.tagTypeList = ['team', 'bangumi', 'lang', 'resolution', 'format', 'misc'];
        $scope.user = user;
        $scope.tag = {};
        $scope.tag_locale = [];

        function getTagLocale() {
            if (!$scope.tag.synonyms || $scope.tag.synonyms.length <= 0) {
                return;
            }
            var locale = {};
            var tagl = $scope.tag_locale;
            for (var i = 0; i < tagl.length; i++) {
                if (tagl[i] && $scope.tag.synonyms[i]) {
                    if (tagl[i].indexOf(',') >= 0) {
                        var locs = tagl[i].split(',');
                        for (var j = 0; j < locs.length; j++) {
                            if (locs[j]) {
                                locale[locs[j]] = $scope.tag.synonyms[i];
                            }
                        }
                    } else {
                        locale[tagl[i]] = $scope.tag.synonyms[i];
                    }
                }
            }
            return locale;
        }

        function setTagLocale() {
            if (!$scope.tag.synonyms || !$scope.tag.locale
                || $scope.tag.synonyms.length <= 0) {
                $scope.tag_locale = [''];
                return;
            }
            var tagl = [];
            for (var k in $scope.tag.locale) {
                var i = $scope.tag.synonyms.indexOf($scope.tag.locale[k]);
                if (i >= 0) {
                    if (tagl[i]) {
                        tagl[i] += ',' + k;
                    } else {
                        tagl[i] = k;
                    }
                }
            }
            $scope.tag_locale = tagl;
        }

        $scope.search = function () {
            if ($scope.canceler || !ja.reset()) {
                return;
            }
            if ($scope.tag.name) {
                ja.start();
                $http.post('/api/tag/search', {name: $scope.tag.name}, {cache: false, responseType: 'json'})
                    .success(function (data) {
                        if (data && data.success) {
                            ja.succeed();
                            if (data.found) {
                                $scope.tag = data.tag;
                                setTagLocale();
                            } else {
                                $scope.tag.synonyms = [''];
                                $scope.tag_locale = [''];
                                $scope.notfound = true;
                            }
                            $scope.keywordsTags = null;
                        } else {
                            ja.fail();
                        }
                    })
                    .error(function (data) {
                        ja.fail();
                    });
            }
        };
        $scope.increase = function () {
            $scope.tag.synonyms.push('');
            $scope.tag_locale.push('');
        };
        $scope.remove = function (i) {
            $scope.tag.synonyms.splice(i, 1);
            $scope.tag_locale.splice(i, 1);
        };
        $scope.add = function () {
            if (!ja.reset()) {
                return;
            }
            if ($scope.notfound) {
                ja.start();
                var t = {
                    name: $scope.tag.name,
                    type: $scope.tag.type,
                    synonyms: $scope.tag.synonyms,
                    locale: getTagLocale()
                };
                $http.post('/api/tag/add', t, {cache: false, responseType: 'json'})
                    .success(function (data) {
                        if (data && data.success) {
                            ja.succeed();
                            $scope.notfound = false;
                            $scope.tag = data.tag;
                        } else {
                            ja.fail();
                        }
                    })
                    .error(function (data) {
                        ja.fail();
                    });
            }
        };
        $scope.save = function () {
            if (!ja.reset()) {
                return;
            }
            if ($scope.tag._id) {
                ja.start();
                var t = {
                    _id: $scope.tag._id,
                    name: $scope.tag.name,
                    type: $scope.tag.type,
                    synonyms: $scope.tag.synonyms,
                    locale: getTagLocale()
                };
                $http.post('/api/tag/update', t, {cache: false, responseType: 'json'})
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
        };
        $scope.delete = function () {
            if (!ja.reset()) {
                return;
            }
            if ($scope.tag._id) {
                ja.start();
                $http.post('/api/tag/remove', {_id: $scope.tag._id}, {cache: false, responseType: 'json'})
                    .success(function (data) {
                        if (data && data.success) {
                            ja.succeed();
                            $scope.notfound = false;
                            $scope.tag = {};
                            $scope.tag_locale = [];
                        } else {
                            ja.fail();
                        }
                    })
                    .error(function (data) {
                        ja.fail();
                    });
            }
        };
        $scope.selectTag = function (tag) {
            $scope.tag = tag;
            setTagLocale();
            $scope.keywordsTags = null;
        };
        $scope.close = function () {
            $mdDialog.cancel();
        };

        $scope.canceler = null;
        $scope.$watch('tag.name', function (newValue, oldValue) {
            if ($scope.canceler) {
                $scope.canceler.resolve();
            }
            if ($scope.tag._id) {
                $scope.canceler = null;
                $scope.keywordsTags = null;
                return;
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
.controller('TagSearchCtrl', [
    '$stateParams',
    '$scope',
    '$rootScope',
    '$http',
    '$location',
    '$filter',
    'ngProgress',
    function ($stateParams, $scope, $rootScope, $http, $location, $filter, ngProgress) {
        ngProgress.complete();
        $scope.removeTorrent = function (ev, torrent, i) {
            $rootScope.removeTorrent(ev, torrent, function (err) {
                if (!err) {
                    $scope.torrents.splice(i, 1);
                }
            });
        };
        $scope.editTorrent = function (ev, torrent, i) {
        };

        $rootScope.setTitle('Tag');

        var tag_id = $stateParams.tag_id;
        if (!tag_id) {
          $location.path('/');
          return;
        }

        $scope.torrents = [];
        $scope.currentPage = 0;
        $scope.totalPages = 0;
        $scope.tloading = false;

        var loading = false;
        var loadMore = function () {
          if ($scope.currentPage > 0
            && $scope.currentPage >= $scope.totalPages) {
            return;
          }
          if (loading) {
            return;
          }
          loading = true;

          // ngProgress.start();
          $scope.tloading = true;

          var p = ($scope.currentPage + 1);
          var q = { type: 'tag', tag_id: tag_id, p: p };

          $http.post('/api/torrent/search', q, {cache: false, responseType: 'json'})
            .success(function (data) {
              if (data && data.torrents) {
                var nt = data.torrents;
                $rootScope.fetchTorrentUserAndTeam(nt, function () {
                  // ngProgress.complete();
                    $scope.tloading = false;
                });

                Array.prototype.push.apply($scope.torrents, nt);

                if (p == 1) {
                  $scope.totalPages = data.page_count;
                }

                $scope.currentPage += 1;
              } else {
                  // ngProgress.complete();
                  $scope.tloading = false;
              }
              loading = false;
            })
            .error(function () {
              // ngProgress.complete();
                $scope.tloading = false;
              loading = false;
            });
        };
        $scope.loadMore = loadMore;

        $rootScope.fetchTags([tag_id], function (err, tags) {
          if (tags && tags.length > 0) {
            $scope.tag = tags[0];

            $rootScope.setTitle('Tag', $filter('tagname')($scope.tag));
          }
        });

        $scope.loadMore();

        /*
        //This part for tag opt search

        $scope.optTags = [];
        $scope.tags = [];

        var tag_ids = [];
        //TODO: tag_ids need from server
        for (var i = 0; i < $scope.torrents.length; i++) {
            if ($scope.torrents[i].tag_ids) {
                tag_ids = tag_ids.concat($scope.torrents[i].tag_ids);
            }
        }
        if (tag_ids.length > 0) {
            $rootScope.fetchTags(tag_ids, function (err, tags) {
                if (tags) {
                    for (var i = 0; i < tags.length; i++) {
                        if (tags[i]._id == $scope.tag._id) {
                            tags.splice(i, 1);
                            break;
                        }
                    }
                    $scope.optTags = tags;
                }
            });
        }*/
    }
]);

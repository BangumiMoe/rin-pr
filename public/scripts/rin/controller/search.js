
rin
.controller('SearchFilterCtrl', [
    '$scope',
    '$rootScope',
    '$state',
    '$stateParams',
    '$location',
    '$http',
    '$q',
    '$timeout',
    '$filter',
    '$mdDialog',
    'ngProgress',
    function ($scope, $rootScope, $state, $stateParams, $location, $http, $q, $timeout, $filter, $mdDialog, ngProgress) {
        $scope.selectedTags = [];
        var selectedTagIds = [];
        $scope.searchByTitle = false;
        $scope.tags = {};
        $scope.tagTypeList = ['lang', 'resolution', 'format', 'misc', 'bangumi', 'team'];
        $scope.torrents = [];
        $scope.searched = false;
        $scope.tagsCollapse = true;
        $scope.torrentsCount = 0;
        $scope.rsslink = '/rss/latest';
        ngProgress.start();

        $rootScope.setTitle('Search torrent');

        {
          //IntroOptions

          var ___ = $filter('translate');

          $scope.searchIntroOptions = angular.copy($rootScope.baseIntroOptions);
          $scope.searchIntroOptions.steps = [
            {
              element: '#search-filter-header',
              intro: ___('Welcome to search & filter page, click \'Next\' to get started.')
            }, {
              element: '#filter-actions',
              intro: ___('Here, you can get a rss link and add to your own subscription if you have signin.')
            }, {
              element: '#filter-tag-list',
              intro: ___('Then, you can add or remove tags to filter by clicking the tags, and get the results instantly.')
            }, {
              element: '#filter-tag-search',
              intro: ___('Some tags are\'t list here, you can search them here.')
            }, {
              element: '#filter-mode-switch',
              intro: ___('After all, you can also do custom searching by title if you are\'t satisfied with the tags filter.'),
              position: 'left'
            }
          ];

          $timeout(function () {
            $rootScope.searchIntroStart = $scope.searchIntroStart;
            $rootScope.checkIntroAutoStart();
          }, 500);
        }

        $scope.switchMode = function () {
          $scope.searchByTitle = !$scope.searchByTitle;
          $scope.keywordsTags = null;
          if ($scope.searchByTitle) {
            $location.path('/search/title');
          } else {
            $location.path('/search/index');
          }
        };

        $scope.addSubscribe = function (ev) {
            if (selectedTagIds.length <= 0) {
                return;
            }
            $rootScope.showUserDialog(ev, {type: 'subscribe', selectedTagIds: selectedTagIds});
        };

        $scope.update = function () {
            if (selectedTagIds.length <= 0) {
                $location.path('/search/index');
                return;
            }
            if (typeof selectedTagIds === 'string') {
                $location.path('/search/' + selectedTagIds);
            } else {
                var location_path = '/search/';
                for (var i = 0; i < selectedTagIds.length; i++) {
                    location_path += selectedTagIds[i];
                    if (i < selectedTagIds.length - 1) {
                        location_path += '+';
                    }
                }
                $location.path(location_path);
            }
            updateSearchResults(selectedTagIds, function (err, ts) {
                $scope.searched = true;
                if (!err && ts) {
                    $scope.torrents = ts;
                } else {
                    $scope.torrents = [];
                }
            });
        };

        var queries = [];
        queries.push($http.get('/api/tag/popbangumi', {responseType: 'json'}));
        queries.push($http.get('/api/tag/team', {responseType: 'json'}));
        queries.push($http.get('/api/tag/common', {responseType: 'json'}));
        if ($stateParams.tag_id) {
          if ($stateParams.tag_id === 'title') {
            $scope.searchByTitle = true;
          } else if ($stateParams.tag_id !== 'index') {
            if ($stateParams.tag_id.indexOf('+') !== -1) {
                var param_tag_ids = $stateParams.tag_id.split('+');
                queries.push($http.post('/api/tag/fetch', {_ids: param_tag_ids}, {responseType: 'json'}));
            } else {
                queries.push($http.post('/api/tag/fetch', {_id: $stateParams.tag_id}, {responseType: 'json'}));
            }
          }
        }
        $q.all(queries).then(function (dataArray) {
            var tags = {};
            for (var i = 0; i < 3; i++) {
                if (dataArray[i].data) {
                    for (var j = 0; j < dataArray[i].data.length; j++) {
                        var t = dataArray[i].data[j];
                        if (tags[t.type]) {
                            tags[t.type].push(t);
                        } else {
                            tags[t.type] = [t];
                        }
                    }
                }
            }

            $scope.tags = tags;
            if (dataArray.length > 3) {
                if (dataArray[3].data instanceof Array) {
                    dataArray[3].data.forEach(function (tag) {
                        if (tag && tag._id) {
                            $scope.addTag(tag, true);
                        }
                    });
                } else {
                    var tag = dataArray[3].data;
                    if (tag && tag._id) {
                        $scope.addTag(tag, true);
                    }
                }
                $scope.update();
            }
            ngProgress.complete();
        });

        $scope.searchTag = function (tagname) {
            if (!tagname || tagname.length < 2) {
                return;
            }
            ngProgress.start();
            $scope.searching = 'Searching...';
            $http.post('/api/tag/search', {name: tagname, multi: true}, {responseType: 'json'})
                .success(function (data) {
                    ngProgress.complete();
                    if (data.success && data.found) {
                        $scope.searching = 'Search results for: ';
                        for (var i = 0; i < data.tag.length; i++) {
                            $scope.addTag(data.tag[i], true);
                        }
                        $scope.update();
                    } else {
                        $scope.searching = 'No results found for: ';
                    }
                })
                .error(function () {
                    ngProgress.complete();
                    $scope.searching = 'Server error when searching for: ';
                });
        };

        $scope.canceler = null;
        $scope.$watch('newTagName', function (newValue, oldValue) {
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

        $scope.searchTitle = function (title) {
            if (!title || title.length < 2) {
                return;
            }
            updateSearchResults(title, function (err, ts) {
                $scope.searched = true;
                if (!err && ts) {
                    $scope.torrents = ts;
                } else {
                    $scope.torrents = [];
                }
            });
        };
        var indexOfById = function (ts, t) {
            if (!ts) {
                return -1;
            }
            for (var i = 0; i < ts.length; i++) {
                if (ts[i]._id == t._id) {
                    return i;
                }
            }
            return -1;
        };
        $scope.addTag = function (tag, notupdate) {
            var i = indexOfById($scope.tags[tag.type], tag);
            if (i >= 0) {
                $scope.tags[tag.type].splice(i, 1);
            }
            if (indexOfById($scope.selectedTags, tag) >= 0) {
                return;
            } else {
                $scope.selectedTags.push(tag);
                selectedTagIds.push(tag._id);
            }
            if (notupdate) {
                return;
            }
            $scope.update();
        };
        $scope.removeTag = function (tag) {
            var i = indexOfById($scope.selectedTags, tag);
            if (i >= 0) {
                $scope.selectedTags.splice(i, 1);
                selectedTagIds.splice(selectedTagIds.indexOf(tag._id), 1);
            }
            if ($scope.tags[tag.type]) {
                $scope.tags[tag.type].push(tag);
            } else {
                $scope.tags[tag.type] = [tag];
            }
            if ($scope.selectedTags.length === 0) {
                $scope.searched = false;
                $scope.rsslink = '/rss/latest';
            }
            $scope.update();
        };
        var updateSearchResults = function (tag_ids, p, callback) {
            if (typeof p === 'function') {
              callback = p;
              p = 1;
            }
            // ngProgress.start();

            var b = {};
            var rsslink = '/rss/tags/';
            var apiUrl = '/api/torrent/search';
            if (typeof tag_ids == 'string') {
                //title
                b.title = tag_ids;
                rsslink = '';
                apiUrl += '/title';
            } else {
                b.tag_id = tag_ids;
                tag_ids.forEach(function (tag_id, i) {
                    rsslink += tag_id + ((i + 1) < tag_ids.length ? '+' : '');
                });
            }
            $scope.rsslink = rsslink;
            if (p > 1) {
              b.p = p;
            } else {
              $scope.torrentsCount = 0;
              $scope.currentPage = 0;
            }

            $http.post(apiUrl, b, {responseType: 'json'})
                .success(function (data) {
                    if (data && data.torrents) {
                        if (p <= 1) {
                          $scope.torrentsCount = data.count;
                          $scope.totalPages = data.page_count;
                        }
                        $scope.currentPage++;
                        $rootScope.fetchTorrentUserAndTeam(data.torrents, function () {
                            // ngProgress.complete();
                        });
                        callback(null, data.torrents);
                    } else {
                        // ngProgress.complete();
                        callback();
                    }
                })
                .error(function () {
                    // ngProgress.complete();
                    callback();
                });
        };

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
          $scope.tloading = true;

          var cb = function (err, nt) {
            Array.prototype.push.apply($scope.torrents, nt);
            loading = false;
            $scope.tloading = false;
          };

          if ($scope.searchByTitle) {
            updateSearchResults($scope.title, $scope.currentPage + 1, cb);
          } else {
            updateSearchResults(selectedTagIds, $scope.currentPage + 1, cb);
          }
        };
        $scope.loadMore = loadMore;
    }
]);

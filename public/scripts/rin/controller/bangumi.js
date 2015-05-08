
rin
.controller('BangumiListCtrl', [
    '$scope',
    '$rootScope',
    '$http',
    '$filter',
    'ngProgress',
    function ($scope, $rootScope, $http, $filter, ngProgress) {
        ngProgress.start();
        $scope.weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        $scope.weekDayThemes = ['red', 'pink', 'purple', 'blue', 'cyan', 'green', 'deep-orange'];
        $scope.bangumis = [];
        $scope.data = {};

        $rootScope.setTitle('Bangumi List');

        function fetchTags(tag_ids, bs) {
            $rootScope.fetchTags(tag_ids, true, function (err, _tags) {
                if (_tags) {
                    bs.forEach(function (b, i) {
                        if (b.tag_id) {
                            bs[i].tag = _tags[b.tag_id];
                        }
                    });
                    if ($scope.teams) {
                        for (var k in $scope.teams) {
                            if ($scope.teams[k]) {
                                $scope.teams[k].forEach(function (tm) {
                                    tm.tag = _tags[tm.tag_id];
                                });
                            }
                        }
                    }
                }
                ngProgress.complete();
            });
        }

        $http.get('/api/bangumi/timeline', {responseType: 'json'})
          .success(function (data) {
            if (data) {
              //set timelinejs lazyload path
              window.embed_path = '/scripts/timelinejs/';

              var lang = $rootScope.lang;
              lang = lang.replace('_', '-'); //like 'zh-tw'
              createStoryJS({
                type: 'timeline',
                width: '100%',
                height: '500',
                lang: lang,
                /* only use in index */
                /* start_at_slide: startSlide, */
                source: data,
                embed_id: 'bangumi-timeline-embed'
              });
            }
          });

        $http.get('/api/bangumi/current', {responseType: 'json'})
            .success(function (data) {
                if (data) {
                    var bs = data;
                    var bangumis = [];
                    var tag_ids = [];
                    for (var i = 0; i < bs.length; i++) {
                        tag_ids.push(bs[i].tag_id);
                        if (bangumis[bs[i].showOn]) {
                            bangumis[bs[i].showOn].push(bs[i]);
                        } else {
                            bangumis[bs[i].showOn] = [bs[i]];
                        }
                    }
                    $scope.bangumis = bangumis;
                    $http.post('/api/team/working', { tag_ids: tag_ids }, { cache: false, responseType: 'json' })
                        .success(function(data) {
                            if (data) {
                                $scope.teams = data;
                                $scope.searchStates = {};

                                var teamTagIds = [];
                                for (var k in data) {
                                    if (data[k]) {
                                        data[k].forEach(function (tm) {
                                            if (teamTagIds.indexOf(tm.tag_id) < 0) {
                                                teamTagIds.push(tm.tag_id);
                                            }
                                        });
                                    }
                                }
                                tag_ids = tag_ids.concat(teamTagIds);
                            }
                            fetchTags(tag_ids, bs);
                        })
                        .error(function () {
                            fetchTags(tag_ids, bs);
                        });
                }
            })
            .error(function (data) {
                ngProgress.complete();
            });
    }
])

.controller('BangumiActionsCtrl', [
    '$scope',
    '$http',
    '$filter',
    '$mdDialog',
    'user',
    'ngProgress',
    function ($scope, $http, $filter, $mdDialog, user, ngProgress) {
        var ja = JobActionsWrapper($scope, ngProgress);
        $scope.user = user;
        $scope.data = {};
        $scope.bangumi = {};
        $scope.newbangumi = {timezone: 9, showOn: 0};
        $scope.date = null;
        $scope.weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        function timezoneT(date, r) {
            var d = new Date(date);
            var utc = d.getTime() + (d.getTimezoneOffset() * 60000);
            var offset = parseInt($scope.newbangumi.timezone);
            if (r) {
              var tz = -(d.getTimezoneOffset() / 60);
              offset = tz - (offset - tz);
            }
            var timestamp = utc + (3600000 * offset);
            return new Date(timestamp);
        }

        function isValid(bgm) {
            if (bgm && bgm.name && bgm.credit
                && bgm.startDate && bgm.endDate && bgm.showOn >= 0) {
                return true;
            }
            return false;
        }

        $scope.setDate = function (type) {
            $scope.settingDate = type;
        };
        $scope.add = function () {
            if (!ja.reset()) {
                return;
            }
            if (isValid($scope.newbangumi)
                && $scope.newbangumi.icon
                && $scope.newbangumi.cover) {
                ja.start();
                var t = {
                    name: $scope.newbangumi.name,
                    credit: $scope.newbangumi.credit,
                    startDate: $scope.newbangumi.startDate.getTime(),
                    endDate: $scope.newbangumi.endDate.getTime(),
                    showOn: $scope.newbangumi.showOn,
                    icon: $scope.newbangumi.icon,
                    cover: $scope.newbangumi.cover
                };
                $http.post('/api/bangumi/add', t, {cache: false, responseType: 'json'})
                    .success(function (data) {
                        if (data && data.success) {
                            ja.succeed();
                            //Move to Management
                            $scope.data.selectedIndex = 1;
                            $scope.bangumi = data.bangumi;
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
            var t = {
                _id: $scope.bangumi._id,
                name: $scope.bangumi.name,
                credit: $scope.bangumi.credit,
                startDate: $scope.newbangumi.startDate.getTime(),
                endDate: $scope.newbangumi.endDate.getTime(),
                showOn: $scope.newbangumi.showOn,
                icon: $scope.bangumi.icon,
                cover: $scope.bangumi.cover
            };
            if (t._id && isValid(t)) {
                ja.start();
                $http.post('/api/bangumi/update', t, {cache: false, responseType: 'json'})
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
        $scope.search = function () {
            if (!ja.reset()) {
                return;
            }
            if ($scope.bangumi.name) {
                ja.start();
                $http.post('/api/bangumi/search', {name: $scope.bangumi.name},
                    { cache: false, responseType: 'json' })
                    .success(function (data) {
                        if (data && data.success && data.found) {
                            ja.succeed();
                            $scope.bangumi = data.bangumi;

                            var d1 = new Date(data.bangumi.startDate);
                            var d2 = new Date(data.bangumi.endDate);
                            $scope.newbangumi['startDate'] = d1;
                            $scope.newbangumi['endDate'] = d2;
                            $scope.newbangumi['startDateFormat'] = $filter('amDateFormat')(d1, 'YYYY/MM/DD HH:mm:ss');
                            $scope.newbangumi['endDateFormat'] = $filter('amDateFormat')(d2, 'YYYY/MM/DD HH:mm:ss');
                            $scope.newbangumi['showOn'] = data.bangumi.showOn;
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
            if ($scope.bangumi._id) {
                $scope.working = true;
                $http.post('/api/bangumi/remove', {_id: $scope.bangumi._id},
                    { cache: false, responseType: 'json' })
                    .success(function (data) {
                        if (data && data.success) {
                            ja.succeed();
                            $scope.bangumi = {};
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
        $scope.$watch("newbangumi.date", function (newValue, oldValue) {
            if ($scope.settingDate) {
                $scope.newbangumi[$scope.settingDate + 'Format'] = $filter('amDateFormat')(newValue, 'YYYY/MM/DD HH:mm:ss');
                $scope.newbangumi[$scope.settingDate] = timezoneT(newValue);
                $scope.settingDate = '';
            }
        });
        $scope.$watch("newbangumi.timezone", function (newValue, oldValue) {
            $scope.newbangumi.startDate = $scope.newbangumi.endDate = null;
            $scope.newbangumi.startDateFormat = $scope.newbangumi.endDateFormat = '';
        });
        $scope.$watch("newbangumi.weeks", function (newValue, oldValue) {
            if ($scope.newbangumi.startDate) {
              var newweeks = parseInt(newValue);
              if (newweeks && newweeks > 0) {
                var d = new Date($scope.newbangumi.startDate);
                d.setDate(d.getDate() + newweeks * 7);
                d.setMinutes(d.getMinutes() + 30);

                var rd = timezoneT(d, true);

                $scope.newbangumi.endDate = d;
                $scope.newbangumi.endDateFormat = $filter('amDateFormat')(rd, 'YYYY/MM/DD HH:mm:ss');
              }
            }
        });
    }
]);


rin
.controller('UnifiedIndexCtrl', [
    '$scope',
    '$rootScope',
    '$state',
    '$http',
    '$filter',
    '$q',
    '$mdDialog',
    'ngProgress',
    function ($scope, $rootScope, $state, $http, $filter, $q, $mdDialog, ngProgress) {
        ngProgress.start();
        $scope.currentPage = 0;
        $scope.tloading = false;
        $rootScope.$on('torrentAdd', function (ev, torrent) {
            $scope.lattorrents.unshift(torrent);
        });

        $rootScope.setTitle('Index');

        $scope.removeTorrent = function (ev, torrent, i) {
            $rootScope.removeTorrent(ev, torrent, function (err) {
                if (!err) {
                    $scope.lattorrents.splice(i, 1);
                }
            });
        };
        $scope.editTorrent = function (ev, torrent, i) {
            $rootScope.editTorrent(ev, torrent, $scope.user, function (err, torrent) {
                if (!err) {
                    $scope.lattorrents[i] = torrent;
                }
            });
        };
        $scope.lattorrents = [];
        $scope.coltorrents = [];
        var latestTorrents = $http.get('/api/torrent/latest', {cache: false}),
            recentBangumis = $http.get('/api/bangumi/recent', {cache: false}),
            colTorrents = $http.get('/api/torrent/collections', {cache: false});
        //DONT check $rootScope.user, since it load user
        var q = [latestTorrents, recentBangumis, colTorrents];
        $q.all(q).then(function (dataArray) {
            $scope.totalPages = dataArray[0].data.page_count;
            Array.prototype.push.apply($scope.lattorrents, dataArray[0].data.torrents);
            Array.prototype.push.apply($scope.coltorrents, dataArray[2].data);
            $scope.currentPage = 1;
            // Calculate week day on client side may cause errors
            $scope.availableDays = [];
            $scope.data = {};
            $scope.data.selectedIndex = 2;

            var tag_ids = [];
            var rbs = dataArray[1].data;
            var startSlide = 0;
            rbs.forEach(function (rb) {
                tag_ids.push(rb.tag_id);
            });
            function getShowList() {
                var weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                var showList = [];
                var aDays = [];
                var tempList = {};
                var avdays = {};
                var theFirstDay = 0;
                rbs.forEach(function (rb) {
                    if (tempList[rb.showOn]) {
                        tempList[rb.showOn].push(rb);
                    } else {
                        tempList[rb.showOn] = [rb];
                    }
                    avdays[rb.showOn] = true;
                });
                //find the first day
                var maxCount = 0;
                for (var i = 0; i < weekDays.length; i++) {
                    var count = 0;
                    for (var j = i; j < i + 4; j++) {
                        var k = j % weekDays.length;
                        if (avdays[k]) {
                            count++;
                        }
                    }
                    if (count > maxCount) {
                        maxCount = count;
                        theFirstDay = i;
                    }
                }
                for (var j = theFirstDay; j < theFirstDay + 4; j++) {
                    var k = j % weekDays.length;
                    aDays.push(weekDays[k]);
                    showList.push(tempList[k]);
                }
                if (showList.length > 1 && showList[0] && showList[1]
                    && showList[0].length > 0 && showList[1].length > 0) {
                    startSlide = showList[0].length;
                    if (showList[2] && showList[2].length > 0) {
                        startSlide += showList[1].length;
                        if (showList[3] && showList[3].length > 0) {
                            //end on the third day (today)
                            startSlide += 1;
                        }
                    }
                }
                $scope.availableDays = aDays;
                $scope.showList = showList;

                $rootScope.checkIntroAutoStart();
            }

            getShowList();

            var ts = [].concat($scope.lattorrents).concat($scope.coltorrents);
            $rootScope.fetchTorrentUserAndTeam(ts, function () {
                ngProgress.complete();
            });
            $rootScope.fetchTags(tag_ids, true, function (err, _tags) {
                if (_tags) {
                    rbs.forEach(function (rb, i) {
                        if (rbs[i].tag_id) {
                            rbs[i].tag = _tags[rbs[i].tag_id];
                        }
                    });
                    getShowList();
                }
            });
        });
        var loadMore = function () {
            // ngProgress.start();
            $scope.tloading = true;
            $http.get('/api/torrent/page/' + ($scope.currentPage + 1), {cache: false, responseType: 'json'})
                .success(function (data) {
                    if (data && data.torrents) {
                        var nt = data.torrents;
                        $rootScope.fetchTorrentUserAndTeam(nt, function () {
                            // ngProgress.complete();
                            $scope.tloading = false;
                        });
                        Array.prototype.push.apply($scope.lattorrents, nt);
                        //$scope.torrents = $scope.torrents.concat(nt);
                        $scope.currentPage += 1;
                    } else {
                        // ngProgress.complete();
                        $scope.tloading = false;
                    }
                })
                .error(function () {
                    // ngProgress.complete();
                    $scope.tloading = false;
                });
        };
        $scope.loadMore = loadMore;
    }
]);

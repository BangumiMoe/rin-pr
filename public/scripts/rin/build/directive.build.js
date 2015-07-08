
rin
.directive('backgroundImage', function() {
    var m = new Date().getMonth();
    return function (scope, element, attrs) {
        element.css({
            'background-image': 'url(https://bangumi-182e.kxcdn.com/images/bg/m' + m + '.jpg)'
          });
    };
})
.directive('torrentList', function () {
    return {
        restrict: 'A',
        scope: {
            torrents: '=torrentList',
            torrentProps: '=torrentProps'
        },
        templateUrl: rin_template('torrent-list'),
        link: function (scope, element, attrs) {
            scope.showTorrentDetailsDialog = scope.$parent.showTorrentDetailsDialog;
            scope.downloadTorrent = scope.$parent.downloadTorrent;
            if (scope.torrentProps) {
                var tofuncs = ['user', 'team', 'loadMore', 'showTorrentEdit', 'editTorrent', 'removeTorrent'];
                for (var i = 0; i < tofuncs.length; i++) {
                    scope[tofuncs[i]] = scope.$parent[tofuncs[i]];
                }

                var toprops = ['currentPage', 'totalPages', 'tloading'];
                if (scope.showTorrentEdit && scope.user) {
                  var user = scope.user;
                  toprops.push('team');

                  scope.isCanEdit = function (torrent) {
                    var canEdit = (user._id == torrent.uploader_id)
                      || user.group == 'admin' || user.group == 'staff';
                    if (!canEdit && scope.team) {
                      var team = scope.team;
                      if (team.admin_ids && team.admin_ids.indexOf(user._id) !== -1) {
                        canEdit = true;
                      } else if (team.editor_ids && team.editor_ids.indexOf(user._id) !== -1) {
                        canEdit = true;
                      }
                    }
                    return canEdit;
                  };
                }

                scope.$parent.$watchGroup(toprops, function (newValues) {
                    for (var i = 0; i < toprops.length; i++) {
                        scope[toprops[i]] = newValues[i];
                    }
                });
            }
        }
    };
})
.directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if (event.which === 13) {
                scope.$apply(function () {
                    scope.$eval(attrs.ngEnter);
                });

                event.preventDefault();
            }
        });
    };
})
.directive("fileread", [function () {
    return {
        scope: {
            fileread: "="
        },
        link: function (scope, element, attributes) {
            element.bind("change", function (changeEvent) {
                scope.$apply(function () {
                    //scope.fileread = changeEvent.target.files[0];
                    // or all selected files:
                    scope.fileread = changeEvent.target.files;
                });
            });
        }
    }
}])
.directive('newScope', function () {
    return {
        scope: true,
        priority: 450
    };
});

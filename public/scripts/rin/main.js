"use strict";

/**
 * public/scripts/rin/main.js
 * Rin prpr!
 *
 * rin-pr project angular app
 * WE LOVE ACG
 *
 * */

var rin_version = '__VERSION__';

var disqus_shortname = '__SHORTNAME__';
var cdn = '__CDN__';

function rin_template(templ) {
    if (cdn) {
        return cdn + '/templates/' + templ + '.html?v=' + rin_version;
    }
    return '/templates/' + templ + '.html?v=' + rin_version;
}

var rin = angular.module('rin', [
        'ngProgress',
        'ui.router',
        'pascalprecht.translate',
        'ngMaterial',
        'ngAnimate',
        'ipCookie',
        'angular-md5',
        'angularMoment',
        'angular-redactor',
        'ngDisqus',
        'ui.bootstrap.datetimepicker',
        'angular-intro'
    ])
        .run([
            '$rootScope',
            '$state',
            '$stateParams',
            '$translate',
            '$location',
            '$window',
            '$urlRouter',
            '$http',
            '$filter',
            '$q',
            'amMoment',
            '$mdDialog',
            'ipCookie',
            'ngProgress',
            'redactorOptions',
            function ($rootScope,
                      $state,
                      $stateParams,
                      $translate,
                      $location,
                      $window,
                      $urlRouter,
                      $http,
                      $filter,
                      $q,
                      amMoment,
                      $mdDialog,
                      ipCookie,
                      ngProgress,
                      redactorOptions) {
                ngProgress.start();
                $rootScope.$state = $state;
                $rootScope.$stateParams = $stateParams;

                var _page = {};
                $rootScope.setTitle = function (model, subtitle, force) {
                  if (!force && (_page.model || _page.title)) {
                    _page.model = model;
                    _page.title = subtitle;
                    return;
                  }
                  $rootScope.pageModel = model;
                  $rootScope.pageTitle = subtitle;
                };

                $rootScope.pushTitle = function (model, subtitle) {
                  _page.model = $rootScope.pageModel;
                  _page.title = $rootScope.pageTitle;

                  $rootScope.setTitle(model, subtitle, true);
                };

                $rootScope.popTitle = function () {
                  $rootScope.setTitle(_page.model, _page.title, true);
                  _page.model = _page.title = null;
                };

                var getCurState = function () {
                  var curState;
                  var path = $location.path();
                  var m = path.match(/^\/([a-z]*)\/?/);
                  if (m && m[0]) {
                    curState = m[1] ? m[1] : 'root';
                  } else {
                    curState = $state.current ? $state.current.name : null;
                  }
                  return curState;
                };

                var lastState = null;
                $rootScope.$on('$locationChangeSuccess', function (e) {
                    var curState = getCurState();
                    if (curState && curState === lastState) {
                        e.preventDefault();
                    } else {
                        lastState = curState;
                        $urlRouter.sync();
                    }
                });

                var cache_list = ['user', 'team', 'tag'];
                var caches = {};
                for (var i = 0; i < cache_list.length; i++) {
                    caches[cache_list[i]] = new ObjectCache('_id');
                }

                $rootScope.intro = function () {
                  var curState = getCurState();
                  switch (curState) {
                    case 'root':
                      $rootScope.introStart();
                      break;
                    case 'search':
                      $rootScope.searchIntroStart();
                      break;
                  }
                };

                var introAutoStart = false, introAutoStarted = {};
                $rootScope.checkIntroAutoStart = function () {
                  if (introAutoStart) {
                    var curState = getCurState();
                    if (!introAutoStarted[curState]) {
                      introAutoStarted[curState] = true;
                      $rootScope.intro();
                    }
                  }
                };

                $rootScope.beforeChangeEvent = function (targetElement, scope) {
                  var id = angular.element(targetElement).prop('id');
                  if (id == 'main-menu-button') {
                    $("html, body").animate({
                      scrollTop: 0
                    }, 600);
                  }
                };

                $rootScope.introComplete = function () {
                  $("html, body").animate({
                    scrollTop: 0
                  }, 600);
                };

                //$rootScope.shouldAutoStart = function() { return introAutoStart; };

                var fn_switchlang = function () {
                  var ___ = $filter('translate');

                  $rootScope.baseIntroOptions = {
                    nextLabel: '<b>' + ___('Next') + '</b>',
                    prevLabel: ___('Previous'),
                    skipLabel: ___('Skip'),
                    doneLabel: '<b>' + ___('Got it') + '</b>',
                    exitOnEsc: true,
                    exitOnOverlayClick: !introAutoStart,
                    showStepNumbers: false,
                    keyboardNavigation: true,
                    showButtons: true,
                    showBullets: true,
                    showProgress: false,
                    scrollToElement: true,
                    disableInteraction: true
                  };

                  //introOptions
                  $rootScope.introOptions = angular.copy($rootScope.baseIntroOptions);
                  $rootScope.introOptions.steps = [
                    {
                      element: '#animated-header',
                      intro: ___('Welcome to bangumi.moe, click \'Next\' to get started.')
                    }, {
                      element: '#tab3',
                      intro: ___('Recently on showing bangumis by weekdays. If you are looking for a latest bangumi, just select it from here. You will be able to create filter if you are not satisfied with the results.')
                    }, /*{
                      element: '#bangumi-timeline-embed',
                      intro: ___('Not decided which to watch yet? Timeline may help.')
                    },*/ {
                      element: '#bangumi-list-current',
                      intro: ___('Full list of on showing bangumis of this season is here. If you have not decided yet, the timeline may help.'),
                      position: 'left'
                    }, {
                      element: '#torrents-list-latest',
                      intro: ___('Latest posts listed here, you could load more at bottom.'),
                      position: 'top'
                    }, {
                      element: '.torrent-stats',
                      intro: ___('This is the stats of the torrent: downloaded, leechers, seeders and finished.'),
                      position: 'left'
                    }, {
                      element: '#torrent-list-buttons',
                      intro: ___('You will be able to create detailed search filter and the corresponding RSS feed here.')
                    }, {
                      element: '#main-menu-button',
                      intro: ___('Click here to register, login, add new post, manage your team and your posts, as well as request to join a specified team.'),
                      position: 'left'
                    }, {
                      element: '#guide-show-button',
                      intro: ___('And finally, you can review this guide here.'),
                      position: 'top'
                    }
                  ];
                };

                $rootScope.switchLang = function (lang, notSetCookie) {
                    $rootScope.showAdditionLang = false;
                    $rootScope.lang = lang;
                    $translate.use(lang).then(fn_switchlang);
                    if (!notSetCookie) {
                        ipCookie('locale', lang, { expires: 365 }); // expires 1yr
                    }
                    amMoment.changeLocale(lang);
                    //moment.locale(newLocale);
                    redactorOptions.lang = lang;
                };
                $rootScope.showTorrentDetailsDialog = function (ev, torrent, callback) {
                    //var curpath = $location.path();
                    if (torrent._id) {
                        //$location.path('torrent/' + torrent._id);
                    }
                    $rootScope.pushTitle('Torrent', torrent.title);
                    $mdDialog.showModal({
                        controller: 'TorrentDetailsCtrl',
                        templateUrl: rin_template('torrent-details'),
                        targetEvent: ev,
                        locals: {torrent: torrent},
                        onComplete: function () {
                          var treedata = buildTreeview(torrent.content);
                          var tree = new dhtmlXTreeObject("files_tree","100%","100%",0);
                          tree.setImagePath('/images/dhxtree_skyblue/');
                          tree.loadJSONObject(treedata);
                        }
                    }).finally(function () {
                        $rootScope.popTitle();
                        if (callback) callback();
                    });
                };
                $rootScope.editTorrent = function (ev, torrent, user) {
                    $mdDialog.showModal({
                        controller: 'TorrentPublishCtrl',
                        templateUrl: rin_template('torrent-publish'),
                        targetEvent: ev,
                        locals: {torrent: torrent, user: user}
                    }).finally(function () {
                        $('.redactor-toolbar-tooltip').remove();
                    });
                };
                $rootScope.removeTorrent = function (ev, torrent, callback) {
                    var _confirm = false;
                    ev.preventDefault();
                    var delmsg = $filter('translate')('Are you sure you want to delete this torrent?');
                    if (confirm(delmsg)) {
                        $http.post('/api/torrent/remove', {_id: torrent._id}, {cache: false, responseType: 'json'})
                            .success(function (data) {
                                if (data && data.success) {
                                    callback(null);
                                } else {
                                    callback(true);
                                }
                            })
                            .error(function () {
                                callback(true);
                            });
                        _confirm = true;
                    }
                    ev.stopPropagation();
                    return _confirm;
                };
                $rootScope.downloadTorrent = function (torrent) {
                  torrent.downloads += 1;
                  var downloadLink = '/download/torrent/' + torrent._id +
                  '/' + torrent.title.replace(/[\:\<\>\/\\\|\*\?\"]/g, '_') + '.torrent';
                  var urlCreator = $window.URL || $window.webkitURL || $window.mozURL || $window.msURL;
                  var link = document.createElement("a");
                  if (urlCreator && "download" in link) {
                    ngProgress.start();
                    $http.get(downloadLink, {responseType: 'arraybuffer'})
                    .success(function (data) {
                      ngProgress.complete();
                      var blob = new Blob([data], {type: 'application/octet-stream'});
                      var url = urlCreator.createObjectURL(blob);
                      link.setAttribute("href", url);
                      link.setAttribute("download", torrent.title + '.torrent');
                      var event = document.createEvent('MouseEvents');
                      // deprecated method, improvement needed
                      event.initMouseEvent('click', true, true, $window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
                      link.dispatchEvent(event);
                    })
                    .error(function (err) {
                      ngProgress.complete();
                      // TODO error message
                    });
                  } else {
                    // urlCreator not support, redirect to normal http download
                    window.location = downloadLink;
                  }
                };
                $rootScope.fetchTorrentUserAndTeam = function (lt, callback) {
                    var user_ids = [], team_ids = [];
                    for (var i = 0; i < lt.length; i++) {
                        if (lt[i].uploader_id && user_ids.indexOf(lt[i].uploader_id) < 0) {
                            user_ids.push(lt[i].uploader_id);
                        }
                        if (lt[i].team_id && team_ids.indexOf(lt[i].team_id) < 0) {
                            team_ids.push(lt[i].team_id);
                        }
                    }
                    var queries = [], qName = [];
                    var jobs = {user: {_ids: user_ids}, team: {_ids: team_ids}};
                    var datacb = function (dataArray) {
                        if (dataArray) {
                            for (var i = 0; i < dataArray.length; i++) {
                                var data = dataArray[i].data;
                                var k = qName[i];
                                caches[k].push(data);

                                var td = jobs[k].data; //obj
                                for (var j = 0; j < data.length; j++) {
                                    td[data[j]._id] = data[j];
                                }
                            }
                        }
                        for (var i = 0; i < lt.length; i++) {
                            if (jobs.user.data) {
                                lt[i].uploader = jobs.user.data[lt[i].uploader_id];
                            }
                            if (jobs.team.data) {
                                lt[i].team = jobs.team.data[lt[i].team_id];
                            }
                        }
                        if (callback) callback();
                    };
                    for (var k in jobs) {
                        if (jobs[k]._ids.length > 0) {
                            var r = caches[k].find(jobs[k]._ids);
                            if (r && r[1] && r[1].length) {
                                qName.push(k);
                                queries.push(
                                    $http.post('/api/' + k + '/fetch', {_ids: r[1]}, {responseType: 'json'})
                                );
                            }
                            //jobs[k].r = r;
                            jobs[k].data = r[0];
                        }
                    }
                    if (queries.length > 0) {
                        $q.all(queries).then(datacb);
                    } else {
                        datacb();
                        if (callback) callback();
                    }
                };

                var transformById = function (datas) {
                  var _datas = {};
                  datas.forEach(function (data) {
                    _datas[data._id] = data;
                  });
                  return _datas;
                };
                var fetch = function (type, _ids, transform, callback) {
                  if (typeof transform == 'function') {
                    callback = transform;
                    transform = false;
                  }
                  var cache = caches[type];
                  if (!cache) {
                    return;
                  }
                  var datacb = function (data) {
                    if (transform) {
                      data = transformById(data);
                    }
                    callback(null, data);
                  };
                  var r = cache.find(_ids, true);
                  if (r && r[1] && r[1].length) {
                    $http.post('/api/' + type + '/fetch', {_ids: r[1]}, {cache: false, responseType: 'json'})
                      .success(function (data) {
                        if (data) {
                          cache.push(data);
                          data = r[0].concat(data);
                        } else {
                          data = r[0];
                        }
                        datacb(data);
                      })
                      .error(function (data) {
                        callback(data);
                      });
                  } else {
                    datacb(r[0]);
                  }
                };
                $rootScope.fetchUsers = function (user_ids, transform, callback) {
                  fetch('user', user_ids, transform, callback);
                };
                $rootScope.fetchTags = function (tag_ids, transform, callback) {
                  fetch('tag', tag_ids, transform, callback);
                };

                var notSetCookie = true;
                var cookieLangConfig = ipCookie('locale');
                if (!cookieLangConfig) {
                    introAutoStart = true;

                    notSetCookie = false;
                    var langList = ['zh_tw', 'zh_cn', 'en'];
                    if (navigator.language) {
                        var lang = navigator.language
                            .toLowerCase()
                            .replace(/^en(-.+)/, 'en')
                            .replace('-', '_');
                        if (langList.indexOf(lang) >= 0) {
                            cookieLangConfig = lang;
                        }
                    }
                    if (!cookieLangConfig) {
                        cookieLangConfig = 'zh_tw';
                    }
                }
                $rootScope.switchLang(cookieLangConfig, notSetCookie);

                $urlRouter.listen();

                var isSafari = false;
                if (navigator.userAgent) {
                  isSafari = (/^(?!.*Chrome).*?Safari/i).test(navigator.userAgent);
                }
                if (isSafari) {
                  //safari doesn't support this effect, disable it.
                  $mdDialog.showModal = $mdDialog.show;
                } else {
                  $mdDialog.showModal = function (opts) {
                    var ori_oncomplete = opts.onComplete;
                    opts.onComplete = function () {
                      $('body').addClass('modal-open');
                      $('.md-dialog-container').addClass('modal');
                      if (ori_oncomplete) {
                        ori_oncomplete();
                      }
                    };
                    var p = $mdDialog.show(opts);
                    return p.finally(function () {
                      $('body').removeClass('modal-open');
                    });
                  };
                }
            }
        ])
        .config([
            '$stateProvider',
            '$urlRouterProvider',
            '$httpProvider',
            '$locationProvider',
            '$translateProvider',
            '$compileProvider',
            'redactorOptions',
            '$disqusProvider',
            '$sceDelegateProvider',
            function ($stateProvider,
                      $urlRouterProvider,
                      $httpProvider,
                      $locationProvider,
                      $translateProvider,
                      $compileProvider,
                      redactorOptions,
                      $disqusProvider,
                      $sceDelegateProvider) {

                $translateProvider.useStaticFilesLoader({
                    prefix: 'i18n/',
                    suffix: '.json'
                });

                $sceDelegateProvider.resourceUrlWhitelist([
                    // Allow same origin resource loads.
                    'self',
                    // Allow loading from our assets domain.  Notice the difference between * and **.
                    '__CDN__/**'
                ]);

                //$locationProvider.hashPrefix('!');
                $locationProvider.html5Mode(true);

                $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|magnet):/);

                $urlRouterProvider
                    // The `when` method says if the url is ever the 1st param, then redirect to the 2nd param
                    // Here we are just setting up some convenience urls.
                    // .when('/c?id', '/contacts/:id')
                    // .when('/user/:id', '/contacts/:id')
                    // If the url is ever invalid, e.g. '/asdf', then redirect to '/' aka the home state
                    .otherwise('/');

                $stateProvider
                    .state("root", {
                        url: "/",
                        templateUrl: rin_template('index-unified'),
                        controller: 'UnifiedIndexCtrl'
                    })
                    .state("tag", {
                        url: "/tag/:tag_id",
                        templateUrl: rin_template('tag-search'),
                        controller: 'TagSearchCtrl'
                    })
                    .state("bangumi", {
                        url: "/bangumi/list",
                        templateUrl: rin_template('bangumi-list'),
                        controller: 'BangumiListCtrl'
                    })
                    .state("torrent", {
                        url: "/torrent/:torrent_id",
                        templateUrl: rin_template('index-blank'),
                        controller: 'TorrentShowCtrl'
                    })
                    .state("search", {
                        url: "/search/:tag_id",
                        templateUrl: rin_template('search-filter'),
                        controller: 'SearchFilterCtrl'
                    })
                    .state("user-reset-password", {
                        url: "/user/reset-password/:reset_key",
                        templateUrl: rin_template('index-blank'),
                        controller: 'UserResetCtrl'
                    })
                    .state("help", {
                        url: "/help",
                        templateUrl: rin_template('page-help'),
                        controller: 'PageHelpCtrl'
                    })
                    .state("tellus", {
                        url: "/tellus",
                        templateUrl: rin_template('page-tellus'),
                        controller: 'PageTellusCtrl'
                    })
                    .state("announcement", {
                        url: "/announcement",
                        templateUrl: rin_template('page-announcement'),
                        controller: 'PageAnnouncementCtrl'
                    })
                    .state("admin", {
                        url: "/admin",
                        templateUrl: rin_template('admin'),
                        controller: 'AdminCtrl'
                    });
                $urlRouterProvider.deferIntercept();

                $httpProvider.defaults.transformRequest = function (data) {
                    if (data === undefined)
                        return data;

                    var needMultipart = false;
                    angular.forEach(data, function (value, key) {
                        if (value instanceof FileList) {
                            needMultipart = true;
                        }
                    });
                    if (!needMultipart) {
                        //transform to JSON
                        return JSON.stringify(data);
                    }

                    var fd = new FormData();
                    angular.forEach(data, function (value, key) {
                        if (value instanceof FileList) {
                            if (value.length == 1) {
                                fd.append(key, value[0]);
                            } else {
                                angular.forEach(value, function (file, index) {
                                    fd.append(key + '_' + index, file);
                                });
                            }
                        } else {
                            fd.append(key, value);
                        }
                    });

                    return fd;
                };

                $httpProvider.defaults.headers.post['Content-Type'] = undefined;

                redactorOptions.buttonSource = true;
                redactorOptions.imageEnableUpload = false;      //disable upload
                redactorOptions.imageUpload = '/api/file/upload/image?for=redactor';
                redactorOptions.imageManagerJson = '/api/file/all/image';
                redactorOptions.plugins = ['fontsize', 'fontcolor', 'imagemanager', 'fullscreen'];

                $disqusProvider.setShortname(disqus_shortname);
                if (window.location.origin) {
                    $disqusProvider.setUrlPrefix(window.location.origin);
                } else {
                    var m = window.location.href.match(/(https?:\/\/[^\/]+)\/?/i);
                    if (m && m[0]) $disqusProvider.setUrlPrefix(m[1]);
                }
            }
        ])
;

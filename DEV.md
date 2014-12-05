# rin-project

------

## Web

### background

* koa plus koa-*
* mongodb (Origin MongoDB Driver)
* underscorejs
* [koa-router](https://github.com/alexmingoia/koa-router)
* [validator.js](https://github.com/chriso/validator.js)
* [magnet-uri](https://www.npmjs.org/package/magnet-uri)
* RSS

### foreground

**Managed via bower**

* [bootstrap Paper](http://bootswatch.com/paper/) OR [material](https://github.com/angular/material)
* angularjs
* [ui-router](https://github.com/angular-ui/ui-router)
* [ngProgress](http://victorbjelkholm.github.io/ngProgress/)
* [angular-translate](https://github.com/angular-translate/angular-translate) with [static language file](http://www.ng-newsletter.com/posts/angular-translate.html)
* [FontAwesome](http://fortawesome.github.io/Font-Awesome/)

## Tracker

* bittorrent-tracker

## Other

Shall we give it a try? [webtorrent](https://github.com/feross/webtorrent)

## Files

- APP_ROOT
  + bin/ - Executables
  + controller/ - Controllers and route definitions
  + doc/ - Documentations
  + lib/ - Libraries & functions
  - public/ - Public static directory, delegate to nginx directly as root directory
    + bower_components/ - Static app resource (managed by bower)
	+ templates/ - ui-router page templates
	+ images/ - images directory (if necessary)
	- angular-prpr.js - Angular.js main app file
	- index.html - Frontpage index file
  - package.json - Package info file
  - prpr.js - rin-pr main app

## Routes

TBD

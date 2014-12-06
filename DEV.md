# rin-project

------

## Web

### background

* koa plus koa-*
* mongodb (Origin MongoDB Driver)
* underscorejs
* co-body or co-busboy for parse the params of request
* [koa-router](https://github.com/alexmingoia/koa-router)
* [validator.js](https://github.com/chriso/validator.js)
* [magnet-uri](https://www.npmjs.org/package/magnet-uri)
* [parse-torrent](https://www.npmjs.org/package/parse-torrent)
* RSS

### foreground

**Managed via bower**

* [bootstrap Paper](http://bootswatch.com/paper/) OR [material](https://github.com/angular/material)
* angularjs
* [ui-router](https://github.com/angular-ui/ui-router)
* [ngProgress](http://victorbjelkholm.github.io/ngProgress/)
* [angular-translate](https://github.com/angular-translate/angular-translate) with [static language file](http://www.ng-newsletter.com/posts/angular-translate.html)
* [FontAwesome](http://fortawesome.github.io/Font-Awesome/)
* momentjs
* [Prerender.io](https://prerender.io) For SEO

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
  + models/ - Model definitions
  - public/ - Public static directory, delegate to nginx directly as root directory
    + bower_components/ - Static app resource (managed by bower)
    + templates/ - ui-router page templates
    + images/ - images directory (if necessary)
    - angular-prpr.js - Angular.js main app file
    - index.html - Frontpage index file
  - package.json - Package info file
  - prpr.js - rin-pr main app

## Routes

All routes defined under `/api`

- Frontpage: 50 latest torrents
  * Path: `/torrents/latest`
  * Method: `GET`
  * Return: 50 latest torrents (all bangumi, sort by `publish_time`) list
  ```js
  [
      {
          _id: ObjectID(),
          title: '[KNA][Sora no Method][天體運行式]][10][720p][MP4]',
          tags: ['KNA', 'Sora no Method', '720p', 'mp4', 'PSV', 'Mizi-raws'],
          bangumi_id: ObjectID(),
          downloads: 144,
          finished: 128,
          leechers: 17,
          seeders: 26,
          team: 'KNA',
          author: 'angelcat',
          publish_time: UNIX_TIMESTAMP(),
          magnet: 'magnet:...',
          file: '/download/2014/12/(md5).torrent',
          content: 'Torrent desc here.'
      },
      {...}
  ]
  ```

- Frontpage: Season bangumi list
  * Path: `/bangumi/current`
  * Method: `GET`
  * Return: Currently on showing bangumi list
  ```js
  [
      {
          _id: ObjectID(),
          name: '天體運行式',
          startDate: UNIX_TIMESTAMP(),
          endDate: UNIX_TIMESTAMP(),
          showOn: 6, // Date().getDay()
          tags: ['天体のメソッド', 'Sora no Method', '天体运行式']
      },
      {...}
  ]
  ```

- Frontpage: Team list
  * Path: `/team/list`
  * Method: `GET`
  * Return: Registered team list
  ```js
  [
      {
          _id: ObjectID(),
          name: 'KNA'
      },
      {...}
  ]
  ```

- Frontpage: Torrent details
  * Path: `/torrent/:torrent_id`
  * Method: `GET`
  * Return: Torrent details **Deprecated: angular already requested the resources**

- Filter page: Specific bangumi torrents list
  * Path: `/bangumi/:bangumi_id`
  * Method: `GET`
  * Return: 50 (or customizable amount) latest torrents list of the bangumi
  ```js
  [
      {
          _id: ObjectID(),
          title: '[KNA][Sora no Method][天體運行式]][10][720p][MP4]',
          tags: ['KNA', 'Sora no Method', '720p', 'mp4', 'PSV', 'Mizi-raws'],
          bangumi_id: ObjectID(),
          downloads: 144,
          finished: 128,
          leechers: 17,
          seeders: 26,
          team: 'KNA',
          author: 'angelcat',
          publish_time: UNIX_TIMESTAMP(),
          magnet: 'magnet:...',
          file: '/download/2014/12/(md5).torrent',
          content: 'Torrent desc here.'
      },
      {...}
  ]
  ```

- Filter page: Specific team torrents list
  * Path: `/team/:team_id`
  * Method: `GET`
  * Return: 50 (or customizable amount) latest torrents list by the team
  ```js
  [
      {
          _id: ObjectID(),
          title: '[KNA][Sora no Method][天體運行式]][10][720p][MP4]',
          tags: ['KNA', 'Sora no Method', '720p', 'mp4', 'PSV', 'Mizi-raws'],
          bangumi_id: ObjectID(),
          downloads: 144,
          finished: 128,
          leechers: 17,
          seeders: 26,
          team: 'KNA',
          author: 'angelcat',
          publish_time: UNIX_TIMESTAMP(),
          magnet: 'magnet:...',
          file: '/download/2014/12/(md5).torrent',
          content: 'Torrent desc here.'
      },
      {...}
  ]
  ```

- Admin: signin
  * Path: `/admin/signin`
  * Method: `POST`
  * params:
  ```js
  {
      username: 'admin',
      password: sha256('P@ssw0rd')
  }
  ```
  * Return: Login result & session cookie
  ```js
  {
      success: true|false
      messgae: 'login success.'|'login failed.'
  }
  ```

- Admin: Signout
  * Path: `/admin/signout`
  * Method: `POST`
  * Params:
  ```js
  {
      username: 'admin'
      session
  }
  ```
  * Return:
  ```js
  {
      success: true|false
      message: 'logout success.'|'logout failed.'
  }
  ```

- Admin: Summary
  * Path: `/admin/summary`
  * Method: `GET`
  * Return: App & system summary
  ```js
  {
      sysload: [0.20, 0.51, 0.73],
      teams: 32,
      members: 41,
      torrents: 765
  }
  ```

- Admin: Team CRUD

- Admin: User CRUD

- Admin: Torrents CRUD

- Admin: Bangumi CRUD

- User: signin

- User: signout

- User: Submit new torrent

## Models/Functions

* Model: Admin
  * Document object:
  ```js
  {
      _id: ObjectID(),
      username: 'admin',
      password: md5(sha256('P@ssw0rd') + salt),
      email: 'admin@example.com'
  }
  ```
  * Prototype:

* Model: Users
  * Document object:
  ```js
  {
      _id: ObjectID(),
      username: 'user',
      password: md5(sha256('password') + salt),
      email: 'user@domain.tld',
      belongs_to: ObjectID(team_id)
  }
  ```
  * Prototype:

* Model: Bangumis
  * Document object:
  ```js
  {
      _id: ObjectID(),
      name: '天體運行式',
      startDate: UNIX_TIMESTAMP(),
      endDate: UNIX_TIMESTAMP(),
      showOn: 6, // Date().getDay()
      tags: ['天体のメソッド', 'Sora no Method', '天体运行式']
  }
  ```
  * Prototype:

* Model: Torrents
  * Document object:
  ```js
  {
      _id: ObjectID(),
      title: '[KNA][Sora no Method][天體運行式]][10][720p][MP4]',
      tags: ['KNA', 'Sora no Method', '720p', 'mp4', 'PSV', 'Mizi-raws'],
      bangumi_id: ObjectID(),
      downloads: 144,
      finished: 128,
      leechers: 17,
      seeders: 26,
      team: 'KNA',
      author: 'angelcat',
      publish_time: UNIX_TIMESTAMP(),
      magnet: 'magnet:...',
      file: '/download/2014/12/(md5).torrent',
      content: 'Torrent desc here.'      
  }
  ```

* Model: Tags
  * Document object:
  ```js
  {
      _id: ObjectID(),
      name: '天体のメソッド',
      synonyms: ['天体のメソッド', 'Sora no Method', '天體運行式', '天体运行式', '天体的方式']
  }
  ```

## Angular Pages

Controller: Tag
===================

* `/tag/all`
  - desc: Get all tags
  - method: `GET`
  - params: none
  - return: [ [object Tag] ]

* `/tag/add`
  - desc: Add new tag object
  - method: `POST`
  - params: [object Tag]
  - return: { success: <true|false>, tag: [object Tag] }

* `/tag/update`
  - desc: Update specific tag with a new one
  - method: `POST`
  - params: [object Tag]
  - return: { success: <true|false>, tag: [object Tag] }

* `/tag/remove`
  - desc: Remove a tag by ID
  - method: `POST`
  - params: `{ _id: tag._id }`
  - return: { success: <true|false> }

* `/tag/fetch`
  - desc: Fetch tag(s) information.
  - method: `POST`
  - params: `{ _id: tag._id }` or `{ _ids: [tag._id] }`
  - return: [object Tag] or [ [object Tag] ]

* `/tag/popbangumi`
  - desc: Get popular `bangumi` tags. (TODO: need to be improve)
  - method: `GET`
  - params: none
  - return: [ [object Tag] ]

* `/tag/common`
  - desc: Get common tags, include `lang`, `resolution`, `format`, `misc`.
  - method: `GET`
  - params: none
  - return: [ [object Tag] ]

* `/tag/{team|misc}`
  - desc: Get `team` or `misc` tags.
  - method: `GET`
  - params: none
  - return: [ [object Tag] ]

* `/tag/search`
  - desc: Search tag(s) by tag name or keywords.
  - method: `POST`
  - params: `{ keywords: false, multi: <true|false>, name: <tag name> }` or `{ keywords: true, multi: <true|false>, name: <tag keywords>, type: <? tag type> }`
  - return: { success: <true|false>, found: <true|false>, tag: multi ? [ [object Tag] ] : [object Tag] }

* `/tag/suggest`
  - desc: Get tags suggestion by torrent title.
  - method: `POST`
  - params: `{ query: torrent.title }`
  - return: [ [object Tag] ]

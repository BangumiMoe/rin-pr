Controller: Tracker
=================

**This API should be updated, with the multiple torrents update request support.**

* `/tracker/update`
  - desc: Update torrent stats information
  - method: `POST`
  - params: `{ infoHash: torrent.infoHash, data: { peers: <peers>, seeds: <seeds>, completed: <true|false> } }`
  - return: `{ success: true }`

Controller: Tracker
=================

**NOTE: This API should allow only trusted IP to access.**

* `/tracker/update`
  - desc: Update torrent stats information
  - method: `POST`
  - params: `{ infoHash: torrent.infoHash, data: { peers: <peers>, seeds: <seeds>, completed: <completed> } }` or `[ Array of [object params] ]`
  - return: `{ success: true }`

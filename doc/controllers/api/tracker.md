Controller: Tracker
=================

**NOTE: This API should allow only trusted IP to access.**

We use a modified opentracker:

https://github.com/MartianZ/opentracker

* `/tracker/update`
  - desc: Update torrent stats information
  - method: `POST`
  - params: `{ action: 'update', infoHash: torrent.infoHash, data: { peers: <peers>, seeds: <seeds>, completed: <completed> } }` or `[ Array of [object params] ]`
  - return: `{ success: true }`

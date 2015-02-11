Controller: Rss
=================

* `/latest`
- desc: Lastest torrents RSS.
- method: `GET`
- params: `?limit=<limit num>`
- return: [xml rss]

* `/tags/:tag_ids`
- desc: With tags torrents RSS.
- method: `GET`
- params: `?limit=<limit num>`, tag_ids split by `+`
- return: [xml rss]

* `/user/:user_id`
- desc: With user subscribed tags torrents RSS.
- method: `GET`
- params: `?limit=<limit num>`
- return: [xml rss]

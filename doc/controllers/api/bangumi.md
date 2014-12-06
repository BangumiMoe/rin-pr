Controller: Bangumi
===================

**params and return values needs to be updated**

* `/bangumi/current`
  - desc: Get all currently on showing bangumis
  - method: `GET`
  - params: none
  - return: [Array]

* `/bangumi/recent`
  - desc: Get bangumis showing on yesterday, today and tomorrow
  - method: `GET`
  - params: none
  - return: [Array]

* `/bangumi/all`
  - desc: Get all bangumis
  - method: `GET`
  - params: none
  - return: [Array]

* `/bangumi/add`
  - desc: Add new bangumi object
  - method: `POST`
  - params: [object bangumi]
  - return: [object JSON]

* `/bangumi/update`
  - desc: Update specific bangumi with a new one
  - method: `POST`
  - params: [object bangumi]
  - return: [object JSON]

* `/bangumi/remove`
  - desc: Remove a bangumi by ID
  - method: `POST`
  - params: `{ _id: bangumi_id }`
  - return: [object JSON]

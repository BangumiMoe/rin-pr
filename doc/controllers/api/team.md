Controller: Teams
=================

* `/teams/all`
  - desc: Get all registered teams
  - method: `GET`
  - params: none
  - return: [Array]

* `/teams/add`
  - desc: Add new team
  - method: `POST`
  - params: [object Team]
  - return: [object JSON]

* `/teams/update`
  - desc: Update specific team with new one
  - method: `POST`
  - params: [object Team]
  - return: [object JSON]

* `/teams/remove`
  - desc: Remove specific team
  - method: `POST`
  - params: `{ _id: team._id }`
  - return: [object JSON]

Model: Tags
===========

this: Tag Object

* `prototype.matchTags`
  - desc: Matches multiple possible synonym tags in `tags` collection.
  - params: none (this)
  - return: [Array]

* `prototype.save`
  - desc: Saves target tag object to database. (Will not check duplication)
  - params: none (this)
  - return: none

* `prototype.remove`
  - desc: Removes tag by specified ID
  - params: none (this)
  - return: none

* `prototype.find`
  - desc: Find ONE tag by specified ID
  - params: none (this).id
  - return: [Object Tag]

* `prototype.update`
  - desc: Update specific tag with a new one
  - params: none (this)(new)
  - return: none

* `prototype.getAll`
  - desc: Get all tags
  - params: none
  - return [Array]

const should = require("should")

const fs = require('fs')
const path = require('path')
const hat = require('hat')
const createTorrent = require('create-torrent')
const BTSite = require('../lib/teamsync/bt-sites').BTSite
const ocr = require('../lib/teamsync/ocr').ocr
const config = require('../config')
const sitesConfig = require('./sites-config')

const TORRENT_NAME = 'rin-pr unit test'
const TORRENT_INTRO = 'This is from rin-pr teamsync unit test, it will be removed soon.<br>Regards,<br>rin-pr developers'

const sites = {}
const lastPublishUrl = {}
let testTorrentBuf = null

describe("torrent", function () {
  it("create torrent should be success", function (cb) {
    const content = Buffer.from(hat(10 * 1024 * 1024), 'hex')
    content.name = TORRENT_NAME
    createTorrent(content, {
      announceList: config.torrent.add,
    }, function (err, torrent) {
      should.not.exist(err)
      should.exist(torrent)
      testTorrentBuf = torrent
      cb()
    })
  })
})

describe("login", function () {
  this.timeout(10000)
  before(function (done) {
    done()
  })
  const configKeys = [ 'username', 'password', 'cookie' ]
  Object.keys(sitesConfig).forEach(function (siteName) {
    it(siteName + " should login success", function (cb) {
      const site = sitesConfig[siteName]
      const s = BTSite(siteName)
      // set username / password directly
      configKeys.forEach(function (key) {
        s['m_' + key] = site[key]
      })
      s.login(function (err, islogin) {
        should.not.exist(err)
        islogin.should.be.true
        sites[siteName] = s
        cb()
      })
    })
  })
})

describe("upload", function () {
  this.timeout(20000)
  before(function (done) {
    done()
  })
  Object.keys(sitesConfig).forEach(function (siteName) {
    it(siteName + " should upload success", function (cb) {
      const s = sites[siteName]
      should.exist(s)
      s.upload(TORRENT_NAME, TORRENT_INTRO, {}, testTorrentBuf, function (err, succeed) {
        should.not.exist(err)
        succeed.should.be.true
        cb()
      })
    })
  })
})

describe("getlastpublish", function () {
  this.timeout(10000)
  before(function (done) {
    done()
  })
  Object.keys(sitesConfig).forEach(function (siteName) {
    it(siteName + " should getlastpublish success", function (cb) {
      const s = sites[siteName]
      should.exist(s)
      s.getlastpublish(function (err, lastone) {
        should.not.exist(err)
        should.exist(lastone)
        lastone.title.should.eql(TORRENT_NAME)
        lastPublishUrl[siteName] = lastone.url
        cb()
      })
    })
  })
})

describe("update", function () {
  this.timeout(10000)
  before(function (done) {
    done()
  })
  Object.keys(sitesConfig).forEach(function (siteName) {
    it(siteName + " should update success", function (cb) {
      const s = sites[siteName]
      const url = lastPublishUrl[siteName]
      should.exist(s)
      should.exist(url)
      s.update(url, TORRENT_NAME + ' [Edited]', '[Edited]<br>' + TORRENT_INTRO, function (err, succeed) {
        should.not.exist(err)
        succeed.should.be.true
        cb()
      })
    })
  })
})

describe("remove", function () {
  this.timeout(10000)
  before(function (done) {
    done()
  })
  Object.keys(sitesConfig).forEach(function (siteName) {
    it(siteName + " should remove success", function (cb) {
      const s = sites[siteName]
      const url = lastPublishUrl[siteName]
      should.exist(s)
      should.exist(url)
      s.remove(url, function (err, succeed) {
        should.not.exist(err)
        succeed.should.be.true
        cb()
      })
    })
  })
})

describe("ocr", function () {
  it("should success", function (cb) {
    fs.readFile(path.join(__dirname, 'test-vcode.png'), function (err, buf) {
      should.not.exist(err)
      ocr(buf, 5, function (err, word) {
        should.not.exist(err)
        word.should.be.eql('amff5')
        cb()
      })
    })
  })
})

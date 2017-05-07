
var util = require('util')
var _ = require('underscore')
var S = require('string')
var EventProxy = require('eventproxy')

var BTSiteBase = require('./base')

var ACGNX_BASE_URL = 'https://share.acgnx.se'

function BTSiteAcgnx(opts) {
  BTSiteBase.call(this)
  this.setSite('acgnx')
  this.m_options = {
    'mod': 'upload',
    'sort_id': 1, // default category: donga
    'Team_Post': 1,
    // 'emule_resource': '',
    // 'synckey': '',
    // 'Anonymous_Post': 0,
    // 'discuss_url': '',
  }
  if (opts) {
    this.m_options = _.extend(this.m_options, opts)
  }
}

util.inherits(BTSiteAcgnx, BTSiteBase)

BTSiteAcgnx.prototype.setCategory = function (category) {
  /*
  <select id="sort_id" name="sort_id">
    <option value="0">請選擇</option>
    <option value="1">動畫</option><option value="2">&nbsp;&nbsp;&nbsp;&nbsp;季度全集</option>
    <option value="3">漫畫</option><option value="4">&nbsp;&nbsp;&nbsp;&nbsp;港臺原版</option><option value="5">&nbsp;&nbsp;&nbsp;&nbsp;日文原版</option>
    <option value="6">音樂</option><option value="7">&nbsp;&nbsp;&nbsp;&nbsp;動漫音樂</option><option value="8">&nbsp;&nbsp;&nbsp;&nbsp;同人音樂</option><option value="9">&nbsp;&nbsp;&nbsp;&nbsp;流行音樂</option>
    <option value="10">日劇</option>
    <option value="11">RAW</option>
    <option value="12">遊戲</option><option value="13">&nbsp;&nbsp;&nbsp;&nbsp;電腦遊戲</option><option value="14">&nbsp;&nbsp;&nbsp;&nbsp;電視遊戲</option><option value="15">&nbsp;&nbsp;&nbsp;&nbsp;掌機遊戲</option><option value="16">&nbsp;&nbsp;&nbsp;&nbsp;網絡遊戲</option><option value="17">&nbsp;&nbsp;&nbsp;&nbsp;遊戲周邊</option>
    <option value="18">特攝</option>
    <option value="19">其他</option>
  </select>
  */
  var cates = {
    'donga': 1,
    'comic': 3,
    'game': 12,
    'music': 6,
    'raws': 11,
    'movie': 1,
    'collection': 2,
    'dorama': 10,
    'other': 19,
  }
  var cate_id = cates[category]
  if (cate_id) {
    this.m_options['sort_id'] = cate_id
  }
}

BTSiteAcgnx.prototype.IsLogin = function (callback) {
  this.request.clearCookie(ACGNX_BASE_URL)
  // api token
  if (this.m_password) {
    callback(null, true)
  } else {
    callback(null, false)
  }
}

BTSiteAcgnx.prototype.LoginEx = function (callback) {
  if (this.m_password) {
    callback(null, true)
  } else {
    callback('no api token', false)
  }
}

BTSiteAcgnx.prototype.LoginSucceed = function (callback) {
  callback(null, true)
}

BTSiteAcgnx.prototype.upload = function (title, intro, torrent_buf, callback) {
  //no need for vcode

  // get discuss URL
  var discussUrl = this.getLastUrl(intro)

  var formdata = {
    'title': title,
    'intro': intro,
    'discuss_url': discussUrl,
    // auth by uid & api_token
    'uid': this.m_username,
    'api_token': this.m_password,
  }
  formdata = _.extend(formdata, this.m_options)
  formdata.__object = [{
    type: 'buffer',
    name: 'bt_file',
    buffer: torrent_buf,
    options: {
      filename: this.getTorrentFilename(),
  }}]

  var that = this;
  this.request.post(ACGNX_BASE_URL + '/user.php?o=api&op=upload',
      formdata, { multipart: true, rejectUnauthorized: false, json: true },
      function (err, response, body) {
    if (err) {
      return callback(err)
    }
    if (body) {
      if (body.status === 'success') {
        that.m_lastone = {
          title: body.title ? body.title.toString() : '',
          url: ACGNX_BASE_URL + '/show-' + body.info_hash + '.html',
        }
        callback(null, true)
      } else {
        if (body.value) {
          callback(body.value.toString(), false)
        } else {
          callback('unknown error', false)
        }
      }
    } else {
      callback('unknown error', false)
    }
  })
}

BTSiteAcgnx.prototype.getlastpublish = function (callback) {
  if (this.m_lastone) {
    callback(null, this.m_lastone)
  } else {
    callback('not found')
  }
}

BTSiteAcgnx.prototype.update = function (url, title, intro, callback) {
  callback('not support', false)
}

BTSiteAcgnx.prototype.remove = function (url, callback) {
  callback('not support', false)
}

BTSiteAcgnx.prototype.listmytorrents = function (p, callback) {
  if (typeof p === 'function') {
    callback = p
    p = null
  }

  callback('not support', false)
}

module.exports = BTSiteAcgnx

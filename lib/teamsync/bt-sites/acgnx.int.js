
var util = require('util')
var _ = require('underscore')
var S = require('string')
var EventProxy = require('eventproxy')

var BTSiteAcgnx = require('./acgnx')

var ACGNX_BASE_URL = 'https://share.acgnx.se'

function BTSiteAcgnxInt(opts) {
  BTSiteAcgnx.call(this, opts)
  this.setSite('acgnx.int')
  this.acgnxUrl = 'https://www.acgnx.se'
  this.m_options = _.extend(this.m_options, {
    'sort_id': 4, // default category: donga
  })
}

util.inherits(BTSiteAcgnxInt, BTSiteAcgnx)

BTSiteAcgnxInt.prototype.setCategory = function (category) {
  /*
  <select id="sort_id" name="sort_id">
    <option value="0">Select</option>
    <option value="1">Anime</option><option value="2">&nbsp;&nbsp;&nbsp;&nbsp;A.E.T</option><option value="3">&nbsp;&nbsp;&nbsp;&nbsp;A.Raw</option><option value="4">&nbsp;&nbsp;&nbsp;&nbsp;A.N.E.T</option><option value="5">&nbsp;&nbsp;&nbsp;&nbsp;A.M.V</option>
    <option value="6">Audio</option><option value="7">&nbsp;&nbsp;&nbsp;&nbsp;Lossless</option><option value="8">&nbsp;&nbsp;&nbsp;&nbsp;Lossy</option>
    <option value="9">Literature</option><option value="10">&nbsp;&nbsp;&nbsp;&nbsp;L.E.T</option><option value="11">&nbsp;&nbsp;&nbsp;&nbsp;L.Raw</option><option value="12">&nbsp;&nbsp;&nbsp;&nbsp;L.N.E.T</option>
    <option value="13">Live Action</option><option value="14">&nbsp;&nbsp;&nbsp;&nbsp;L.A.E.T</option><option value="15">&nbsp;&nbsp;&nbsp;&nbsp;L.A.Raw</option><option value="16">&nbsp;&nbsp;&nbsp;&nbsp;L.A.N.E.T</option><option value="17">&nbsp;&nbsp;&nbsp;&nbsp;Idol/PV</option>
    <option value="18">Software</option><option value="19">&nbsp;&nbsp;&nbsp;&nbsp;Applications</option><option value="20">&nbsp;&nbsp;&nbsp;&nbsp;Games</option>
    <option value="21">Pictures</option><option value="22">&nbsp;&nbsp;&nbsp;&nbsp;Photos</option><option value="23">&nbsp;&nbsp;&nbsp;&nbsp;Graphics</option>
  </select>
  */
  var cates = {
    'donga': 4,
    'comic': 12, // L.N.E.T
    'game': 20, // Games
    'music': 8, // Lossy
    'raws': 3, // A.Raw
    'movie': 4,
    'collection': 4,
    'dorama': 16, // L.A.N.E.T
    'other': 23, // Graphics
  };
  var cate_id = cates[category]
  if (cate_id) {
    this.m_options['sort_id'] = cate_id
  }
}

module.exports = BTSiteAcgnxInt

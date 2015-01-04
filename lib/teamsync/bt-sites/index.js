
//exports.BTSiteBase = require('./base');
//var btsites_config = require('./../../config').bt_sites;

var BTSiteDmhy = require('./dmhy'),
  BTSiteKtxp = require('./ktxp'),
  BTSiteCamoe = require('./camoe'),
  BTSitePopgo = require('./popgo');

var BTSite = function (site, user_id, category) {
  var bts = null;
  switch (site) {
    case 'dmhy':
      bts = new BTSiteDmhy();
      break;
    case 'ktxp':
      bts = new BTSiteKtxp();
      break;
    case 'popgo':
      bts = new BTSitePopgo();
      break;
    case 'camoe':
      bts = new BTSiteCamoe();
      break;
  }
  if (bts) {
    if (category) {
      bts.setCategory(category);
    }
    if (user_id) {
      bts.setUserId(user_id);
    }
  }
  return bts;
};

exports.BTSite = BTSite;

//exports.BTSiteBase = require('./base');
//var btsites_config = require('./../../config').bt_sites;

var BTSiteDmhy = require('./dmhy'),
  BTSiteKtxp = require('./ktxp'),
  BTSitePopgo = require('./popgo');

var BTSite = function (site, user_id) {
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
  }
  if (bts) bts.setUserId(user_id);
  return bts;
};

exports.BTSite = BTSite;
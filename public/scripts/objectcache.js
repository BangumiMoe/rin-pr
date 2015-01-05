'use strict'

function ObjectCache(indexkey) {
  this.index = indexkey;
  this.data = {};
}

ObjectCache.prototype.push = function(objs, ismap) {
  var keys = [];
  var tdata;
  if (ismap) {
    tdata = objs;
    for (var k in objs) {
      keys.push(k);
    }
  } else {
    tdata = {};
    if (!(objs instanceof Array)) {
      objs = [objs];
    }
    for (var i = 0; i < objs.length; i++) {
      var k = objs[i][this.index];
      keys.push(k);
      tdata[k] = objs[i];
    }
  }
  var r = this.find(keys);
  if (r && r[1] && r[1].length) {
    for (var i = 0; i < r[1].length; i++) {
      var k = r[1][i];
      this.data[k] = tdata[k];
    }
  }
};

ObjectCache.prototype.find = function(keys, makearr) {
  if (!(keys instanceof Array)) {
    keys = [keys];
  }
  var r = new Array(2);
  r[0] = (makearr ? [] : {});
  for (var i = 0; i < keys.length; i++) {
    if (this.data[keys[i]]) {
      if (makearr) {
        r[0].push(this.data[keys[i]]);
      } else {
        r[0][keys[i]] = this.data[keys[i]];
      }
    } else {
      if (!r[1]) {
        r[1] = [keys[i]];
      } else {
        r[1].push(keys[i]);
      }
    }
  }
  return r;
};

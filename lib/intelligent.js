
var _ = require('underscore'),
  levenshtein = require('fast-levenshtein'),
  common = require('./../lib/common');

var calcSimilarity = function (title1, title2) {
    var distance = levenshtein.get(title1, title2);
    var s = 1 - (distance / Math.max(title1.length, title2.length));
    return s;
};

var calcSimilarityByTitle = function (title1, title2) {
    var s = 0;
    var t1arr;
    if (typeof title1 == 'string') {
        t1arr = common.title_split(title1);
    } else if (title1 instanceof Array) {
        t1arr = title1;
    } else {
        return s;
    }
    var t2arr = common.title_split(title2);
    if (t1arr && t2arr && t1arr.length && t2arr.length) {
        for (var i = 0; i < t1arr.length; i++) {
            if (t2arr.indexOf(t1arr[i]) >= 0) {
                s++;
            }
        }
    }
    return s;
};

var calcSimilarityByFiles = function (files1, files2) {
  // [ files, size ]
  const allowsize = ['MB', 'GB', 'PB'];
  function get_new_files_array(files) {
    var nf = [];
    // calc size type
    var isizetype = -1, allsame = true;
    for (var i = 0; i < files.length; i++) {
      if (files[i] instanceof Array) {
        var unit = files[i][1].split(' ')[1];
        var iunit = allowsize.indexOf(unit);
        if (iunit >= 0) {
          if (isizetype != -1 && isizetype != iunit) {
            allsame = false;
            break;
          }
          isizetype = iunit;
        }
      }
    }

    for (var i = 0; i < files.length; i++) {
      if (files[i] instanceof Array) {
        var fizeinfos = files[i][1].split(' ');
        if (!fizeinfos) continue;
        var unit = fizeinfos[1];
        var iunit = allowsize.indexOf(unit);
        if (iunit >= 0) {
          var size = parseFloat(fizeinfos[0]);
          if (!allsame) size *= Math.pow(1000, iunit);
          nf.push([files[i][0], size]);
        }
      } else if (typeof files[i] === 'string') {
        nf.push([files[i], 1]);
      }
    }
    return nf;
  }

  function get_files_array_size(files) {
    var totalsize = 0;
    for (var i = 0; i < files.length; i++) {
      totalsize += files[i][1];
    }
    return totalsize;
  }

  var nf1 = get_new_files_array(files1), nf2 = get_new_files_array(files2);
  if (nf1.length === 1 && nf2.length === 1) {
    return calcSimilarity(nf1[0][0], nf2[0][0]);
  } else if (nf1.length >= 1 && nf2.length >= 1) {
    if (nf1.length === 1 || nf2.length === 1) {
      if (nf2.length === 1) {
        // swap to make sure nf1.length === 1
        var tnf = nf1;
        nf1 = nf2;
        nf2 = tnf;
      }
      var hasSplash = (nf1[0][0].indexOf('/') >= 0);
      if (!hasSplash) {
        // remove splash for nf2
        for (var i = 0; i < nf2.length; i++) {
          var ti = nf2[i][0].lastIndexOf('/');
          if (ti >= 0) {
            nf2[i][0] = nf2[i][0].substr(ti + 1);
          }
        }
      }
      // compare average
      var totalsize = 0;
      var s = 0;
      for (var i = 0; i < nf2.length; i++) {
        totalsize += nf2[i][1];
        s += nf2[i][1] * calcSimilarity(nf1[0][0], nf2[i][0]);
      }
      s /= totalsize;
      return s;
    } else {
      var totalsize = 0;
      var t1 = get_files_array_size(nf1);
      var t2 = get_files_array_size(nf2);
      totalsize = t1 * t2;

      var s = 0;
      for (var i = 0; i < nf1.length; i++) {
        for (var j = 0; j < nf2.length; j++) {
          s += (nf1[i][1] * nf2[j][1] / totalsize)
            * calcSimilarity(nf1[i][0], nf2[j][0]);
        }
      }
      return s;
    }
  }

  // zero similarity
  return 0;
};

var predictTitle = function (orig_title, orig_files, new_files) {
  return '';
};

module.exports = {
  calcSimilarity: calcSimilarity,
  calcSimilarityByFiles: calcSimilarityByFiles,
  predictTitle: predictTitle
};

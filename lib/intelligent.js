
var _ = require('underscore'),
  levenshtein = require('leven'),
  common = require('./../lib/common');

var calcSimilarity = function (title1, title2) {
    var distance = levenshtein(title1, title2);
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
      var hasSplash = (nf1[0][0].indexOf('/') >= 0 || nf1[0][0].indexOf('\\') >= 0);
      if (!hasSplash) {
        // remove splash for nf2
        for (var i = 0; i < nf2.length; i++) {
          var ti = nf2[i][0].lastIndexOf('/');
          if (ti < 0) {
            ti = nf2[i][0].lastIndexOf('\\');
          }
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

// from github: https://github.com/SenYu/grunt-incrediff/blob/master/tasks/lib/newLcs.js
// author SenYu

function lcsDiff(o, n) {
    /**
     * @description 时间、空间复杂度均为O(N^2)，在 dp 中存储编辑距离， 在 step 中存储具体路径，然后进行一些处理把差异规则化
     * @param {string} o 源字符串
     * @param {string} n 新字符串
     * @return {object} 差异数据对象
     */
    var OP_ADD = 1, OP_DEL = 2, OP_MOD = 3, OP_EQUAL = 0;

    var oLen = o.length, nLen = n.length;
    var id   = String.prototype.charAt;

    var dp   = init2DArray( oLen+1, nLen+1, true);
    //dp 已初始化好，dp需要把 第一行列 初始化好
    var step = init2DArray( oLen+1, nLen+1 );

    //初始化 step
    for( var i = 1; i <= oLen ; i++ )
        step[ i ][0] = OP_DEL;
    for( var j = 1; j <= nLen ; j++ )
        step[0][ j ] = OP_ADD;

    //动态规划 在step中生成路径
    for ( var i = 1 ; i <= oLen ; i++ ) {
        for ( var j = 1 ; j <= nLen ; j++ ) {
            var InEqual = id.call( o, i-1 ) !== id.call( n, j-1 ) ? 1 : 0;
            var eleArr  = [
                    dp[ i-1 ][ j ] + 0  ,   //删除
                    dp[ i ][ j-1 ] + 1  ,   //新增
                    dp[ i-1 ][ j-1 ] + InEqual    // 0:相同不变, 1:不同修改
                ];
            //路径记录
            switch( minimum( eleArr ) ) {       //在数组中找到最小的元素的序号
                case 0:
                    dp[i][j]   = eleArr[ 0 ];   //删除
                    step[i][j] = OP_DEL;
                    break;
                case 1:
                    dp[i][j]   = eleArr[ 1 ];   //新增
                    step[i][j] = OP_ADD;
                    break;
                case 2:
                    dp[i][j]   = eleArr[ 2 ];   //修改 或 不变
                    step[i][j] = InEqual ? OP_MOD : OP_EQUAL;
                    break;
            }
        }
    }

    //解析路径(跟着走一遍)
    var infoPaths = buildPaths( oLen, nLen, o, n, step );
    //转换成差异队列
    var diffQueue = buildDiff(infoPaths);

    //合并差异队列
    return { diff: concatDiff(diffQueue), chunkSize: 1 };

    /**
     * @description 进行动态规划时的 数组初始化
     * @param {number} I 数组一维大小，源字符串长度
     * @param {number} J 数组二维大小，新字符串长度
     * @param {boolean} dp TRUE: 还要额外执行数据初始化，FALSE: 只建立二维数组
     * @return {array} ret 动态规划数组
     */
    function init2DArray(I, J, dp) {
        var ret = [];
        for ( var i = 0 ; i < I; i ++ ) {
            ret[ i ] = new Array(J);
            if (dp) ret[ i ][ 0 ] = i;
        }
        if (dp) {
            for ( var j = 0 ; j < J ; j++ ) {
                ret[ 0 ][ j ] = j;
            }
        }
        return ret;
    }

    /**
     * @description 寻找arg这个数组中最小的那个
     * @param {array} arg 被查询的数组
     * @return {number} 最小元素的index
     */
    function minimum(arg) {
        var min = 0;
        for ( var i = 0; i < arg.length; i++ ) {
            if ( arg[i] < arg[ min ] ) min = i;
        }
        return min;
    }

    /**
     * @description 由于路径是逆序记录在二维数组中的，需要重新遍历路径才能得到一维的编辑路径
     * @param {number} i 数组一维大小，源字符串长度
     * @param {number} j 数组二维大小，新字符串长度
     * @param {string} o 源字符串
     * @param {string} n 新字符串
     * @param {object} step 路径二维数组
     * @return {array} infoQueue 路径一维数据，MOD/EQUAL/DEL/ADD
     */
    function buildPaths(i, j, o, n, step) {
        var infoQueue = [];
        var id = String.prototype.charAt;
        var OP_ADD = 1, OP_DEL = 2, OP_MOD = 3, OP_EQUAL = 0;

        //从数组 [oLen][nLen] -> 一直走到 [0][0] break

        while ( true ) {
            if ( !i && !j ) break;
            switch( step[i][j] ) {
                case OP_MOD:
                    infoQueue.unshift( {
                        type: OP_MOD,
                        data: [ id.call(o, i-1), id.call(n, j-1) ]
                    } )
                    i -= 1; j -= 1;
                    break;
                case OP_EQUAL:
                    infoQueue.unshift( {
                        type: OP_EQUAL,
                        data: null
                    } )
                    i -= 1; j -= 1;
                    break;
                case OP_DEL:
                    infoQueue.unshift( {
                        type: OP_DEL,
                        data: [ id.call(o, i-1) ]   //其实并不用关心del哪个元素
                    } )
                    i -= 1;
                    break;
                case OP_ADD:
                    infoQueue.unshift( {
                        type: OP_ADD,
                        data: [ id.call(n, j-1) ]
                    } )
                    j -= 1;
                    break;
            }
        }

        return infoQueue;
    }

    /**
     * @description 处理之前构造的一维路径数组,把MOD/EUQALL/DEL/ADD,转换成 和newChunk一样的形式
     * @param {array} infoPaths 构造的一维路径数组
     * @return {array} diffQueue 基本差异数组,还没有优化过
     */
    function buildDiff(infoPaths) {
        var originIndex = 0;
        var diffQueue = [];
        var OP_ADD = 1, OP_DEL = 2, OP_MOD = 3, OP_EQUAL = 0;

        for ( var i = 0, len = infoPaths.length; i < len ; i ++ ) {
            var info = infoPaths[ i ];

            switch( info.type ) {
                case OP_ADD:
                    diffQueue.push( info.data[ 0 ] );
                    break;
                case OP_DEL:
                    originIndex ++;
                    break;
                case OP_EQUAL:
                    diffQueue.push( [ originIndex, 1 ] );
                    originIndex ++;
                    break;
                case OP_MOD:
                    diffQueue.push( info.data[ 1 ] );
                    originIndex ++;
                    break;
            }
        }

        return diffQueue;
    }

    /**
     * @description 把生成的差异数组中符合一定条件的相邻项进行合并,同newChunk中的concatDiffBlock,合并相邻 数组或相邻字符
     * @param {array} diffQueue 基本差异数组,还没有优化过
     * @return {array} sequence 优化完成的数组
     */
    function concatDiff(diffQueue) {
        var countIndex     = 0;
        var lastMatchIndex = -2;
        var matchIndex     = 0;
        var sequence       = [];
        var countChar      = 0;
        var preChar        = '';

        for ( var i = 0, len = diffQueue.length; i < len ; i ++ ) {
            var d = diffQueue[ i ];

            if ( typeof d === 'string' ) {
                //回填 分块信息
                if ( countIndex ) {
                    sequence.push( [ matchIndex, countIndex ] );
                }
                countIndex = 0;

                //记录字串
                preChar += d;
                countChar ++;
            }
            else {
                //回填 字串
                if ( countChar ) {
                    sequence.push( preChar );
                }
                preChar = '';
                countChar = 0;

                //记录 分块信息
                if ( lastMatchIndex + 1 !== d[ 0 ] ) {
                    if ( countIndex ) {
                        sequence.push( [ matchIndex, countIndex ] );
                    }
                    countIndex = 0;
                }
                if ( !countIndex )
                    matchIndex = d[ 0 ];
                lastMatchIndex = d[ 0 ];
                countIndex ++;
            }
        }
        //回填
        if ( countIndex ) {
            sequence.push( [ matchIndex, countIndex ] );
        }
        if ( countChar ) {
            sequence.push( preChar );
        }

        return sequence;
    }
}

function mergeDiff(o, diff) {
    var len = diff.length,
        diffItem,
        retStr = [],
        i;
        chunkSize = 1;
    for ( i = 0 ; i < len ; i++ ) {
        diffItem = diff[i];
        if ( typeof diffItem === 'string' ) {
            retStr.push( diffItem );
        }
        else if ( diffItem.length == 1) {
            retStr.push( hash[ diffItem[ 0 ] ] );
        }
        else {
            retStr.push( o.substr( diffItem[ 0 ] * chunkSize, diffItem[ 1 ] * chunkSize ) );
        }
    }
    return retStr.join('');
}

var predictTitle = function (orig_title, orig_files, new_files) {
  if (!orig_title) {
    return '';
  }

  function common_predict(new_filename) {
    var fn_epi_regex = /\[(\d+)(v\d|\.\d)?\]/i;
    var episode_regex = /([\[\s第]|OVA|OAD)(\d+)(v\d|\.\d)?([\]\[\s话|話])/i;
    var vol_regex = /vol\.(\d+)/i;
    var m = orig_title.match(episode_regex);
    if (m && m[2]) {
      var newstr;
      if (new_filename) {
        var m2 = new_filename.match(fn_epi_regex);
        if (m2 && m2[1]) {
          newstr = m2[1] + (m2[2] ? m2[2] : '');
        }
      }
      if (!newstr) {
        var newepisode = parseInt(m[2]) + 1;
        var newstr = newepisode.toString();
        while (newstr.length < m[2].length) {
          newstr = '0' + newstr;
        }
      }
      return orig_title.replace(episode_regex, "$1" + newstr + "$4");
    }
    return '';
  }

  if (!orig_files || !new_files
      || !orig_files.length || !new_files.length) {
    return common_predict();
  }

  function get_content_filename(content) {
    if (content instanceof Array) {
      return content[0];
    } else if (typeof content === 'string') {
      return content;
    } else {
      return '';
    }
  }

  function find_similar_content(base, contents) {
    var filename = '';
    if (contents.length > 1) {
      var maxs = 0;
      // find the most similar filename
      for (var i = 1; i < contents.length; i++) {
        var fn = get_content_filename(contents[i]);
        if (fn) {
          var s = calcSimilarity(base, fn);
          if (s > maxs) {
            maxs = s;
            filename = fn;
          }
        }
      }
    } else {
      filename = get_content_filename(contents[0]);
    }
    return filename;
  }

  function array_len_add(a1, a2) {
    return [a1[0] + a2[0], a2[1]];
  }

  var orig_filename = find_similar_content(orig_title, orig_files);
  if (!orig_filename) {
    return common_predict();
  }
  var new_filename = find_similar_content(orig_filename, new_files);
  if (!new_filename) {
    return common_predict();
  }

  if (orig_filename.length !== new_filename.length) {
    // TODO: add unequal length predict
    //return common_predict(new_filename);
    var d1 = lcsDiff(orig_filename, new_filename);
    if (d1.diff.length >= 3) {
      var diffstart, i0;
      for (var i = 1; i < d1.diff.length; i++) {
        if (d1.diff[i] instanceof Array) {
          diffstart = d1.diff[i];
          i0 = i;
          break;
        }
      }
      if (!diffstart) {
        return common_predict(new_filename);
      }
      var dd, i0;
      var d2 = lcsDiff(orig_filename, orig_title);
      for (var i = 0; i < d2.diff.length; i++) {
        if (d2.diff[i] instanceof Array
            && d2.diff[i][0] <= diffstart[0]
            && (d2.diff[i][0] + d2.diff[i][1]) >= (diffstart[0] + diffstart[1])) {
          // find the first similar part
          i0 = i;
          dd = d2.diff[i];
          break;
        }
      }
      if (dd) {
        var s1 = String.prototype.substr.apply(orig_filename, dd);
        var s2 = String.prototype.substr.apply(new_filename, dd);
        var d3 = lcsDiff(s1, s2);
        if (d3.diff.length > 1) {
          var dellen = 0, delstr = '';
          if (d3.diff[d3.diff.length - 1] instanceof Array) {
            dellen = s1.length - (d3.diff[d3.diff.length - 1][0] + d3.diff[d3.diff.length - 1][1]);
            delstr = s1.substr(s1.length - dellen);
          } else {
            // TODO: alog need update
            return common_predict(new_filename);
            //dellen = -d3.diff[d3.diff.length - 1].length;
          }
          for (var j = 0; j < d3.diff.length; j++) {
            if (d3.diff[j] instanceof Array) {
              d3.diff[j][0] += dd[0];
            }
          }
          for (var j = i0 + 1; j < d2.diff.length; j++) {
            if (d2.diff[j] instanceof Array) {
              d2.diff[j][0] += dellen;
            }
          }
          // replace elements
          Array.prototype.splice.apply(d2.diff, [i0, 1].concat(s2 + delstr));
          //console.log(orig_title, '\n', orig_filename, '\n', new_filename, '\n', d1, '\n', d2);
          return mergeDiff(new_filename, d2.diff);
        }
      }
    }
  } else {
    // equal length predict
    var d1 = lcsDiff(orig_filename, orig_title);
    return mergeDiff(new_filename, d1.diff);
  }

  return common_predict(new_filename);
};

module.exports = {
  calcSimilarity: calcSimilarity,
  calcSimilarityByFiles: calcSimilarityByFiles,
  predictTitle: predictTitle
};

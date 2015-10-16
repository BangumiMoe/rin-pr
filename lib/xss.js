
var xss = require('xss');
var h2b = require('html2bbcode'),
  HTMLTag = h2b.HTMLTag,
  HTMLStack = h2b.HTMLStack,
  HTML2BBCode = h2b.HTML2BBCode;

var conv = new HTML2BBCode();
var htag = new HTMLTag();

var styleWhiteList = {
  'font-size': { },
  'font-weight': { }, // ignore: [ 'normal' ]
  //'font-family': { quote: true },
  'font-style': { ignore: [ 'normal' ] },
  'text-align': { },
  'color': { color: true, ignore: [ 'black', '#000', '#000000' ] },
  'background-color': { color: true, ignore: [ 'white', '#fff', '#ffffff' ] },
  'width': { intag: [ 'img', 'video', 'p', 'table', 'div' ] },
  'height': { intag: [ 'img', 'video' ] },
  'display': { intag: [ 'span' ] },
  'line-height': { intag: [ 'p' ] },
  'margin': { intag: [ 'p', 'table' ] },
  'margin-top': { intag: [ 'p', 'table' ] },
  'margin-left': { intag: [ 'p', 'table' ] },
  'margin-right': { intag: [ 'p', 'table' ] },
  'margin-bottom': { intag: [ 'p', 'table' ] },
};

/**
 * XSS Setup
 */
var xssOptions = {
  whiteList: {
    h1:     [],
    h2:     [],
    h3:     [],
    h4:     [],
    h5:     [],
    h6:     [],
    hr:     [],
    span:   ['style'],
    font:   ['color', 'size', 'face', 'style'],
    strong: [],
    b:      [],
    i:      [],
    u:      [],
    del:    [],
    br:     [],
    p:      ['style'],
    pre:    ['class'],
    code:   [],
    a:      ['target', 'href', 'title'],
    img:    ['src', 'alt', 'title', 'style', 'width', 'height'],
    div:    [],
    table:  ['border'], //'width',
    colgroup: ['align', 'span', 'valign', 'width'],
    col:    ['align', 'span', 'valign', 'width'],
    tr:     [],
    td:     ['width', 'colspan'],
    th:     ['width', 'colspan'],
    tbody:  [],
    thead:  [],
    ul:     [],
    li:     [],
    ol:     [],
    dl:     [],
    dt:     [],
    em:     [],
    cite:   [],
    section: [],
    header: [],
    footer: [],
    blockquote: [],
    audio:  ['autoplay', 'controls', 'loop', 'preload', 'src'],
    video:  ['autoplay', 'controls', 'loop', 'preload', 'src', 'height', 'width']
  },
  onTagAttr: function (tag, name, value, isWhiteAttr) {
    if (isWhiteAttr && name === 'style') {
      var val = '';
      var css = htag.parseStyle(value);
      if (css) {
        for (var k in css) {
          if (k in styleWhiteList) {
            var rule = styleWhiteList[k];
            if (rule.color) {
              css[k] = conv.color(css[k]).toLowerCase();
            }
            if (rule.ignore && rule.ignore.length > 0) {
              // ignore style
              if (rule.ignore.indexOf(css[k]) >= 0) {
                continue;
              }
            }
            if (rule.intag && rule.intag.length > 0) {
              if (rule.intag.indexOf(tag) < 0) {
                continue;
              }
            }
            if (rule.quote) {
              css[k] = '\'' + css[k].replace(/(['\\])/g, '\\$1') + '\'';
            }

            if (val) {
              val += ';';
            }
            val += k + ':' + css[k];
          }
        }
        if (val) {
          // function safeAttrValue (tag, name, value)
          val = xss.safeAttrValue(tag, name, val);
          val = 'style=' + JSON.stringify(val);
        }
      }
      return val;
    }
  }
};

/**
 * XSS filter
 *
 * @param {string} html
 * @return {string}
 */
module.exports = function (html) {
  html = HTMLStack.minify(html);
  return xss(html, xssOptions);
};

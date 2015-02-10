
var xss = require('xss');

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
    table:  ['width', 'border'],
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
  }
};

/**
 * XSS filter
 *
 * @param {string} html
 * @return {string}
 */
module.exports = function (html) {
  return xss(html, xssOptions);
};

"use strict";

/**
 * public/rin-jq.js
 * Rin prpr!
 *
 * rin-pr project jquery script
 * WE LOVE ACG
 *
 * */

$(document).ready(function () {
  $('html').removeClass('no-js');

  var bangumi_top_title = -1;
  $(window).scroll(function () {
      var scrollTop = $(this).scrollTop();
      /*if (scrollTop > 32) {
        $('#header').addClass('fixed-header');
      } else {
        $('#header').removeClass('fixed-header');
      }*/
      if (scrollTop > 100) {
          $('.scrollup').fadeIn();
      } else {
          $('.scrollup').fadeOut();
      }

      var bl = $('.bangumi-show');
      if (bl && bl.length) {
        var headers = bl.find('> section > md-toolbar');
        var lasti = -1;
        for (var i = 0; i < headers.length; i++) {
          if (scrollTop >= $(headers[i]).offset().top) {
            lasti = i;
          } else {
            break;
          }
        }
        if (lasti == 0) {
          var th = bl.find('> md-toolbar');
          if (th && th.length) {
            if (scrollTop <= th.offset().top + 64) {
              lasti = -1;
            }
          }
        } else if (lasti > 0) {
          if (scrollTop <= $(headers[lasti]).parent().offset().top - 64) {
            lasti--;
          }
        }
        if (bangumi_top_title >= 0 && bangumi_top_title != lasti) {
          $(headers[bangumi_top_title]).attr('style', '').removeClass('bangumi-top-title');
          bangumi_top_title = -1;
        }
        if (lasti >= 0 && bangumi_top_title != lasti) {
          var w = $(headers[(lasti == 0 ? lasti + 1 : lasti - 1)]).width();
          bangumi_top_title = lasti;
          $(headers[lasti]).css('width', w + 'px').addClass('bangumi-top-title');
        }
      }
  });
  $('.scrollup .fab').click(function () {
      $("html, body").animate({
          scrollTop: 0
      }, 600);
      return false;
  });
});

function rejustifyImagesInTorrentDetails() {
  var intro = $('.torrent-info .torrent-introduction');
  if (intro && intro.length > 0) {
    var imgs = intro.find('img');
    if (imgs && imgs.length > 0) {
      var width = intro.width();
      for (var i = 0; i < imgs.length; i++) {
        var style = $(imgs[i]).attr('style');
        if (style) {
          var mw = style.match(/width\s*?:\s*?([0-9]*?)px/i);
          var mh = style.match(/height\s*?:\s*?([0-9]*?)px/i);
          if (mw && mh) {
            var w = parseInt(mw[1]);
            var h = parseInt(mh[1]);
            if (w && h && w > width) {
              h = Math.round(h * width / w);
              w = width;
              $(imgs[i])
                .css('width', w + 'px')
                .css('height', h + 'px');
            }
          }
        }
      }
    }
  }
}

function buildTreeview(content) {
  if (!(content instanceof Array)) {
    return {};
  }
  var id = 0;
  var tree = {id: id++, text: 'root'};
  for (var k = 0; k < content.length; k++) {
    var filename = '';
    var filesize = '';
    if (content[k] instanceof Array) {
      //filename, filesize
      filename = content[k][0];
      filesize = content[k][1];
    } else {
      //only filename
      filename = content[k];
    }
    var paths = filename.split('/');
    var location = tree;
    for (var i = 0; i < paths.length - 1; i++) {
      if (!location.item) {
        location.item = [];
      }
      var found = false;
      for (var j = 0; j < location.item.length; j++) {
        if (location.item[j].text == paths[i]) {
          location = location.item[j];
          found = true;
          break;
        }
      }
      if (!found) {
        location.item.push({id: id++, text: paths[i]});
        location = location.item[location.item.length - 1];
      }
    }
    if (!location.item) {
      location.item = [];
    }
    location.item.push({
      id: id++,
      text: paths[paths.length - 1] + (filesize ? ' <span class="filesize">' + filesize + '</span>' : '')
    });
  }
  return tree;
}

if (navigator.userAgent.indexOf('MSIE') !== -1
  || navigator.userAgent.indexOf('Trident') !== -1) {
  //alert('Sorry! We don\'t support IE now, even IE11 had some problems.');
  //window.location = "http://outdatedbrowser.com/";
  $('html').addClass('msie');
}

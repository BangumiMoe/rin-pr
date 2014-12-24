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
        }
        if (bangumi_top_title >= 0 && bangumi_top_title != lasti) {
          $(headers[bangumi_top_title]).attr('style', '').removeClass('bangumi-top-title');
          bangumi_top_title = -1;
        }
        if (lasti >= 0) {
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

if (navigator.userAgent.indexOf('MSIE') !== -1
  || navigator.userAgent.indexOf('Trident') !== -1) {
  alert('Sorry! We don\'t support IE now, even IE11 had some problems.');
  window.location = "http://outdatedbrowser.com/";
}
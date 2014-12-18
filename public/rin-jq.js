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
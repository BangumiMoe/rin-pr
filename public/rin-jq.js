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
  $(window).scroll(function () {
      var scrollTop = $(this).scrollTop();
      if (scrollTop > 32) {
        $('#header').addClass('fixed-header');
      } else {
        $('#header').removeClass('fixed-header');
      }
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
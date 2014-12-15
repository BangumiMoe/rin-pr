
var gm = require('gm');
var im = gm.subClass({ imageMagick: true });

function thumb(infile, outfile) {
  return function (callback) {
    im(infile)
      .setFormat("jpg")
      .thumb(128, 128, outfile, 100, 'center', function (err) {
        if (callback) callback(err);
      });
  };
}

function small_cover(infile, outfile) {
  return function (callback) {
    im(infile)
      .setFormat("jpg")
      .thumb(640, 360, outfile, 100, 'center', function (err) {
        if (callback) callback(err);
      });
  };
}

exports.thumb = thumb;
exports.small_cover = small_cover;

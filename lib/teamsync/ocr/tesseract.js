
var fs = require('fs');
var path = require('path');
var hat = require('hat');
var validator = require('validator');
var PNG = require('pngjs').PNG;
var spawn = require('child_process').spawn;

function OCRTesseract(opts) {
  this.command = opts.command;
  this.tmp_dir = opts.tmp_dir;
}

OCRTesseract.prototype.ocr = function (image_buf, word_count, callback) {
  var png = new PNG({ colorType: 2 });
  var that = this;
  png.parse(image_buf, function (err, data) {
    if (err) {
      return callback(err);
    }

    for (var y = 0; y < png.height; y++) {
      for (var x = 0; x < png.width; x++) {
        var idx = (png.width * y + x) << 2;
        // mode L
        var gray = (png.data[idx]*299 + png.data[idx+1]*587 + png.data[idx+2]*114) / 1000;
        var c = gray > 180 ? 255 : 0;
        png.data[idx] = c;
        png.data[idx+1] = c;
        png.data[idx+2] = c;
        png.data[idx+3] = 255;
      }
    }
    var filePath = path.join(that.tmp_dir, hat() + '.png')
    png.pack().pipe(fs.createWriteStream(filePath))
      .on('error', function (err) {
        fs.unlink(filePath, function (err) {
          if (err) {
            console.error('unlink png error:', err)
          }
        })
        callback(err);
      })
      .on('finish', function () {
        var tesseract = spawn(that.command, [filePath, "stdout", "--psm", "6", "--dpi", "70"]);
        var stdout = '', stderr = '';
        tesseract.stdout.on('data', function (data) {
          stdout += data;
        });
        tesseract.stderr.on('data', function (data) {
          stderr += data;
        });
        tesseract.on('close', function (code) {
          fs.unlink(filePath, function (err) {
            if (err) {
              console.error('unlink png error:', err)
            }
          })
          if (code !== 0) {
            // error
            callback(new Error(stderr));
            return;
          }
          stdout = validator.trim(stdout.substr(0, stdout.length - 1)).replace(/ /g, '');
          callback(null, stdout);
        });
      });
  });
}

module.exports = OCRTesseract;

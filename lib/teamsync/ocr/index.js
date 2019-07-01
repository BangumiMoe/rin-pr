
var config = require('./../config');
var ocr_config = config.ocr;
// var OCRRuokuai = require('./ruokuai');
var OCRTesseract = require('./tesseract');

function ocr(image_buf, word_count, callback) {
  if (ocr_config.engine === 'ruokuai') {
    var ruokuai = new OCRRuokuai(ocr_config);
    ruokuai.ocr(image_buf, word_count, callback);
  } else if (ocr_config.engine === 'tesseract') {
    var opts = Object.assign({ tmp_dir: config.sys.tmp_dir }, ocr_config);
    var tes = new OCRTesseract(opts);
    tes.ocr(image_buf, word_count, callback);
  } else {
    callback(new Error('unsupported ocr engine'))
  }
}

exports.ocr = ocr;

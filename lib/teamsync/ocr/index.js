
var ocr_config = require('./../config').ocr;
var OCRRuokuai = require('./ruokuai');

function ocr(image_buf, word_count, callback) {
  var ruokuai = new OCRRuokuai(ocr_config);
  ruokuai.ocr(image_buf, word_count, callback);
}

exports.ocr = ocr;
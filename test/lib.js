require("should");

var common = require('./../lib/common');
var xss = require('./../lib/xss');

var name = "lib";

describe("common", function() {
  it("md5('a') should be '0cc175b9c0f1b6a831c399e269772661'", function() {
    common.md5('a').should.eql("0cc175b9c0f1b6a831c399e269772661");
  });
  it("is_empty_object({}) should be true", function() {
    common.is_empty_object({}).should.eql(true);
  });
});

describe("xss", function() {
  it("<script> should be escape", function() {
    xss('<script>alert("test")</script>').should.eql("&lt;script&gt;alert(\"test\")&lt;/script&gt;");
  });
  it("attr 'onload' should be remove", function() {
    xss('<img src="/test.jpg" onload="alert(\'test\')"/>').should.eql("<img src=\"/test.jpg\" />");
  });
});

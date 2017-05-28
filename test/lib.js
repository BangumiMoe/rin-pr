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
  it("<a> attr 'href' should be kept", function() {
    var links = [
      '<a href="https://www.example.com">example</a>',
      '<a href="ed2k://|file|eMule0.49c.zip|2868871|0F88EEFA9D8AD3F43DABAC9982D2450C|/">ed2k link</a>',
      '<a href="magnet:?xt=urn:btih:c12fe1c06bba254a9dc9f519b335aa7c1367a88a">magnet link</a>',
    ];
    for (var i = 0; i < links.length; i++) {
      xss(links[i]).should.eql(links[i]);
    }
  });
});

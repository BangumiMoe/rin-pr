
var config = require('./../config');

var logger = require('koa-logger'),
    session = require('koa-session'),
    router = require('koa-router');

var parse = require('co-body'),
    multipartparse = require('co-busboy');

module.exports = function (app) {

app.keys = config['security']['keyGrip'];

app.use(logger());

app.use(session({maxAge: config['security']['maxAge']}));

app.use(function *(next) {
  var have_files = false;
  if (this.request.is('multipart/*')) {
    var parts = multipartparse(this);
    var part;
    var body = {};
    var files = {};
    while (part = yield parts) {
      if (part.length) {
        // arrays are busboy fields
        body[part[0]] = part[1];
      } else {
        // otherwise, it's a stream
        /*var extName = path.extname(part.filename);
        var tmpFileName = makeuniqueid(16);
        var savepath = path.resolve(sys_config.tmp_dir + tmpFileName);
        part.pipe(fs.createWriteStream(savepath));

        files[part.fieldname] = {
          filename: part.filename,
          mimeType: part.mimeType,
          extname: extName,
          savename: tmpFileName,
          savepath: savepath
        };

        have_files = true;*/
      }
    }
    this.request.body = body;
    this.request.files = files;
  } else if ('POST' == this.method) {
    var body = yield parse.json(this); //, { limit: '1kb' }
    this.request.body = body;
  }

  yield next;

  /*if (have_files) {
    //delete tmp files
    var files = this.request.files;
    for (var k in files) {
      fs.unlink(files[k].savepath, function () {});
    }
  }*/
});

//JSON error handling
app.use(function *pageNotFound(next) {
    yield next;
    if (404 != this.status) return;
    this.status = 404;
    this.body = {
        errno: 404,
        message: 'Page Not Found'
    };
});

app.use(function *(next) {
    try {
        yield next;
    } catch (err) {
        this.status = 500;
        //TODO: only for dev
        this.body = {
            errno: 500,
            message: err.toString()
        };
    }
});

};
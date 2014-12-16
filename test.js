
/*var Users = require('./models').Users;

setTimeout(function () {
  var u = new Users({name: 'teng', password: '123456', email: 'test@email.com'});
  var gen = u.save();
  console.log(gen.next()); // 0
  console.log(gen.next()); // 1
}, 200);*/

var images = require('./lib/images');
images.thumb('20140915234706', '20140915234706')();

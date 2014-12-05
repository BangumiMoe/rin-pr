
function generator(obj) {
  for (var f in obj) {
    if (obj[f] instanceof Function) {
      this[f] = generator.create(f, obj[f], obj);
    } else {
      this[f] = obj[f];
    }
  }
}

generator.create = function (fname, func, obj) {
  return function () {
    var args = Array.prototype.slice.call(arguments);
    return function (callback) {
      args.push(callback);
      func.apply(obj, args);
    };
  };
};

module.exports = generator;
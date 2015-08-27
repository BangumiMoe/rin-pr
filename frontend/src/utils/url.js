function build(template, params, query) {
  return template.replace(/:(\w+)/g, function(_, name) {
      return encodeURIComponent(params[name]);
    }) + (query ? "?" + Object.keys(query).map(function(name) {
      return encodeURIComponent(name) + "=" + encodeURIComponent(query[name]);
    }).join("&") : "");
}

module.exports = {
  build
};

require("babel/polyfill");

Promise.all([
  new Promise(function(resolve) {
    if(typeof fetch == "undefined") {
      require.ensure([], function() {
        require("whatwg-fetch");
        resolve();
      }, "polyfill.fetch");
    } else {
      resolve();
    }
  }),
  new Promise(function(resolve) {
    if(typeof Intl == "undefined") {
      require.ensure([], function() {
        require("intl");
        resolve();
      }, "polyfill.intl");
    } else {
      resolve();
    }
  })
]).then(function() {
  require.ensure([], function() {
    require("immutable");
    require("redux");
    require("redux-thunk");
    require("react");
    require("react-redux");
    require("react-router");
    require("react-router/lib/BrowserHistory");
    require("react-intl");
    require("react-mixin");
    require("autobind-decorator");

    require.ensure([], function() {
      require("../assets/web/css/index.less");
      require("../view/web");
    }, "main");
  }, "vendor");
});

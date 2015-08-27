var React = require("react");
var {Provider} = require("react-redux");

var store = require("../../store");
var router = require("./router");

React.render((
  <Provider store={store}>
    {() => (
      router
    )}
  </Provider>
), document.body);

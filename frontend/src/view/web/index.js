var React = require("react");
var {Provider} = require("react-redux");

var store = require("../../store");
var router = require("./router");

var Intl = require("./components/intl");

React.render((
  <Provider store={store}>
    {() => (
      <Intl>
        {() => (
          router
        )}
      </Intl>
    )}
  </Provider>
), document.body);

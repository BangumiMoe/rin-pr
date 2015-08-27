var React = require("react");
var {Router, Route} = require("react-router");
var {history} = require("react-router/lib/BrowserHistory");

var routes = require("../../constants/routes");
var views = require("./views");

module.exports = (
  <Router history={history}>
    <Route path={routes["home"]} component={views.App}></Route>
  </Router>
);

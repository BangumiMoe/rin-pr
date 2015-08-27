var React = require("react");

class App extends React.Component {
  render() {
    return (
      <div className="ui-app">
        {this.props.children}
      </div>
    );
  }
}

module.exports = App;

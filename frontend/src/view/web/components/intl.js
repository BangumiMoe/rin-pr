var React = require("react");
var mixin = require("react-mixin").decorate;
var {connect} = require("react-redux");
var {IntlMixin} = require("react-intl");

var i18n = require("../../../constants/i18n");

@mixin(IntlMixin)
class Inner extends React.Component {
  render() {
    var children = this.props.children;
    if(typeof children == "function") {
      children = children();
    }
    return children;
  }
}

@connect((state) => ({
  language: state.language
}))
class Intl extends React.Component {
  render() {
    var language = this.props.language;
    var data = i18n[language];
    return (
      <Inner locales={[language]} formats={data.formats} messages={data.messages}>
        {this.props.children}
      </Inner>
    );
  }
}

module.exports = Intl;

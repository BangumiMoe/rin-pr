var {combineReducers} = require("redux");

module.exports = combineReducers({
  language: require("./reducers/language")
});

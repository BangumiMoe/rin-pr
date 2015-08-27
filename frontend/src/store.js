var {createStore, applyMiddleware, combineReducers} = require("redux");
var thunk = require("redux-thunk");

var reducers = require("./reducers");

var store = applyMiddleware(thunk)(createStore)(reducers);

module.exports = store;

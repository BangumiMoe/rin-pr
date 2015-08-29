function create(name, initial, func = {}) {
  return function(state, action) {
    state = state || initial;
    if(action && action.name == name) {
      if(typeof func[action.type] == "function") {
        return func[action.type](state, action);
      } else if(typeof func == "function") {
        return func(state, action);
      } else {
        return state;
      }
    } else {
      return state;
    }
  };
}

module.exports = {
  create
};

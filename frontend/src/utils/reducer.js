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

function promise(name) {
  return create(name, {
    loading: false,
    data: null,
    error: null
  }, {
    "start": function(state) {
      return {
        loading: true,
        data: state.data,
        error: state.error
      };
    },
    "complete": function(state, action) {
      return {
        loading: false,
        data: action.data,
        error: null
      };
    },
    "error": function(state, action) {
      return {
        loading: false,
        data: null,
        error: action.error
      };
    }
  });
}

module.exports = {
  create,
  promise
};

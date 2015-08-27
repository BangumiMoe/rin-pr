function promise(name, func) {
  return function(...args) {
    return function(dispatch) {
      dispatch({
        name: name,
        type: "start"
      });
      func(...args).then(function(data) {
        dispatch({
          name: name,
          type: "complete",
          payload: data
        });
      }).catch(function(data) {
        dispatch({
          name: name,
          type: "error",
          error: data
        });
      });
    };
  };
}

module.exports = {
  promise
};

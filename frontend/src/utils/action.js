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
          data: data
        });
      }).catch(function(error) {
        dispatch({
          name: name,
          type: "error",
          error: error
        });
      });
    };
  };
}

module.exports = {
  promise
};

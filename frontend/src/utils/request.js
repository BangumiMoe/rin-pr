function checkStatus(response) {
  if(response.status >= 200 && response.status < 300) {
    return response;
  } else {
    var error = new Error(response.statusText);
    error.status = response.status;
    error.response = response;
    throw error;
  }
}

function request(url, options) {
  return fetch(url, Object.assign({
    credentials: "include"
  }, options)).then(checkStatus);
}

module.exports = request;

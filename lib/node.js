if (typeof indexedDB != 'undefined') {
  module.exports = require('./idb.js');
}
else {
  module.exports = {
    open: function () {
      return Promise.reject('IDB requires a browser environment');
    },
    delete: function () {
      return Promise.reject('IDB requires a browser environment');
    }
  };
}

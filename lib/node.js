module.exports = {
  idb: {
    open: function () {
      return Promise.reject('Idb requires a browser environment')
    },
    delete: function () {
      return Promise.reject('Idb requires a browser environment')
    }
  }
};

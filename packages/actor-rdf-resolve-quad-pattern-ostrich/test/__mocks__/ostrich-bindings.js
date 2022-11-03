// Mocked OSTRICH package
let store;
module.exports = {
  __setMockedDocument: function(storeArg) {
    store = storeArg;
  },
  fromPath: function (file) {
    if (!file) {
      return Promise.reject(new Error('File not found'))
    } else {
      return Promise.resolve(store);
    }
  }
};

module.exports = function silken(app, opts = {}) {
  let count = 0;
  app.get(opts.path || '/handling', (req, res) => {
    res.send(String(count));
  });
  return function(req, res, next) {
    count++;
    res.on('finish', () => count--);
    next();
  };
};

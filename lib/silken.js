/**
 * Created by Cooper on 2019/03/21.
 */
module.exports = function silken(app, opts = {}) {
  let count = 0;
  let healthy = false;
  app.get(opts.handlingPath || '/silken_handling', (req, res) => {
    res.send(String(count));
  });
  app.get(opts.healthPath || '/health', (req, res) => {
    if (healthy) {
      res.send('healthy~~');
    } else {
      res.status(503).send('silken stopped');
    }
  });
  app.get(opts.stopPath || '/silken_stop', (req, res) => {
    healthy = false;
    res.send('stop ok');
  });
  app.get(opts.restartPath || '/silken_start', (req, res) => {
    healthy = true;
    res.send('start ok');
  });
  return function(req, res, next) {
    count++;
    res.on('finish', () => count--);
    next();
  };
};

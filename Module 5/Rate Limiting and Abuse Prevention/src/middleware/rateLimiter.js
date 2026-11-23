'use strict';
const rateLimit = require('express-rate-limit');

module.exports = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    const resetTime = req.rateLimit.resetTime;
    const retryAfter = resetTime
      ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
      : 15 * 60;

    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({ message: 'Too many requests, please try again later.' });
  },
});

// For multiple app instances, rate-limit-redis can replace the default store and
// keep counters in shared Redis. The in-memory store is per-process, so requests
// routed to different instances by a load balancer would have separate counters.

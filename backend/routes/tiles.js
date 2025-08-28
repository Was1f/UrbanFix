const express = require('express');
const https = require('https');

const router = express.Router();

// Simple proxy for OpenStreetMap tiles
// GET /tiles/:z/:x/:y.png
router.get('/:z/:x/:y.png', (req, res) => {
  const { z, x, y } = req.params;

  const upstreamUrl = `https://tile.openstreetmap.org/${encodeURIComponent(z)}/${encodeURIComponent(x)}/${encodeURIComponent(y)}.png`;

  const request = https.get(upstreamUrl, {
    headers: {
      'User-Agent': 'UrbanFixTileProxy/1.0 (+https://example.com)'
    },
  }, (upstream) => {
    if (upstream.statusCode && upstream.statusCode >= 400) {
      res.status(upstream.statusCode).end();
      upstream.resume();
      return;
    }

    res.setHeader('Content-Type', 'image/png');
    // Conservative caching; you can tune this
    res.setHeader('Cache-Control', 'public, max-age=86400');

    upstream.pipe(res);
  });

  request.on('error', (err) => {
    console.error('Tile proxy error:', err.message);
    res.status(502).json({ error: 'Bad Gateway', message: 'Failed to fetch upstream tile' });
  });
});

module.exports = router;



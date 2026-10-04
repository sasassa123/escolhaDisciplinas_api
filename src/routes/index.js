const express = require('express');
const productRoutes = require('./products');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'API running!' });
});

router.use('/products', productRoutes);

module.exports = router;

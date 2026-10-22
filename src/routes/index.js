const express = require('express');
const productRoutes = require('./products');
const portalRoutes = require('./portal');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'API running!' });
});

router.use('/products', productRoutes);
router.use('/', portalRoutes);

module.exports = router;

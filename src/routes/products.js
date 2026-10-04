const express = require('express');
const productController = require('../controllers/productController');
const validateProduct = require('../middlewares/validateProduct');

const router = express.Router();

router.get('/', productController.listProducts);
router.get('/:id', productController.getProductById);
router.post('/', validateProduct, productController.createProduct);

module.exports = router;

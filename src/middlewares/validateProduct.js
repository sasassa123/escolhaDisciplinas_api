/**
 * Valida o corpo da requisição antes de criar um produto.
 * Fica separado do controller para poder ser reutilizado em outras rotas (ex.: PUT).
 */
function validateProduct(req, res, next) {
  const { name, price } = req.body || {};
  if (typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'O campo name é obrigatório' });
  }

  if (typeof price !== 'number' || Number.isNaN(price) || price < 0) {
    return res.status(400).json({ error: 'O campo price deve ser um número maior ou igual a zero' });
  }

  next();
}

module.exports = validateProduct;
const products = [
  { id: 1, name: 'Resumo de Cálculo I', price: 0, description: 'Resumo completo da ementa de Cálculo I' },
  { id: 2, name: 'Provas antigas de Algoritmos', price: 0, description: 'Coletânea de provas dos últimos semestres' },
  { id: 3, name: 'Lista resolvida de Física II', price: 0, description: 'Lista de exercícios com resolução passo a passo' },
];

/**
 * GET /api/products — lista todos os produtos.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {void} Responde 200 com o array de produtos.
 */
function listProducts(req, res) {
  res.status(200).json(products);
}

/**
 * GET /api/products/:id — busca um produto pelo id.
 *
 * @param {import('express').Request} req Espera `req.params.id` numérico.
 * @param {import('express').Response} res
 * @returns {void} Responde 200 com o produto ou 404 se ele não existir.
 */
function getProductById(req, res) {
  const id = Number(req.params.id);
  const product = Number.isInteger(id)
    ? products.find((item) => item.id === id)
    : undefined;

  if (!product) {
    return res.status(404).json({ error: 'Produto não encontrado' });
  }

  return res.status(200).json(product);
}

/**
 * POST /api/products — cria um produto novo.
 *
 * @param {import('express').Request} req Espera `req.body` com `{ name, price, description? }`.
 * @param {import('express').Response} res
 * @returns {void} Responde 201 com o produto criado ou 400 com a lista de erros.
 */
function createProduct(req, res) {
  const { name, price, description } = req.body || {};
  const errors = [];

  if (typeof name !== 'string' || name.trim() === '') {
    errors.push('O campo name é obrigatório e deve ser um texto não vazio');
  }

  if (typeof price !== 'number' || Number.isNaN(price) || price < 0) {
    errors.push('O campo price é obrigatório e deve ser um número maior ou igual a zero');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Dados inválidos', details: errors });
  }

  const newProduct = {
    id: products.length > 0 ? products[products.length - 1].id + 1 : 1,
    name: name.trim(),
    price,
    description: typeof description === 'string' ? description.trim() : '',
  };

  products.push(newProduct);

  return res.status(201).json(newProduct);
}

module.exports = {
  products,
  listProducts,
  getProductById,
  createProduct,
};

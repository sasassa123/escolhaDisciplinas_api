const products = [
  { id: 1, name: 'Resumo de Cálculo I', price: 0, description: 'Resumo completo da ementa de Cálculo I' },
  { id: 2, name: 'Provas antigas de Algoritmos', price: 0, description: 'Coletânea de provas dos últimos semestres' },
  { id: 3, name: 'Lista resolvida de Física II', price: 0, description: 'Lista de exercícios com resolução passo a passo' },
];

function listProducts(req, res) {
  res.status(200).json(products);
}

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
  createProduct,
};

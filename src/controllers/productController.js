const products = [
  { id: 1, name: 'Resumo de Cálculo I', price: 0, description: 'Resumo completo da ementa de Cálculo I' },
  { id: 2, name: 'Provas antigas de Algoritmos', price: 0, description: 'Coletânea de provas dos últimos semestres' },
  { id: 3, name: 'Lista resolvida de Física II', price: 0, description: 'Lista de exercícios com resolução passo a passo' },
];

function listProducts(req, res) {
  res.status(200).json(products);
}

module.exports = {
  products,
  listProducts,
};

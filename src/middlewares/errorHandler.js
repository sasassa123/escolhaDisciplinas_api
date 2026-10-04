/**
 * Qualquer erro do Express que aconteça nas rotas vai cair aqui, e ele vai decidir
 * o que mostrar no log e o que devolver para o cliente.
 */
function errorHandler(error, req, res, next) {
  console.error(error.stack);
  const statusCode = error.statusCode || error.status || 500;
  const message = statusCode < 500 ? error.message : 'Erro interno do Servidor';
  res.status(statusCode).json({ error: message });
}

module.exports = errorHandler;
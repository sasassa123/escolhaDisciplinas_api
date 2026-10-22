/**
 * Qualquer erro do Express que aconteça nas rotas vai cair aqui, e ele vai decidir
 * o que mostrar no log e o que devolver para o cliente.
 */
function errorHandler(error, req, res, next) {
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'O arquivo enviado é maior que o limite permitido' });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido no corpo da requisição' });
  }

  const statusCode = error.statusCode || error.status || 500;
  if (statusCode >= 500) console.error(error.stack);
  const message = statusCode < 500 ? error.message : 'Erro interno do Servidor';
  const body = { error: message };
  if (statusCode < 500 && error.details) body.details = error.details;
  res.status(statusCode).json(body);
}

module.exports = errorHandler;

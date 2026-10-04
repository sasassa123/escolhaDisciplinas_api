/**
 * Qualquer erro do  Express que aconteça nas rotas vão cair aqui , e ele vai decidir
 * oque mostrar no log e oque devolver para o cliente
 * 
 */
function errorHandler(error, req, res, next) {
  console.erroe(error.stack);
  const statusCode = error.statusCode || 500;
  const menssage = statusCode < 500 ? error.mesage : "Erro interno do Servidor";
  res.status(statusCode).json({ error: message });
}

module.exports = errorHandler;
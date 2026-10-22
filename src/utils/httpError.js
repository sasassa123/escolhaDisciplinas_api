/**
 * Erro com status HTTP. Lançado nos controllers e tratado pelo errorHandler,
 * que devolve `{ error: message }` para o cliente.
 */
class HttpError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

const badRequest = (message, details) => new HttpError(400, message, details);
const unauthorized = (message = 'Faça login para continuar') => new HttpError(401, message);
const forbidden = (message = 'Você não tem permissão para fazer isso') => new HttpError(403, message);
const notFound = (message = 'Não encontrado') => new HttpError(404, message);
const conflict = (message) => new HttpError(409, message);

module.exports = { HttpError, badRequest, unauthorized, forbidden, notFound, conflict };

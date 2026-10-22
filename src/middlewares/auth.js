const { getDb } = require('../config/database');
const { unauthorized, forbidden } = require('../utils/httpError');

/**
 * Lê o token "Authorization: Bearer <token>" e coloca o usuário em req.user.
 * Rotas públicas continuam funcionando sem token (req.user fica null).
 */
function attachUser(req, res, next) {
  req.user = null;
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    const token = header.slice(7).trim();
    const db = getDb();
    const session = db.sessions.find((item) => item.token === token);
    if (session) req.user = db.users.find((user) => user.id === session.userId) || null;
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return next(unauthorized());
  next();
}

function requireModerator(req, res, next) {
  if (!req.user) return next(unauthorized());
  if (req.user.role !== 'moderator') return next(forbidden('Apenas moderadores podem acessar esta área'));
  next();
}

module.exports = { attachUser, requireAuth, requireModerator };

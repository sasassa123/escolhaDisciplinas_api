const { getDb, save, nextId } = require('../config/database');
const portal = require('../config/portal');
const { hashPassword, verifyPassword, randomToken } = require('../utils/password');
const { requireText } = require('../utils/text');
const { badRequest, unauthorized, forbidden, conflict, notFound } = require('../utils/httpError');
const present = require('../utils/present');

const FRONTEND_URL = () => (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();

function isInstitutionalEmail(email) {
  const domain = email.split('@')[1] || '';
  return domain === portal.emailDomain || domain.endsWith(`.${portal.emailDomain}`);
}

/**
 * Como o MVP não tem servidor de e-mail, o "envio" do link de confirmação é
 * simulado: o link aparece no console da API e, fora de produção, também volta
 * na resposta para o front-end poder exibi-lo.
 */
function sendConfirmation(user) {
  const link = `${FRONTEND_URL()}/confirmar-email?token=${user.confirmToken}`;
  console.log(`[e-mail simulado] Para: ${user.email} — confirme sua conta: ${link}`);
  return portal.exposeDevLinks ? { devConfirmationUrl: link } : {};
}

function createSession(db, user) {
  const token = randomToken();
  db.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
  save();
  return token;
}

/** POST /api/auth/register — cadastro restrito ao e-mail institucional (RF01). */
function register(req, res) {
  const db = getDb();
  const { name, email, password, period } = req.body || {};
  const errors = [];

  const cleanName = requireText(name, 'Nome', errors, { min: 3, max: 80 });
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    errors.push('Informe um e-mail válido');
  } else if (!isInstitutionalEmail(cleanEmail)) {
    errors.push(`Use seu e-mail institucional (@${portal.emailDomain})`);
  }
  if (typeof password !== 'string' || password.length < 8) {
    errors.push('A senha precisa ter pelo menos 8 caracteres');
  }
  const cleanPeriod = Number(period);
  if (!Number.isInteger(cleanPeriod) || cleanPeriod < 1 || cleanPeriod > 12) {
    errors.push('Informe o período atual (1 a 12)');
  }
  if (errors.length) throw badRequest(errors[0], errors);

  if (db.users.some((user) => user.email === cleanEmail)) {
    throw conflict('Já existe uma conta com este e-mail');
  }

  const user = {
    id: nextId('users'),
    name: cleanName,
    email: cleanEmail,
    passwordHash: hashPassword(password),
    role: 'student',
    course: portal.course,
    period: cleanPeriod,
    completedDisciplines: [],
    emailConfirmed: false,
    confirmToken: randomToken(24),
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  save();

  res.status(201).json({
    message: `Enviamos um link de confirmação para ${user.email}`,
    email: user.email,
    ...sendConfirmation(user),
  });
}

/** POST /api/auth/confirm — confirma o e-mail a partir do token do link. */
function confirmEmail(req, res) {
  const db = getDb();
  const token = String((req.body || {}).token || '');
  const user = token && db.users.find((item) => item.confirmToken === token);
  if (!user) throw notFound('Link de confirmação inválido ou já utilizado');

  user.emailConfirmed = true;
  user.confirmToken = null;
  const sessionToken = createSession(db, user);
  res.json({ token: sessionToken, user: present.privateUser(user) });
}

/** POST /api/auth/resend — reenvia o link de confirmação. */
function resendConfirmation(req, res) {
  const db = getDb();
  const email = String((req.body || {}).email || '').trim().toLowerCase();
  const user = db.users.find((item) => item.email === email);
  if (!user || user.emailConfirmed) {
    // Resposta genérica para não revelar quais e-mails existem
    return res.json({ message: 'Se houver uma conta pendente com este e-mail, um novo link foi enviado' });
  }
  user.confirmToken = randomToken(24);
  save();
  res.json({ message: `Enviamos um novo link para ${user.email}`, ...sendConfirmation(user) });
}

/** POST /api/auth/login */
function login(req, res) {
  const db = getDb();
  const { email, password } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const user = db.users.find((item) => item.email === cleanEmail);

  if (!user || !verifyPassword(String(password || ''), user.passwordHash)) {
    throw unauthorized('E-mail ou senha incorretos');
  }
  if (!user.emailConfirmed) {
    const error = forbidden('Confirme seu e-mail antes de entrar. Procure o link na sua caixa de entrada.');
    error.details = ['email_not_confirmed'];
    throw error;
  }

  res.json({ token: createSession(db, user), user: present.privateUser(user) });
}

/** POST /api/auth/logout */
function logout(req, res) {
  const db = getDb();
  const token = (req.headers.authorization || '').slice(7).trim();
  db.sessions = db.sessions.filter((session) => session.token !== token);
  save();
  res.status(204).end();
}

/** GET /api/auth/me */
function me(req, res) {
  res.json(present.privateUser(req.user));
}

module.exports = { register, confirmEmail, resendConfirmation, login, logout, me };

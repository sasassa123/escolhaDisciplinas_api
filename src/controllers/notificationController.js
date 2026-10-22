const { getDb, save, nextId } = require('../config/database');

/** Cria uma notificação para um usuário (sem salvar; quem chama faz o save). */
function notify(userId, type, message, link) {
  const db = getDb();
  db.notifications.push({
    id: nextId('notifications'),
    userId,
    type,
    message,
    link,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

/** GET /api/notifications */
function listNotifications(req, res) {
  const items = getDb().notifications
    .filter((n) => n.userId === req.user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 30);
  res.json({ items, unread: items.filter((n) => !n.read).length });
}

/** POST /api/notifications/read — marca todas (ou { id }) como lidas. */
function markRead(req, res) {
  const id = Number((req.body || {}).id);
  getDb().notifications.forEach((n) => {
    if (n.userId === req.user.id && (!id || n.id === id)) n.read = true;
  });
  save();
  res.status(204).end();
}

module.exports = { notify, listNotifications, markRead };

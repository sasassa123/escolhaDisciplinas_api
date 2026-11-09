const fs = require('fs');
const path = require('path');
const pool = require('./mysql');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const COLLECTIONS = [
  'users', 'sessions', 'disciplines', 'materials', 'reviews',
  'questions', 'answers', 'reports', 'notifications',
];

let db = null;
let pending = Promise.resolve();
let lastError = null;

function emptyDb() {
  return Object.fromEntries(COLLECTIONS.map((name) => [name, []]));
}

async function initialize() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  await pool.query(`CREATE TABLE IF NOT EXISTS app_state (
    id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
    payload LONGTEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_app_state_json CHECK (JSON_VALID(payload))
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  const [rows] = await pool.query('SELECT payload FROM app_state WHERE id = 1');
  if (rows.length) {
    db = JSON.parse(rows[0].payload);
  } else {
    // Importa o banco JSON existente uma única vez, quando disponível.
    const legacy = path.join(DATA_DIR, 'db.json');
    db = fs.existsSync(legacy)
      ? JSON.parse(fs.readFileSync(legacy, 'utf8'))
      : emptyDb();
    COLLECTIONS.forEach((name) => { if (!Array.isArray(db[name])) db[name] = []; });
    await pool.execute('INSERT INTO app_state (id, payload) VALUES (1, ?)', [JSON.stringify(db)]);
  }
  COLLECTIONS.forEach((name) => { if (!Array.isArray(db[name])) db[name] = []; });
  console.log('MySQL pronto: dados carregados do banco.');
}

function getDb() {
  if (!db) throw new Error('Banco MySQL ainda não inicializado');
  return db;
}

function save() {
  // Captura cada versão no momento da alteração e serializa as gravações.
  const snapshot = JSON.stringify(getDb());
  pending = pending.catch(() => {}).then(async () => {
    await pool.execute('UPDATE app_state SET payload = ? WHERE id = 1', [snapshot]);
    lastError = null;
  }).catch((err) => {
    lastError = err;
    console.error('Falha ao salvar dados no MySQL:', err);
    throw err;
  });
  return pending;
}

async function flush() {
  await pending;
  if (lastError) throw lastError;
}

function nextId(collection) {
  return getDb()[collection].reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

async function reset() {
  // Limpa apenas os registros do aplicativo; não apaga arquivos enviados.
  db = emptyDb();
  await save();
  return db;
}

module.exports = { initialize, getDb, save, flush, reset, nextId, UPLOAD_DIR };

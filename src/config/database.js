const fs = require('fs');
const path = require('path');

/**
 * "Banco de dados" do MVP: tudo fica em memória e é gravado em data/db.json
 * a cada alteração, para sobreviver a reinícios do servidor.
 * Na primeira execução (ou depois de `npm run seed`) o arquivo é criado com
 * os dados de exemplo de src/data/seed.js.
 */
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

const COLLECTIONS = [
  'users', 'sessions', 'disciplines', 'materials', 'reviews',
  'questions', 'answers', 'reports', 'notifications',
];

let db = null;

function ensureDirs() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function load() {
  ensureDirs();
  if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    COLLECTIONS.forEach((name) => { db[name] = db[name] || []; });
  } else {
    reset();
  }
  return db;
}

function reset() {
  ensureDirs();
  fs.readdirSync(UPLOAD_DIR).forEach((file) => fs.unlinkSync(path.join(UPLOAD_DIR, file)));
  // Carregado aqui para evitar dependência circular (o seed usa o UPLOAD_DIR)
  const { createSeed } = require('../data/seed');
  db = createSeed(UPLOAD_DIR);
  save();
  return db;
}

function save() {
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

function getDb() {
  return db || load();
}

function nextId(collection) {
  const items = getDb()[collection];
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

module.exports = { getDb, save, reset, nextId, UPLOAD_DIR };

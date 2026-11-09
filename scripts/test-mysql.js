require('dotenv').config();
const { initialize, getDb, save } = require('../src/config/database');
const pool = require('../src/config/mysql');

(async () => {
  await initialize();
  const db = getDb();
  console.log('MySQL conectado; coleções:', Object.fromEntries(Object.entries(db).map(([k,v])=>[k,v.length])));
  await save();
  const [rows] = await pool.query('SELECT JSON_VALID(payload) AS valid FROM app_state WHERE id = 1');
  if (!rows.length || !rows[0].valid) throw new Error('Persistência inválida');
  console.log('Persistência no MySQL verificada.');
  await pool.end();
})().catch((err) => { console.error(err); process.exit(1); });

// Recria data/db.json e data/uploads com os dados de exemplo (apaga o que existir).
require('dotenv').config();
const { reset } = require('../src/config/database');

const db = reset();
console.log(`Banco recriado: ${db.disciplines.length} disciplinas, ${db.users.length} usuários, ${db.materials.length} materiais.`);

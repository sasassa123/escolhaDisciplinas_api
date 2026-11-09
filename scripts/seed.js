require('dotenv').config();
const { initialize, reset } = require('../src/config/database');

(async () => {
  await initialize();
  await reset();
  console.log('Dados do aplicativo zerados no MySQL.');
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

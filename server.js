require('dotenv').config();
const { initialize } = require('./src/config/database');

const PORT = process.env.PORT || 3001;

initialize()
  .then(() => {
    const app = require('./src/app');
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Não foi possível iniciar o MySQL:', error);
    process.exitCode = 1;
  });

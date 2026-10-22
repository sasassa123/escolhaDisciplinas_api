const cors = require('cors');

// Vai liberar apenas o Frontend e não vai aceitar qualquer origem.
// FRONTEND_URL aceita mais de uma origem separada por vírgula.
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: allowedOrigins,
};

module.exports = cors(corsOptions);

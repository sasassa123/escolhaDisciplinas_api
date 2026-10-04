const cors = require('cors');

// Vai liberar apenas o Frontend e não vai aceitar qualquer origem
const corsOptions = {
    origin : process.env.FRONTEND_URL || 'http://localhost:5173',
};

module.exports = cors(corsOptions);
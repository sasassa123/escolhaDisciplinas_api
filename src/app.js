const express = require('express');
const corsMiddleware = require('./middlewares/cors');
const errorHandler = require('./middlewares/errorHandler');
const { attachUser } = require('./middlewares/auth');
const routes = require('./routes');

const app = express();

app.use(corsMiddleware);
// Uploads chegam em base64 dentro do JSON: 5 MB de arquivo viram ~6,7 MB de texto
app.use(express.json({ limit: '8mb' }));
app.use(attachUser);

app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.use(errorHandler);

module.exports = app;

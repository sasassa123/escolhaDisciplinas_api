const express = require('express');
const corsMiddleware = require('./middlewares/cors');
const errorHandler = require('./middlewares/errorHandler');
const { attachUser } = require('./middlewares/auth');
const { flush } = require('./config/database');
const routes = require('./routes');

const app = express();

app.use(corsMiddleware);
app.use(express.json({ limit: '8mb' }));

// Espera a persistência no MySQL antes de concluir a resposta HTTP.
// Mantém compatibilidade com os controllers síncronos existentes.
app.use((req, res, next) => {
  const originalEnd = res.end.bind(res);
  let ending = false;
  res.end = function (...args) {
    if (ending) return res;
    ending = true;
    flush()
      .then(() => originalEnd(...args))
      .catch((err) => {
        console.error('Erro de persistência MySQL:', err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.removeHeader('Content-Length');
          res.removeHeader('ETag');
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          originalEnd(JSON.stringify({ error: 'Erro ao salvar no banco de dados' }));
        } else {
          res.destroy(err);
        }
      });
    return res;
  };
  next();
});

app.use(attachUser);
app.use('/api', routes);
app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada' }));
app.use(errorHandler);

module.exports = app;

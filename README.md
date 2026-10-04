# Gangue do Patinete — API

Uma plataforma que reúne tudo o que o estudante precisa para escolher sua disciplina optativa : carga horária real, formato de avaliação, pré-requisitos e custos, relação com a carreira, avaliações verificadas de quem já cursou e vagas em tempo real com alerta e também uma lista de 1ª, 2ª e 3ª opções já validada contra o horário. Para a pós graduação, há uma área onde o estudande pode encontrar disciplinas que pode cursar em outras insituições e gera em PDF a documentação necessária para a solicitação.

## Stack
Node.js, Express, dotenv, cors, nodemon

## Como rodar
```bash
npm install
cp .env.example .env
npm run dev     # desenvolvimento (hot reload)
npm start       # produção
```
A API roda em http://localhost:3001

## Rotas
| Método | Rota | Descrição |
|---|---|---|
| GET | /api/health | Status da API |
| GET | /api/products | Lista produtos (mock) |
| POST | /api/products | Cria produto (exige name e price) |

## Estrutura de pastas
- `src/routes` — definição das rotas
- `src/controllers` — lógica de cada rota
- `src/middlewares` — CORS e tratamento de erros
- `src/config` — configurações (banco de dados futuramente)
- `server.js` — inicia o servidor
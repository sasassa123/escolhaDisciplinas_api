# Gangue do Patinete — API

Uma plataforma que reúne tudo o que o estudante precisa para escolher sua disciplina optativa: carga horária real, formato de avaliação, pré-requisitos e custos, relação com a carreira, avaliações verificadas de quem já cursou e vagas em tempo real com alerta, além de uma lista de 1ª, 2ª e 3ª opções já validada contra o horário. Para a pós-graduação, há uma área onde o estudante pode encontrar disciplinas que pode cursar em outras instituições e gerar em PDF a documentação necessária para a solicitação.

Este repositório contém a API REST do projeto. A interface web fica no repositório [escolhaDisciplinas_frontend](https://github.com/sasassa123/escolhaDisciplinas_frontend).

> Nesta etapa a API usa dados mock em memória. O banco de dados será implementado no MVP.

## Stack
Node.js, Express 5, dotenv, cors, nodemon (desenvolvimento)

## Pré-requisitos
- Node.js 18 ou superior
- npm

## Como rodar
```bash
npm install          # instala as dependências
cp .env.example .env # cria o arquivo de variáveis de ambiente
npm run dev          # desenvolvimento (hot reload com nodemon)
npm start            # produção
```
A API roda em http://localhost:3001

## Variáveis de ambiente
| Variável | Descrição | Exemplo |
|---|---|---|
| PORT | Porta em que a API sobe | 3001 |
| NODE_ENV | Ambiente de execução | development |
| DATABASE_URL | URL do banco de dados (uso futuro) | — |
| API_SECRET | Chave secreta da API (uso futuro) | — |
| FRONTEND_URL | Origem liberada no CORS | http://localhost:5173 |

## Rotas
| Método | Rota | Descrição | Respostas |
|---|---|---|---|
| GET | /api/health | Status da API | 200 |
| GET | /api/products | Lista os produtos (mock) | 200 |
| GET | /api/products/:id | Busca um produto pelo id | 200, 404 |
| POST | /api/products | Cria um produto | 201, 400 |

Qualquer rota inexistente responde `404` com `{ "error": "Rota não encontrada" }`.

### Exemplo de POST /api/products
Requisição:
```json
{
  "name": "Resumo de Cálculo II",
  "price": 0,
  "description": "Resumo da ementa de Cálculo II"
}
```
- `name` — obrigatório, texto não vazio
- `price` — obrigatório, número maior ou igual a zero
- `description` — opcional

Resposta `201`:
```json
{
  "id": 4,
  "name": "Resumo de Cálculo II",
  "price": 0,
  "description": "Resumo da ementa de Cálculo II"
}
```

Resposta `400` (dados inválidos):
```json
{ "error": "O campo name é obrigatório" }
```

## Estrutura de pastas
```
├── src/
│   ├── routes/           # definição das rotas (index.js agrupa todas sob /api)
│   ├── controllers/      # lógica de cada rota (productController.js)
│   ├── middlewares/      # CORS, validação de produto e tratamento global de erros
│   ├── config/           # configurações (banco de dados futuramente)
│   └── app.js            # configura o Express, middlewares e rotas
├── .env.example          # modelo das variáveis de ambiente
├── server.js             # ponto de entrada: carrega o .env e inicia o servidor
└── package.json
```

## Equipe
- Leonardo de Avila
- Matheus Pelissari
- Pedro Gulin
- Felippe Matias

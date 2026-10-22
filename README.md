# Gangue do Patinete — API

API REST do **Acervo**, portal em que o aluno encontra, numa única página por disciplina, ementa, pré-requisitos, professores, materiais enviados pela comunidade, avaliações de quem já cursou e perguntas e respostas com veteranos.

Este repositório contém a API REST do projeto. A interface web fica no repositório [escolhaDisciplinas_frontend](https://github.com/sasassa123/escolhaDisciplinas_frontend).

> Nesta etapa não há banco de dados: os dados ficam em memória e são gravados em `data/db.json` (e os arquivos enviados em `data/uploads/`) a cada alteração. Na primeira execução esses arquivos são criados com os dados de exemplo de `src/data/seed.js`. A pasta `data/` não vai para o Git.

## Stack
Node.js, Express 5, dotenv, cors, nodemon (desenvolvimento). Sem dependências extras: senhas com `crypto.scrypt` nativo e uploads em base64 dentro do JSON.

## Pré-requisitos
- Node.js 18 ou superior
- npm

## Como rodar
```bash
npm install          # instala as dependências
cp .env.example .env # cria o arquivo de variáveis de ambiente
npm run dev          # desenvolvimento (hot reload com nodemon)
npm start            # produção
npm run seed         # apaga data/ e recria os dados de exemplo
```
A API roda em http://localhost:3001

## Contas de demonstração
Criadas pelo seed, todas com e-mail confirmado e a senha definida em `DEMO_PASSWORD` no arquivo `src/data/seed.js`. O domínio é o de `INSTITUTIONAL_EMAIL_DOMAIN`.

| E-mail | Perfil |
|---|---|
| moderacao@alunos.politecnico.edu.br | Mariana Couto — moderadora, 8º período |
| rafael.lins@alunos.politecnico.edu.br | Rafael Lins — veterano, 7º período |
| julia.andrade@alunos.politecnico.edu.br | Júlia Andrade — veterana, 6º período |
| thiago.moreira@alunos.politecnico.edu.br | Thiago Moreira — veterano, 8º período |
| camila.rocha@alunos.politecnico.edu.br | Camila Rocha — 5º período |
| lucas.prado@alunos.politecnico.edu.br | Lucas Prado — calouro, 2º período |

## Variáveis de ambiente
| Variável | Descrição | Exemplo |
|---|---|---|
| PORT | Porta em que a API sobe | 3001 |
| NODE_ENV | Ambiente de execução. Fora de `production`, o link de confirmação de e-mail volta na resposta do cadastro (e-mail simulado) | development |
| DATABASE_URL | URL do banco de dados (uso futuro) | — |
| API_SECRET | Chave secreta da API (uso futuro) | — |
| FRONTEND_URL | Origens liberadas no CORS, separadas por vírgula. A primeira é usada no link de confirmação | http://localhost:5173 |
| INSTITUTION_NAME | Nome da instituição | Instituto Politécnico |
| COURSE_NAME | Curso atendido | Engenharia de Software |
| INSTITUTIONAL_EMAIL_DOMAIN | Domínio aceito no cadastro (subdomínios também) | alunos.politecnico.edu.br |

## Autenticação
`POST /api/auth/login` devolve um `token`. Envie-o nas rotas protegidas no cabeçalho `Authorization: Bearer <token>`.
O cadastro só aceita e-mails do domínio institucional e a conta só pode entrar depois de confirmar o e-mail pelo link (que, sem servidor de e-mail, é exibido no console da API).

## Rotas
🔒 = exige login · 🛡️ = exige moderador

| Método | Rota | Descrição |
|---|---|---|
| GET | /api/health | Status da API |
| POST | /api/auth/register | Cadastro `{ name, email, password, period }` |
| POST | /api/auth/confirm | Confirma o e-mail `{ token }` e já devolve a sessão |
| POST | /api/auth/resend | Reenvia o link de confirmação `{ email }` |
| POST | /api/auth/login | Login `{ email, password }` |
| POST | /api/auth/logout 🔒 | Encerra a sessão |
| GET | /api/auth/me 🔒 | Usuário logado |
| GET | /api/meta | Instituição, curso, tipos de material, semestres, motivos de denúncia e totais |
| GET | /api/activity | Perguntas sem resposta e materiais recentes |
| GET | /api/search?q= | Busca em disciplinas, perguntas e respostas |
| GET | /api/disciplines?q=&period=&type=&sort=&order= | Lista com médias de dificuldade/carga (null quando não há avaliações) |
| GET | /api/disciplines/:code | Página da disciplina |
| GET | /api/disciplines/:code/materials?type=&semester=&professor=&sort= | Materiais |
| POST | /api/disciplines/:code/materials 🔒 | Envia material: `{ title, type, semester, professor, description?, link? , file?: { name, type, data } }` (PDF/imagem até 5 MB, em base64) |
| GET | /api/materials/:id/download | Baixa o arquivo (ou redireciona para o link) e conta o download |
| GET | /api/materials/:id/view | Abre o arquivo no navegador |
| POST | /api/materials/:id/vote 🔒 | Voto `{ value: 1 \| -1 \| 0 }` |
| DELETE | /api/materials/:id 🔒 | Autor exclui o próprio material |
| GET | /api/disciplines/:code/reviews?professor= | Avaliações |
| PUT | /api/disciplines/:code/reviews 🔒 | Cria/atualiza a avaliação `{ difficulty, workload, comment, semester, professor }` (só veteranos da disciplina) |
| DELETE | /api/reviews/:id 🔒 | Autor exclui a própria avaliação |
| GET | /api/disciplines/:code/questions?q=&filter=unanswered | Perguntas (busca também no texto das respostas) |
| POST | /api/disciplines/:code/questions 🔒 | Nova pergunta `{ title, body }` — notifica os veteranos da disciplina |
| GET | /api/questions/:id | Pergunta com respostas (melhor resposta primeiro) |
| DELETE | /api/questions/:id 🔒 | Autor exclui a pergunta |
| POST | /api/questions/:id/answers 🔒 | Responde `{ body }` |
| POST | /api/questions/:id/best 🔒 | Autor da pergunta marca a melhor resposta `{ answerId \| null }` |
| POST | /api/answers/:id/vote 🔒 | Voto `{ value: 1 \| -1 \| 0 }` |
| DELETE | /api/answers/:id 🔒 | Autor exclui a resposta |
| POST | /api/reports 🔒 | Denúncia `{ targetType: material \| answer \| review \| question, targetId, reason, details? }` |
| GET | /api/moderation/reports?status=pending\|resolved 🛡️ | Denúncias com o conteúdo original |
| POST | /api/moderation/reports/:id/decision 🛡️ | `{ action: approve \| remove \| restore }`, registra quem decidiu e quando |
| GET | /api/users/me 🔒 | Perfil com contribuições e selos |
| PATCH | /api/users/me 🔒 | `{ name?, period?, completedDisciplines? }` |
| GET | /api/users/:id | Perfil público |
| GET | /api/notifications 🔒 | Notificações |
| POST | /api/notifications/read 🔒 | Marca como lidas (todas ou `{ id }`) |
| GET/POST | /api/products | Rotas de exemplo da etapa anterior (mantidas) |

Erros sempre voltam como `{ "error": "mensagem" }` (e `details` com a lista de problemas de validação). Rota inexistente responde `404` com `{ "error": "Rota não encontrada" }`.

## Estrutura de pastas
```
├── scripts/seed.js       # recria data/ com os dados de exemplo
├── src/
│   ├── routes/           # index.js (health e products) e portal.js (rotas do portal)
│   ├── controllers/      # auth, disciplinas, materiais, avaliações, perguntas, denúncias, usuários, notificações
│   ├── middlewares/      # CORS, autenticação, validação de produto e tratamento global de erros
│   ├── config/           # database.js (persistência em JSON) e portal.js (instituição, limites, tipos)
│   ├── data/             # seed.js (dados de exemplo) e pdf.js (gera os PDFs de exemplo)
│   ├── utils/            # erros HTTP, senha/tokens, texto e formatação das respostas
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

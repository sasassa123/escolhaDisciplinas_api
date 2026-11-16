# Seed de demonstração do MVP

Este script popula o banco **MySQL existente**, usado por `src/config/database.js`, com conteúdo fictício realista. Ele não cria tabelas individuais para cada coleção: a aplicação mantém o estado em JSON na tabela `app_state`.

## Conteúdo
- 24 disciplinas, incluindo obrigatórias e optativas, com ementa, professor, período e pré-requisitos
- 6 usuários de demonstração com e-mail institucional configurável
- Avaliações, perguntas, respostas e links públicos de estudo

Os registros são de **demonstração**, não são avaliações reais de estudantes ou dados oficiais de uma universidade.

## Como executar
1. Pare o backend (`npm run dev`) antes de popular o banco.
2. Faça um backup do banco se houver dados importantes.
3. Configure o `.env` com as variáveis `DB_*` habituais.
4. Defina uma senha para os seis usuários de demonstração, sem adicioná-la ao Git.

Windows CMD:
```bat
set DEMO_PASSWORD=SuaSenhaForteAqui
npm run seed:mvp
```

PowerShell:
```powershell
$env:DEMO_PASSWORD="SuaSenhaForteAqui"
npm run seed:mvp
```

macOS/Linux:
```bash
DEMO_PASSWORD='SuaSenhaForteAqui' npm run seed:mvp
```

Depois, execute `npm run test:mysql` e `npm run dev`. Os logins são `demo1@` até `demo6@` seguidos pelo domínio definido em `INSTITUTIONAL_EMAIL_DOMAIN`. Todos usam a senha definida em `DEMO_PASSWORD`.

## Segurança e repetição
- O script **não chama `reset()`** e não apaga os registros existentes.
- Pode ser executado novamente: verifica códigos de disciplinas, e-mails, autoria de avaliações, perguntas, respostas e URLs antes de adicionar.
- **Não execute `npm run seed`**: o comando antigo zera os dados do aplicativo.
- O backend deve estar desligado durante a execução porque ele mantém uma cópia do estado em memória; se estiver aberto, poderá gravar um snapshot antigo.
- O script não cria sessões para as contas demonstrativas; faça login normalmente pelo frontend.

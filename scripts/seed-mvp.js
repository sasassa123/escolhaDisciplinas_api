/**
 * Popula o MVP sem apagar dados existentes.
 * Uso: DEMO_PASSWORD=<senha-forte> npm run seed:mvp
 * Em Windows CMD: set DEMO_PASSWORD=... && npm run seed:mvp
 * Execute com a API desligada para evitar sobrescrita de snapshots.
 */
require('dotenv').config();
const { initialize, getDb, save, flush, nextId } = require('../src/config/database');
const { hashPassword } = require('../src/utils/password');
const pool = require('../src/config/mysql');
const portal = require('../src/config/portal');

const DEMO_PASSWORD = process.env.DEMO_PASSWORD;
if (!DEMO_PASSWORD || DEMO_PASSWORD.length < 8) {
  console.error('Defina DEMO_PASSWORD com pelo menos 8 caracteres antes de executar. Nenhum dado foi alterado.');
  process.exit(1);
}
const specs = [
  ['ALG101','Algoritmos e Programação',1,'obrigatoria','Fundamentos de algoritmos, variáveis, condicionais, laços e funções.','Ana Ribeiro',[]],
  ['MAT101','Matemática Discreta',1,'obrigatoria','Lógica, conjuntos, relações, indução e combinatória.','Bruno Martins',[]],
  ['WEB101','Introdução ao Desenvolvimento Web',1,'optativa','HTML semântico, CSS responsivo e fundamentos de JavaScript.','Carla Nogueira',[]],
  ['ALG201','Estruturas de Dados',2,'obrigatoria','Listas, pilhas, filas, árvores e tabelas hash.','Ana Ribeiro',['ALG101']],
  ['BD201','Banco de Dados',2,'obrigatoria','Modelagem relacional, SQL, normalização e transações.','Diego Lopes',['ALG101']],
  ['UX201','Design de Interfaces',2,'optativa','Usabilidade, acessibilidade, prototipação e pesquisa com usuários.','Elisa Costa',['WEB101']],
  ['POO201','Programação Orientada a Objetos',2,'obrigatoria','Classes, objetos, herança, composição e testes.','Fernanda Alves',['ALG101']],
  ['RED301','Redes de Computadores',3,'obrigatoria','Protocolos, endereçamento IP, roteamento e serviços de rede.','Gustavo Lima',[]],
  ['ENG301','Engenharia de Software',3,'obrigatoria','Requisitos, arquitetura, versionamento e qualidade de software.','Helena Prado',['POO201']],
  ['WEB301','Desenvolvimento Front-end',3,'optativa','React, componentes, estado, consumo de APIs e testes de interface.','Carla Nogueira',['WEB101']],
  ['BD301','Banco de Dados Avançado',3,'optativa','Índices, otimização de consultas e bancos NoSQL.','Diego Lopes',['BD201']],
  ['SO301','Sistemas Operacionais',3,'obrigatoria','Processos, threads, memória e sistemas de arquivos.','Igor Rocha',['ALG201']],
  ['API401','Desenvolvimento de APIs',4,'optativa','REST, autenticação, validação e integração com bancos de dados.','Fernanda Alves',['POO201','BD201']],
  ['SEG401','Segurança da Informação',4,'optativa','Criptografia, controle de acesso, OWASP e análise de riscos.','Gustavo Lima',['RED301']],
  ['IA401','Fundamentos de Inteligência Artificial',4,'optativa','Busca, representação do conhecimento e modelos preditivos.','Juliana Melo',['ALG201','MAT101']],
  ['MOB401','Desenvolvimento Mobile',4,'optativa','Interfaces móveis, navegação, armazenamento e integração com APIs.','Elisa Costa',['POO201']],
  ['NUV501','Computação em Nuvem',5,'optativa','Containers, infraestrutura, serviços gerenciados e escalabilidade.','Igor Rocha',['RED301']],
  ['DAD501','Ciência de Dados',5,'optativa','Preparação de dados, visualização, estatística aplicada e análise exploratória.','Juliana Melo',['BD201','MAT101']],
  ['IOT501','Internet das Coisas',5,'optativa','Sensores, microcontroladores, comunicação MQTT e aplicações conectadas.','Gustavo Lima',['RED301']],
  ['JOG501','Desenvolvimento de Jogos',5,'optativa','Loops de jogo, física básica, colisões e design de mecânicas.','Ana Ribeiro',['POO201']],
  ['DEV601','DevOps e Integração Contínua',6,'optativa','Pipelines, testes automatizados, deploy e observabilidade.','Helena Prado',['ENG301','API401']],
  ['ML601','Aprendizado de Máquina',6,'optativa','Regressão, classificação, validação e métricas de modelos.','Juliana Melo',['IA401','DAD501']],
  ['ARQ601','Arquitetura de Software',6,'optativa','Padrões arquiteturais, decisões técnicas e sistemas distribuídos.','Helena Prado',['ENG301']],
  ['PRO701','Projeto Integrador',7,'obrigatoria','Projeto de produto digital em equipe, da descoberta à validação do MVP.','Helena Prado',['ENG301']]
];
const students = [
  ['Mariana Couto',8,'moderator'],
  ['Rafael Lins',7,'student'],
  ['Júlia Andrade',6,'student'],
  ['Thiago Moreira',8,'student'],
  ['Camila Rocha',5,'student'],
  ['Lucas Prado',2,'student']
];
const completed = [
  ['ALG101','MAT101','WEB101','ALG201','BD201','POO201','ENG301','WEB301','API401','IA401','DAD501'],
  ['ALG101','MAT101','WEB101','ALG201','BD201','POO201','WEB301','BD301','API401','SEG401'],
  ['ALG101','MAT101','WEB101','ALG201','BD201','POO201','UX201','WEB301','MOB401','ENG301'],
  ['ALG101','MAT101','ALG201','BD201','POO201','RED301','SO301','ENG301','IOT501','NUV501'],
  ['ALG101','MAT101','WEB101','ALG201','BD201','POO201','WEB301'],
  ['ALG101','MAT101']
];
const notes = [
  'Os exercícios práticos ajudam bastante a consolidar o conteúdo, principalmente quando são feitos ao longo do semestre.',
  'A disciplina exige organização semanal, mas o conteúdo é bem aplicável em projetos e atividades reais.',
  'Vale revisar os conceitos básicos antes das avaliações e reservar tempo para os trabalhos em grupo.',
  'As aulas trazem exemplos interessantes, e praticar fora do horário ajuda a acompanhar o ritmo.',
  'O projeto final conecta os conceitos teóricos com situações comuns do desenvolvimento de software.'
];
const links = [
  ['WEB101','Referência HTML e CSS da MDN','outro','https://developer.mozilla.org/pt-BR/docs/Web'],
  ['ALG101','Tutorial oficial de Python','outro','https://docs.python.org/pt-br/3/tutorial/'],
  ['BD201','Manual de referência do MySQL','outro','https://dev.mysql.com/doc/refman/8.4/en/'],
  ['WEB301','Documentação oficial do React','outro','https://react.dev/learn'],
  ['API401','Guia de Express','outro','https://expressjs.com/'],
  ['ENG301','Documentação do Git','outro','https://git-scm.com/doc'],
  ['SEG401','OWASP Top 10','outro','https://owasp.org/www-project-top-ten/'],
  ['N J','', '', '']
].filter(x=>x[0]!=='N J');

function idFor(db, name) { return nextId(name); }
function addIfMissing(db, collection, predicate, make) {
  if (db[collection].some(predicate)) return false;
  db[collection].push(make());
  return true;
}
function main() {
  const db = getDb(), counts = {};
  for (const [code,name,period,type,syllabus,professor,prerequisites] of specs) {
    if (addIfMissing(db,'disciplines',d=>d.code===code,()=>({
      id:idFor(db,'disciplines'),code,name,period,type,workloadHours:60,credits:4,
      professors:[professor],prerequisites,syllabus,
      bibliography:['Material de apoio e referências indicadas pelo docente (MVP demonstrativo).']
    }))) counts.disciplines=(counts.disciplines||0)+1;
  }
  const domain=portal.emailDomain;
  const users=[];
  for (let i=0;i<students.length;i++) {
    const [name,period,role]=students[i];
    const email='demo'+(i+1)+'@'+domain;
    if (addIfMissing(db,'users',u=>u.email===email,()=>({
      id:idFor(db,'users'),name,email,passwordHash:hashPassword(DEMO_PASSWORD),
      role,course:portal.course,period,completedDisciplines:completed[i],
      emailConfirmed:true,confirmToken:null,createdAt:new Date().toISOString()
    }))) counts.users=(counts.users||0)+1;
    users.push(db.users.find(u=>u.email===email));
  }
  const now=new Date().toISOString();
  for(let i=0;i<specs.length;i++) {
    const [code,,,,,professor]=specs[i];
    const eligible=users.filter(u=>u.completedDisciplines.includes(code));
    for (let j=0;j<Math.min(3,eligible.length);j++) {
      const author=eligible[j];
      if(addIfMissing(db,'reviews',r=>r.disciplineCode===code&&r.authorId===author.id,()=>({
        id:idFor(db,'reviews'),disciplineCode:code,authorId:author.id,
        difficulty:2+(i+j)%4,workload:2+(i+2*j)%4,
        comment:notes[(i+j)%notes.length],semester:'2026.1',professor,
        status:'active',createdAt:now,updatedAt:now
      }))) counts.reviews=(counts.reviews||0)+1;
    }
    if(i%2===0) {
      const author=users[i%users.length];
      const title='Como se preparar para as atividades de '+specs[i][1]+'?';
      let q=db.questions.find(q=>q.disciplineCode===code&&q.title===title);
      if(!q) {
        q={id:idFor(db,'questions'),disciplineCode:code,authorId:author.id,
          title,body:'Quais conteúdos e exercícios vocês recomendam revisar antes de começar a disciplina?',
          bestAnswerId:null,status:'active',createdAt:now};
        db.questions.push(q); counts.questions=(counts.questions||0)+1;
      }
      if(i%4===0) {
        const responder=users.find(u=>u.id!==author.id&&u.completedDisciplines.includes(code))||users.find(u=>u.id!==author.id);
        if(addIfMissing(db,'answers',a=>a.questionId===q.id&&a.authorId===responder.id,()=>({
          id:idFor(db,'answers'),questionId:q.id,authorId:responder.id,
          body:'Recomendo começar pelos fundamentos, praticar com exercícios pequenos e revisar os exemplos das aulas.',
          votes:{},status:'active',createdAt:now
        }))) counts.answers=(counts.answers||0)+1;
        const answer=db.answers.find(a=>a.questionId===q.id&&a.authorId===responder.id);
        if(!q.bestAnswerId) q.bestAnswerId=answer.id;
      }
    }
  }
  for(const [code,title,type,url] of links) {
    if(addIfMissing(db,'materials',m=>m.disciplineCode===code&&m.url===url,()=>({
      id:idFor(db,'materials'),disciplineCode:code,authorId:users[0].id,
      title,description:'Recurso público de referência para estudo (MVP).',
      type,semester:'2026.2',professor:specs.find(d=>d[0]===code)[5],
      kind:'link',url,file:null,downloads:0,votes:{},status:'active',createdAt:now
    }))) counts.materials=(counts.materials||0)+1;
  }
  return counts;
}
(async()=>{
  await initialize();
  const counts=main();
  await save();
  await flush();
  console.log('Seed MVP concluído (novos registros):',counts);
  console.log('Contas demonstrativas: demo1 a demo6 @'+portal.emailDomain);
  console.log('Execute novamente sem duplicar registros. Reinicie a API se estava aberta.');
  await pool.end();
})().catch(async err=>{console.error(err);try{await pool.end();}catch{}process.exitCode=1;});

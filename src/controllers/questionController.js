const { getDb, save, nextId } = require('../config/database');
const { matches, requireText } = require('../utils/text');
const { badRequest, forbidden, notFound } = require('../utils/httpError');
const present = require('../utils/present');
const { findDiscipline } = require('./disciplineController');
const { applyVote } = require('./materialController');
const { notify } = require('./notificationController');

function findQuestion(id) {
  const question = getDb().questions.find((q) => q.id === Number(id));
  if (!question || question.status !== 'active') throw notFound('Pergunta não encontrada');
  return question;
}

function findAnswer(id) {
  const answer = getDb().answers.find((a) => a.id === Number(id));
  if (!answer || answer.status !== 'active') throw notFound('Resposta não encontrada');
  return answer;
}

/** GET /api/disciplines/:code/questions?q=&filter=unanswered — perguntas pesquisáveis (RF06). */
function listQuestions(req, res) {
  const db = getDb();
  const discipline = findDiscipline(req.params.code);
  const { q = '', filter } = req.query;

  const items = db.questions
    .filter((item) => item.disciplineCode === discipline.code && item.status === 'active')
    .filter((item) => matches(q, item.title, item.body, ...db.answers
      .filter((a) => a.questionId === item.id && a.status === 'active')
      .map((a) => a.body)))
    .map((item) => present.question(db, item, req.user))
    .filter((item) => filter !== 'unanswered' || item.answerCount === 0)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  res.json(items);
}

/**
 * POST /api/disciplines/:code/questions — publica uma dúvida (US03).
 * Notifica todos os usuários com selo de veterano na disciplina.
 */
function createQuestion(req, res) {
  const db = getDb();
  const discipline = findDiscipline(req.params.code);
  const errors = [];
  const title = requireText((req.body || {}).title, 'Título', errors, { min: 10, max: 160 });
  const body = requireText((req.body || {}).body, 'Descrição', errors, { min: 10, max: 3000 });
  if (errors.length) throw badRequest(errors[0], errors);

  const question = {
    id: nextId('questions'),
    disciplineCode: discipline.code,
    authorId: req.user.id,
    title,
    body,
    bestAnswerId: null,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  db.questions.push(question);

  db.users
    .filter((user) => user.id !== req.user.id && user.completedDisciplines.includes(discipline.code))
    .forEach((user) => notify(
      user.id,
      'question',
      `Nova pergunta em ${discipline.code}, disciplina em que você é veterano: "${title}"`,
      `/perguntas/${question.id}`,
    ));

  save();
  res.status(201).json(present.question(db, question, req.user, { withAnswers: true }));
}

/** GET /api/questions/:id — pergunta com respostas; a melhor resposta vem primeiro. */
function getQuestion(req, res) {
  const db = getDb();
  const question = findQuestion(req.params.id);
  const discipline = findDiscipline(question.disciplineCode);
  res.json({
    ...present.question(db, question, req.user, { withAnswers: true }),
    discipline: { code: discipline.code, name: discipline.name, professors: discipline.professors },
    viewerIsVeteran: Boolean(req.user && req.user.completedDisciplines.includes(discipline.code)),
  });
}

/** POST /api/questions/:id/answers */
function createAnswer(req, res) {
  const db = getDb();
  const question = findQuestion(req.params.id);
  const errors = [];
  const body = requireText((req.body || {}).body, 'Resposta', errors, { min: 10, max: 4000 });
  if (errors.length) throw badRequest(errors[0], errors);

  const answer = {
    id: nextId('answers'),
    questionId: question.id,
    authorId: req.user.id,
    body,
    votes: {},
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  db.answers.push(answer);

  if (question.authorId !== req.user.id) {
    notify(question.authorId, 'answer', `${req.user.name} respondeu sua pergunta em ${question.disciplineCode}`, `/perguntas/${question.id}`);
  }

  save();
  res.status(201).json(present.answer(db, answer, question, req.user));
}

/** POST /api/questions/:id/best — { answerId | null }: só o autor da pergunta marca a melhor resposta (RF07). */
function markBestAnswer(req, res) {
  const db = getDb();
  const question = findQuestion(req.params.id);
  if (question.authorId !== req.user.id) throw forbidden('Só quem perguntou pode escolher a melhor resposta');

  const answerId = (req.body || {}).answerId;
  if (answerId === null || answerId === undefined) {
    question.bestAnswerId = null;
  } else {
    const answer = findAnswer(answerId);
    if (answer.questionId !== question.id) throw badRequest('Essa resposta não pertence a esta pergunta');
    question.bestAnswerId = answer.id;
    if (answer.authorId !== req.user.id) {
      notify(answer.authorId, 'best', `Sua resposta foi escolhida como a melhor em ${question.disciplineCode}`, `/perguntas/${question.id}`);
    }
  }

  save();
  res.json(present.question(db, question, req.user, { withAnswers: true }));
}

/** POST /api/answers/:id/vote — { value: 1 | -1 | 0 } */
function voteAnswer(req, res) {
  const db = getDb();
  const answer = findAnswer(req.params.id);
  applyVote(answer, req.user, (req.body || {}).value);
  res.json(present.answer(db, answer, findQuestion(answer.questionId), req.user));
}

/** DELETE /api/questions/:id e /api/answers/:id — o autor pode apagar o que publicou. */
function deleteQuestion(req, res) {
  const question = findQuestion(req.params.id);
  if (question.authorId !== req.user.id) throw forbidden('Só o autor pode excluir esta pergunta');
  question.status = 'deleted';
  save();
  res.status(204).end();
}

function deleteAnswer(req, res) {
  const answer = findAnswer(req.params.id);
  if (answer.authorId !== req.user.id) throw forbidden('Só o autor pode excluir esta resposta');
  answer.status = 'deleted';
  const question = getDb().questions.find((q) => q.id === answer.questionId);
  if (question && question.bestAnswerId === answer.id) question.bestAnswerId = null;
  save();
  res.status(204).end();
}

module.exports = {
  listQuestions, createQuestion, getQuestion, createAnswer, markBestAnswer, voteAnswer, deleteQuestion, deleteAnswer,
};

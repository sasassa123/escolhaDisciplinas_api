const { getDb } = require('../config/database');
const portal = require('../config/portal');
const { matches } = require('../utils/text');
const { notFound } = require('../utils/httpError');
const present = require('../utils/present');

function findDiscipline(code) {
  const discipline = getDb().disciplines.find((d) => d.code.toLowerCase() === String(code).toLowerCase());
  if (!discipline) throw notFound('Disciplina não encontrada');
  return discipline;
}

const SORTERS = {
  // Disciplinas sem avaliação sempre vão para o fim nas ordenações por nota
  difficulty: (a, b) => nullsLast(a.stats.avgDifficulty, b.stats.avgDifficulty),
  workload: (a, b) => nullsLast(a.stats.avgWorkload, b.stats.avgWorkload),
  reviews: (a, b) => b.stats.reviewCount - a.stats.reviewCount,
  name: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
  period: (a, b) => a.period - b.period || a.code.localeCompare(b.code),
};

function nullsLast(a, b) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

/**
 * GET /api/disciplines?q=&period=&type=&sort=&order=
 * Busca por nome ou código, filtro por período e por obrigatória/optativa (RF03).
 */
function listDisciplines(req, res) {
  const db = getDb();
  const { q = '', period, type, sort = 'period', order = 'asc' } = req.query;
  const periodNumber = Number(period);

  let list = db.disciplines
    .filter((d) => matches(q, d.code, d.name))
    .filter((d) => !period || d.period === periodNumber)
    .filter((d) => !type || d.type === type)
    .map((d) => present.disciplineSummary(db, d));

  const sorter = SORTERS[sort] || SORTERS.period;
  list = list.sort(sorter);
  if (order === 'desc') {
    // Inverte mantendo as disciplinas sem avaliação no fim
    const rated = list.filter((d) => !['difficulty', 'workload'].includes(sort) || d.stats.reviewCount > 0).reverse();
    const unrated = list.filter((d) => ['difficulty', 'workload'].includes(sort) && d.stats.reviewCount === 0);
    list = [...rated, ...unrated];
  }

  res.json(list);
}

/** GET /api/disciplines/:code — página da disciplina (RF04). */
function getDiscipline(req, res) {
  const db = getDb();
  res.json(present.disciplineDetail(db, findDiscipline(req.params.code), req.user));
}

/** GET /api/meta — dados fixos que o front usa em formulários e textos. */
function getMeta(req, res) {
  const db = getDb();
  res.json({
    institution: portal.institution,
    course: portal.course,
    emailDomain: portal.emailDomain,
    maxUploadMB: portal.maxUploadMB,
    allowedMimeTypes: portal.allowedMimeTypes,
    materialTypes: portal.materialTypes,
    reportReasons: portal.reportReasons,
    semesters: portal.recentSemesters(12),
    currentSemester: portal.currentSemester(),
    periods: [...new Set(db.disciplines.map((d) => d.period))].sort((a, b) => a - b),
    totals: {
      disciplines: db.disciplines.length,
      materials: db.materials.filter((m) => m.status === 'active').length,
      reviews: db.reviews.filter((r) => r.status === 'active').length,
      questions: db.questions.filter((q) => q.status === 'active').length,
      answers: db.answers.filter((a) => a.status === 'active').length,
      students: db.users.length,
    },
  });
}

/**
 * GET /api/search?q= — busca geral: disciplinas, perguntas e respostas.
 * As respostas são públicas e pesquisáveis (RF06).
 */
function search(req, res) {
  const db = getDb();
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ query: q, disciplines: [], questions: [] });

  const disciplines = db.disciplines
    .filter((d) => matches(q, d.code, d.name, d.syllabus, d.professors.join(' ')))
    .map((d) => present.disciplineSummary(db, d));

  const questions = db.questions
    .filter((item) => item.status === 'active')
    .map((item) => {
      const matchingAnswer = db.answers.find((a) => a.questionId === item.id && a.status === 'active' && matches(q, a.body));
      const hit = matches(q, item.title, item.body) || Boolean(matchingAnswer);
      if (!hit) return null;
      return {
        ...present.question(db, item, req.user),
        matchedAnswer: matchingAnswer && !matches(q, item.title, item.body)
          ? { id: matchingAnswer.id, body: matchingAnswer.body, author: present.author(db, matchingAnswer.authorId, item.disciplineCode) }
          : null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  res.json({ query: q, disciplines, questions });
}

/** GET /api/activity — perguntas sem resposta e materiais recentes para a página inicial. */
function recentActivity(req, res) {
  const db = getDb();
  const unanswered = db.questions
    .filter((q) => q.status === 'active' && !db.answers.some((a) => a.questionId === q.id && a.status === 'active'))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
    .map((q) => present.question(db, q, req.user));

  const materials = db.materials
    .filter((m) => m.status === 'active')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6)
    .map((m) => ({ ...present.material(db, m, req.user), disciplineName: findDiscipline(m.disciplineCode).name }));

  const questions = db.questions
    .filter((q) => q.status === 'active')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
    .map((q) => present.question(db, q, req.user));

  res.json({ unanswered, materials, questions });
}

module.exports = { findDiscipline, listDisciplines, getDiscipline, getMeta, search, recentActivity };

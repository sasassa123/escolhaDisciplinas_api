const { getDb, save } = require('../config/database');
const { requireText } = require('../utils/text');
const { badRequest, notFound } = require('../utils/httpError');
const present = require('../utils/present');

/**
 * Histórico de contribuições do usuário (US04): materiais, respostas,
 * perguntas e avaliações, do mais recente para o mais antigo.
 */
function contributionsOf(db, user, viewer) {
  const disciplineName = (code) => db.disciplines.find((d) => d.code === code)?.name || code;
  const isOwner = viewer && viewer.id === user.id;
  // O próprio usuário vê também o que foi removido pela moderação
  const visible = (item) => item.status === 'active' || (isOwner && item.status === 'removed');

  const materials = db.materials.filter((m) => m.authorId === user.id && visible(m)).map((m) => ({
    kind: 'material', id: m.id, createdAt: m.createdAt, status: m.status,
    disciplineCode: m.disciplineCode, disciplineName: disciplineName(m.disciplineCode),
    title: m.title, detail: `${m.downloads} downloads`, score: present.voteSummary(m.votes).score,
    link: `/disciplinas/${m.disciplineCode}?aba=materiais`,
  }));
  const answers = db.answers.filter((a) => a.authorId === user.id && visible(a)).map((a) => {
    const question = db.questions.find((q) => q.id === a.questionId);
    return {
      kind: 'answer', id: a.id, createdAt: a.createdAt, status: a.status,
      disciplineCode: question?.disciplineCode, disciplineName: disciplineName(question?.disciplineCode),
      title: question?.title || 'Pergunta removida', detail: question?.bestAnswerId === a.id ? 'Melhor resposta' : '',
      score: present.voteSummary(a.votes).score,
      link: question ? `/perguntas/${question.id}` : null,
    };
  });
  const questions = db.questions.filter((q) => q.authorId === user.id && visible(q)).map((q) => ({
    kind: 'question', id: q.id, createdAt: q.createdAt, status: q.status,
    disciplineCode: q.disciplineCode, disciplineName: disciplineName(q.disciplineCode),
    title: q.title, detail: `${db.answers.filter((a) => a.questionId === q.id && a.status === 'active').length} respostas`,
    link: `/perguntas/${q.id}`,
  }));
  const reviews = db.reviews.filter((r) => r.authorId === user.id && visible(r)).map((r) => ({
    kind: 'review', id: r.id, createdAt: r.updatedAt || r.createdAt, status: r.status,
    disciplineCode: r.disciplineCode, disciplineName: disciplineName(r.disciplineCode),
    title: `Dificuldade ${r.difficulty}/5 · Carga ${r.workload}/5`, detail: r.comment,
    link: `/disciplinas/${r.disciplineCode}?aba=avaliacoes`,
  }));

  const items = [...materials, ...answers, ...questions, ...reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const activeMaterials = materials.filter((m) => m.status === 'active');
  return {
    items,
    stats: {
      materials: activeMaterials.length,
      answers: answers.filter((a) => a.status === 'active').length,
      bestAnswers: answers.filter((a) => a.detail === 'Melhor resposta').length,
      questions: questions.length,
      reviews: reviews.filter((r) => r.status === 'active').length,
      downloads: db.materials.filter((m) => m.authorId === user.id && m.status === 'active').reduce((sum, m) => sum + m.downloads, 0),
    },
  };
}

function profile(db, user, viewer) {
  const veteranIn = user.completedDisciplines
    .map((code) => db.disciplines.find((d) => d.code === code))
    .filter(Boolean)
    .sort((a, b) => a.period - b.period || a.code.localeCompare(b.code))
    .map((d) => ({ code: d.code, name: d.name, type: d.type, period: d.period }));

  return {
    id: user.id,
    name: user.name,
    initials: present.initials(user.name),
    role: user.role,
    course: user.course,
    period: user.period,
    createdAt: user.createdAt,
    veteranIn,
    contributions: contributionsOf(db, user, viewer),
  };
}

/** GET /api/users/:id — perfil público (RF10). */
function getUser(req, res) {
  const db = getDb();
  const user = db.users.find((u) => u.id === Number(req.params.id));
  if (!user) throw notFound('Usuário não encontrado');
  res.json(profile(db, user, req.user));
}

/** GET /api/users/me — perfil do próprio usuário, com e-mail. */
function getMe(req, res) {
  const db = getDb();
  res.json({ ...profile(db, req.user, req.user), email: req.user.email, completedDisciplines: req.user.completedDisciplines });
}

/** PATCH /api/users/me — { name?, period?, completedDisciplines? } */
function updateMe(req, res) {
  const db = getDb();
  const body = req.body || {};
  const errors = [];
  const changes = {};

  if (body.name !== undefined) changes.name = requireText(body.name, 'Nome', errors, { min: 3, max: 80 });
  if (body.period !== undefined) {
    const period = Number(body.period);
    if (!Number.isInteger(period) || period < 1 || period > 12) errors.push('Informe um período de 1 a 12');
    changes.period = period;
  }
  if (body.completedDisciplines !== undefined) {
    if (!Array.isArray(body.completedDisciplines)) {
      errors.push('Lista de disciplinas cursadas inválida');
    } else {
      const valid = new Set(db.disciplines.map((d) => d.code));
      changes.completedDisciplines = [...new Set(body.completedDisciplines.map(String))].filter((code) => valid.has(code));
    }
  }
  if (errors.length) throw badRequest(errors[0], errors);

  Object.assign(req.user, changes);
  save();
  res.json({ ...profile(db, req.user, req.user), email: req.user.email, completedDisciplines: req.user.completedDisciplines });
}

module.exports = { getUser, getMe, updateMe };

const { getDb, save, nextId } = require('../config/database');
const { requireText } = require('../utils/text');
const { badRequest, forbidden, notFound } = require('../utils/httpError');
const present = require('../utils/present');
const { findDiscipline } = require('./disciplineController');

/** GET /api/disciplines/:code/reviews?professor= */
function listReviews(req, res) {
  const db = getDb();
  const discipline = findDiscipline(req.params.code);
  const { professor } = req.query;

  const items = db.reviews
    .filter((r) => r.disciplineCode === discipline.code && r.status === 'active')
    .filter((r) => !professor || r.professor === professor)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((r) => present.review(db, r, req.user));

  res.json(items);
}

function score(value, label, errors) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 5) {
    errors.push(`Dê uma nota de 1 a 5 para ${label}`);
  }
  return number;
}

/**
 * PUT /api/disciplines/:code/reviews — cria ou atualiza a avaliação do usuário (RF05).
 * Só quem já cursou a disciplina (selo de veterano) pode avaliar; uma avaliação por aluno.
 */
function upsertReview(req, res) {
  const db = getDb();
  const discipline = findDiscipline(req.params.code);
  if (!req.user.completedDisciplines.includes(discipline.code)) {
    throw forbidden('Só quem já cursou pode avaliar. Marque a disciplina como cursada no seu perfil.');
  }

  const body = req.body || {};
  const errors = [];
  const difficulty = score(body.difficulty, 'dificuldade', errors);
  const workload = score(body.workload, 'carga de trabalho', errors);
  const comment = requireText(body.comment, 'Comentário', errors, { min: 20, max: 1500 });
  if (!/^\d{4}\.[12]$/.test(String(body.semester || ''))) errors.push('Informe em que semestre você cursou');
  const professor = requireText(body.professor, 'Professor', errors, { max: 80 });
  if (errors.length) throw badRequest(errors[0], errors);

  const now = new Date().toISOString();
  let review = db.reviews.find((r) => r.disciplineCode === discipline.code && r.authorId === req.user.id && r.status !== 'deleted');
  let status = 201;

  if (review) {
    if (review.status === 'removed') throw forbidden('Sua avaliação foi removida pela moderação e não pode ser editada');
    Object.assign(review, { difficulty, workload, comment, semester: body.semester, professor, updatedAt: now });
    status = 200;
  } else {
    review = {
      id: nextId('reviews'),
      disciplineCode: discipline.code,
      authorId: req.user.id,
      difficulty,
      workload,
      comment,
      semester: body.semester,
      professor,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    db.reviews.push(review);
  }

  save();
  res.status(status).json(present.review(db, review, req.user));
}

/** DELETE /api/reviews/:id — o autor pode apagar a própria avaliação. */
function deleteReview(req, res) {
  const review = getDb().reviews.find((r) => r.id === Number(req.params.id) && r.status === 'active');
  if (!review) throw notFound('Avaliação não encontrada');
  if (review.authorId !== req.user.id) throw forbidden('Só o autor pode excluir esta avaliação');
  review.status = 'deleted';
  save();
  res.status(204).end();
}

module.exports = { listReviews, upsertReview, deleteReview };

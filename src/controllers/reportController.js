const { getDb, save, nextId } = require('../config/database');
const portal = require('../config/portal');
const { badRequest, conflict, forbidden, notFound } = require('../utils/httpError');
const present = require('../utils/present');
const { notify } = require('./notificationController');

const TARGETS = {
  material: { collection: 'materials', label: 'Material' },
  answer: { collection: 'answers', label: 'Resposta' },
  review: { collection: 'reviews', label: 'Avaliação' },
  question: { collection: 'questions', label: 'Pergunta' },
};

function findTarget(type, id) {
  const config = TARGETS[type];
  if (!config) return null;
  return getDb()[config.collection].find((item) => item.id === Number(id)) || null;
}

/** Monta uma prévia do conteúdo denunciado para o painel de moderação. */
function targetPreview(db, type, item) {
  if (!item) return { type, missing: true };
  const base = { type, label: TARGETS[type].label, id: item.id, status: item.status, createdAt: item.createdAt };

  if (type === 'material') {
    return {
      ...base,
      title: item.title,
      body: item.description,
      disciplineCode: item.disciplineCode,
      author: present.author(db, item.authorId, item.disciplineCode),
      meta: `${item.kind === 'link' ? 'Link' : item.file?.originalName || 'Arquivo'} · ${item.semester} · Prof. ${item.professor}`,
      fileUrl: item.kind === 'file' ? `/materials/${item.id}/view` : null,
      externalUrl: item.kind === 'link' ? item.url : null,
      link: `/disciplinas/${item.disciplineCode}?aba=materiais`,
    };
  }
  if (type === 'review') {
    return {
      ...base,
      title: `Dificuldade ${item.difficulty}/5 · Carga ${item.workload}/5`,
      body: item.comment,
      disciplineCode: item.disciplineCode,
      author: present.author(db, item.authorId, item.disciplineCode),
      meta: `Cursou em ${item.semester} · Prof. ${item.professor}`,
      link: `/disciplinas/${item.disciplineCode}?aba=avaliacoes`,
    };
  }
  if (type === 'answer') {
    const question = db.questions.find((q) => q.id === item.questionId);
    return {
      ...base,
      title: `Resposta em: ${question ? question.title : 'pergunta removida'}`,
      body: item.body,
      disciplineCode: question?.disciplineCode,
      author: present.author(db, item.authorId, question?.disciplineCode),
      link: question ? `/perguntas/${question.id}` : null,
    };
  }
  return {
    ...base,
    title: item.title,
    body: item.body,
    disciplineCode: item.disciplineCode,
    author: present.author(db, item.authorId, item.disciplineCode),
    link: `/perguntas/${item.id}`,
  };
}

/**
 * POST /api/reports — { targetType, targetId, reason, details? }
 * Qualquer usuário autenticado pode denunciar material, resposta, avaliação ou pergunta (RF09/US05).
 */
function createReport(req, res) {
  const db = getDb();
  const { targetType, targetId, reason, details } = req.body || {};

  if (!TARGETS[targetType]) throw badRequest('Tipo de conteúdo inválido');
  const target = findTarget(targetType, targetId);
  if (!target || target.status !== 'active') throw notFound('Conteúdo não encontrado');
  if (target.authorId === req.user.id) throw forbidden('Você não pode denunciar o próprio conteúdo');
  if (!portal.reportReasons.some((r) => r.value === reason)) throw badRequest('Escolha o motivo da denúncia');
  const cleanDetails = typeof details === 'string' ? details.trim().slice(0, 600) : '';
  if (reason === 'outro' && cleanDetails.length < 5) throw badRequest('Descreva o motivo da denúncia');

  const duplicate = db.reports.some((r) => r.targetType === targetType && r.targetId === target.id
    && r.reporterId === req.user.id && r.status === 'pending');
  if (duplicate) throw conflict('Você já denunciou este conteúdo. A moderação vai analisar em breve.');

  const report = {
    id: nextId('reports'),
    targetType,
    targetId: target.id,
    reason,
    details: cleanDetails,
    reporterId: req.user.id,
    status: 'pending',
    createdAt: new Date().toISOString(),
    decisions: [],
  };
  db.reports.push(report);
  save();
  res.status(201).json({ message: 'Denúncia enviada. Obrigado por ajudar a manter o portal confiável.' });
}

function presentReport(db, report) {
  const reasonLabel = portal.reportReasons.find((r) => r.value === report.reason)?.label || report.reason;
  const reporter = db.users.find((u) => u.id === report.reporterId);
  return {
    id: report.id,
    targetType: report.targetType,
    targetId: report.targetId,
    reason: report.reason,
    reasonLabel,
    details: report.details,
    status: report.status,
    createdAt: report.createdAt,
    reporter: reporter ? { id: reporter.id, name: reporter.name } : null,
    sameTargetCount: db.reports.filter((r) => r.targetType === report.targetType && r.targetId === report.targetId).length,
    target: targetPreview(db, report.targetType, findTarget(report.targetType, report.targetId)),
    decisions: report.decisions.map((d) => ({
      ...d,
      moderatorName: db.users.find((u) => u.id === d.moderatorId)?.name || 'Moderador',
    })),
  };
}

/** GET /api/moderation/reports?status=pending|resolved — painel de moderação (RF09). */
function listReports(req, res) {
  const db = getDb();
  const status = req.query.status === 'resolved' ? 'resolved' : 'pending';
  const items = db.reports
    .filter((r) => (status === 'pending' ? r.status === 'pending' : r.status !== 'pending'))
    .sort((a, b) => {
      const lastA = a.decisions.at(-1)?.at || a.createdAt;
      const lastB = b.decisions.at(-1)?.at || b.createdAt;
      return status === 'pending' ? a.createdAt.localeCompare(b.createdAt) : lastB.localeCompare(lastA);
    })
    .map((r) => presentReport(db, r));

  res.json({
    items,
    counts: {
      pending: db.reports.filter((r) => r.status === 'pending').length,
      resolved: db.reports.filter((r) => r.status !== 'pending').length,
    },
  });
}

const ACTIONS = {
  // ação: [status de denúncia em que pode ser aplicada, novo status da denúncia, novo status do conteúdo]
  approve: { from: ['pending'], reportStatus: 'approved', targetStatus: 'active' },
  remove: { from: ['pending', 'approved', 'restored'], reportStatus: 'removed', targetStatus: 'removed' },
  restore: { from: ['removed'], reportStatus: 'restored', targetStatus: 'active' },
};

/**
 * POST /api/moderation/reports/:id/decision — { action: 'approve' | 'remove' | 'restore' }
 * Registra quem decidiu e quando. A decisão vale para todas as denúncias
 * pendentes do mesmo conteúdo.
 */
function decideReport(req, res) {
  const db = getDb();
  const report = db.reports.find((r) => r.id === Number(req.params.id));
  if (!report) throw notFound('Denúncia não encontrada');

  const action = ACTIONS[(req.body || {}).action];
  if (!action) throw badRequest('Ação inválida');
  if (!action.from.includes(report.status)) throw conflict('Esta denúncia já foi decidida. Atualize a página.');

  const target = findTarget(report.targetType, report.targetId);
  if (!target || target.status === 'deleted') throw conflict('O conteúdo foi excluído pelo próprio autor');

  const decision = { action: req.body.action, moderatorId: req.user.id, at: new Date().toISOString() };
  const related = db.reports.filter((r) => r.targetType === report.targetType && r.targetId === report.targetId
    && (r.id === report.id || r.status === 'pending'));
  related.forEach((r) => {
    r.status = action.reportStatus;
    r.decisions.push(decision);
  });

  const wasActive = target.status === 'active';
  target.status = action.targetStatus;
  if (action.targetStatus === 'removed' && wasActive) {
    notify(target.authorId, 'moderation', `Um conteúdo seu (${TARGETS[report.targetType].label.toLowerCase()}) foi removido pela moderação`, '/perfil');
  }

  save();
  res.json(presentReport(db, report));
}

module.exports = { createReport, listReports, decideReport };

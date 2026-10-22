/**
 * Funções que transformam os registros do banco no formato devolvido pela API.
 * Nunca expõem dados sensíveis (senha, e-mail, tokens) e já calculam
 * agregados como médias e placar de votos.
 */

function initials(name) {
  return String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
}

function author(db, userId, disciplineCode) {
  const user = db.users.find((item) => item.id === userId);
  if (!user) return { id: null, name: 'Usuário removido', initials: '?', isVeteran: false, role: 'student' };
  return {
    id: user.id,
    name: user.name,
    initials: initials(user.name),
    period: user.period,
    role: user.role,
    isVeteran: Boolean(disciplineCode && user.completedDisciplines.includes(disciplineCode)),
  };
}

function voteSummary(votes = {}, currentUser) {
  const values = Object.values(votes);
  const upvotes = values.filter((value) => value > 0).length;
  const downvotes = values.filter((value) => value < 0).length;
  return {
    score: upvotes - downvotes,
    upvotes,
    downvotes,
    myVote: currentUser ? votes[String(currentUser.id)] || 0 : 0,
  };
}

const round1 = (value) => Math.round(value * 10) / 10;

/** Médias de avaliação. Sem avaliações, as médias são null (nunca zero). */
function disciplineStats(db, code) {
  const reviews = db.reviews.filter((r) => r.disciplineCode === code && r.status === 'active');
  const questions = db.questions.filter((q) => q.disciplineCode === code && q.status === 'active');
  const count = reviews.length;
  return {
    reviewCount: count,
    avgDifficulty: count ? round1(reviews.reduce((sum, r) => sum + r.difficulty, 0) / count) : null,
    avgWorkload: count ? round1(reviews.reduce((sum, r) => sum + r.workload, 0) / count) : null,
    materialCount: db.materials.filter((m) => m.disciplineCode === code && m.status === 'active').length,
    questionCount: questions.length,
    unansweredCount: questions.filter((q) => !db.answers.some((a) => a.questionId === q.id && a.status === 'active')).length,
  };
}

function disciplineSummary(db, discipline) {
  return {
    id: discipline.id,
    code: discipline.code,
    name: discipline.name,
    period: discipline.period,
    type: discipline.type,
    workloadHours: discipline.workloadHours,
    credits: discipline.credits,
    professors: discipline.professors,
    prerequisites: discipline.prerequisites,
    stats: disciplineStats(db, discipline.code),
  };
}

function disciplineDetail(db, discipline, currentUser) {
  const ref = (code) => {
    const found = db.disciplines.find((d) => d.code === code);
    return found ? { code: found.code, name: found.name } : { code, name: code };
  };
  const reviews = db.reviews.filter((r) => r.disciplineCode === discipline.code && r.status === 'active');
  const distribution = (key) => [1, 2, 3, 4, 5].map((value) => reviews.filter((r) => r[key] === value).length);

  return {
    ...disciplineSummary(db, discipline),
    syllabus: discipline.syllabus,
    bibliography: discipline.bibliography,
    prerequisites: discipline.prerequisites.map(ref),
    unlocks: db.disciplines.filter((d) => d.prerequisites.includes(discipline.code)).map((d) => ref(d.code)),
    distribution: { difficulty: distribution('difficulty'), workload: distribution('workload') },
    veteranCount: db.users.filter((u) => u.completedDisciplines.includes(discipline.code)).length,
    viewer: currentUser ? {
      isVeteran: currentUser.completedDisciplines.includes(discipline.code),
      hasReviewed: reviews.some((r) => r.authorId === currentUser.id),
    } : null,
  };
}

function material(db, item, currentUser) {
  return {
    id: item.id,
    disciplineCode: item.disciplineCode,
    title: item.title,
    description: item.description,
    type: item.type,
    semester: item.semester,
    professor: item.professor,
    kind: item.kind,
    url: item.kind === 'link' ? item.url : null,
    file: item.file ? { name: item.file.originalName, size: item.file.size, mimeType: item.file.mimeType } : null,
    downloads: item.downloads,
    status: item.status,
    createdAt: item.createdAt,
    author: author(db, item.authorId, item.disciplineCode),
    isMine: Boolean(currentUser && currentUser.id === item.authorId),
    ...voteSummary(item.votes, currentUser),
  };
}

function review(db, item, currentUser) {
  return {
    id: item.id,
    disciplineCode: item.disciplineCode,
    difficulty: item.difficulty,
    workload: item.workload,
    semester: item.semester,
    professor: item.professor,
    comment: item.comment,
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    author: author(db, item.authorId, item.disciplineCode),
    isMine: Boolean(currentUser && currentUser.id === item.authorId),
  };
}

function answer(db, item, question, currentUser) {
  return {
    id: item.id,
    questionId: item.questionId,
    body: item.body,
    status: item.status,
    createdAt: item.createdAt,
    isBest: question.bestAnswerId === item.id,
    author: author(db, item.authorId, question.disciplineCode),
    isMine: Boolean(currentUser && currentUser.id === item.authorId),
    ...voteSummary(item.votes, currentUser),
  };
}

function question(db, item, currentUser, { withAnswers = false } = {}) {
  const discipline = db.disciplines.find((d) => d.code === item.disciplineCode);
  const activeAnswers = db.answers.filter((a) => a.questionId === item.id && a.status === 'active');
  const result = {
    id: item.id,
    disciplineCode: item.disciplineCode,
    disciplineName: discipline ? discipline.name : item.disciplineCode,
    title: item.title,
    body: item.body,
    status: item.status,
    createdAt: item.createdAt,
    answerCount: activeAnswers.length,
    hasBestAnswer: Boolean(item.bestAnswerId && activeAnswers.some((a) => a.id === item.bestAnswerId)),
    author: author(db, item.authorId, item.disciplineCode),
    isMine: Boolean(currentUser && currentUser.id === item.authorId),
  };

  if (withAnswers) {
    result.answers = activeAnswers
      .map((a) => answer(db, a, item, currentUser))
      .sort((a, b) => (Number(b.isBest) - Number(a.isBest)) || (b.score - a.score) || a.createdAt.localeCompare(b.createdAt));
  }
  return result;
}

function privateUser(user) {
  return {
    id: user.id,
    name: user.name,
    initials: initials(user.name),
    email: user.email,
    role: user.role,
    course: user.course,
    period: user.period,
    completedDisciplines: user.completedDisciplines,
    createdAt: user.createdAt,
  };
}

module.exports = {
  initials, author, voteSummary, disciplineStats, disciplineSummary, disciplineDetail,
  material, review, answer, question, privateUser,
};

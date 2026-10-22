/**
 * Configurações do portal. O MVP atende uma única instituição e um único curso,
 * então esses valores são fixos por instalação (definidos no .env).
 */
const MAX_UPLOAD_MB = 5;

function currentSemester(date = new Date()) {
  return `${date.getFullYear()}.${date.getMonth() < 6 ? 1 : 2}`;
}

/** Os últimos `count` semestres, do mais recente para o mais antigo ("2026.2", "2026.1", ...). */
function recentSemesters(count = 12) {
  let [year, half] = currentSemester().split('.').map(Number);
  const list = [];
  for (let i = 0; i < count; i += 1) {
    list.push(`${year}.${half}`);
    if (half === 2) half = 1;
    else { half = 2; year -= 1; }
  }
  return list;
}

module.exports = {
  institution: process.env.INSTITUTION_NAME || 'Instituto Politécnico',
  course: process.env.COURSE_NAME || 'Engenharia de Software',
  emailDomain: (process.env.INSTITUTIONAL_EMAIL_DOMAIN || 'alunos.politecnico.edu.br').toLowerCase(),
  exposeDevLinks: process.env.NODE_ENV !== 'production',
  maxUploadBytes: MAX_UPLOAD_MB * 1024 * 1024,
  maxUploadMB: MAX_UPLOAD_MB,
  allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif'],
  materialTypes: [
    { value: 'resumo', label: 'Resumo' },
    { value: 'prova', label: 'Prova antiga' },
    { value: 'lista', label: 'Lista de exercícios' },
    { value: 'trabalho', label: 'Trabalho / projeto' },
    { value: 'outro', label: 'Outro' },
  ],
  reportReasons: [
    { value: 'direito_autoral', label: 'Material protegido por direito autoral' },
    { value: 'ofensivo', label: 'Conteúdo ofensivo ou desrespeitoso' },
    { value: 'spam', label: 'Spam ou propaganda' },
    { value: 'incorreto', label: 'Informação incorreta ou enganosa' },
    { value: 'outro', label: 'Outro motivo' },
  ],
  currentSemester,
  recentSemesters,
};

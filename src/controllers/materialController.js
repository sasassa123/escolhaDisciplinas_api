const fs = require('fs');
const path = require('path');
const { getDb, save, nextId, UPLOAD_DIR } = require('../config/database');
const portal = require('../config/portal');
const { requireText } = require('../utils/text');
const { randomToken } = require('../utils/password');
const { badRequest, notFound, forbidden } = require('../utils/httpError');
const present = require('../utils/present');
const { findDiscipline } = require('./disciplineController');

const EXTENSIONS = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

// Assinatura dos primeiros bytes, para não confiar só no tipo declarado pelo navegador
const SIGNATURES = {
  'application/pdf': (b) => b.subarray(0, 4).toString('latin1') === '%PDF',
  'image/png': (b) => b[0] === 0x89 && b.subarray(1, 4).toString('latin1') === 'PNG',
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8,
  'image/webp': (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  'image/gif': (b) => b.subarray(0, 3).toString('latin1') === 'GIF',
};

function findMaterial(id) {
  const material = getDb().materials.find((m) => m.id === Number(id));
  if (!material || material.status !== 'active') throw notFound('Material não encontrado');
  return material;
}

/** GET /api/disciplines/:code/materials?type=&semester=&professor=&sort= (RF05/US02) */
function listMaterials(req, res) {
  const db = getDb();
  const discipline = findDiscipline(req.params.code);
  const { type, semester, professor, sort = 'recent' } = req.query;

  const list = db.materials
    .filter((m) => m.disciplineCode === discipline.code && m.status === 'active')
    .filter((m) => !type || m.type === type)
    .filter((m) => !semester || m.semester === semester)
    .filter((m) => !professor || m.professor === professor)
    .map((m) => present.material(db, m, req.user));

  const sorters = {
    recent: (a, b) => b.createdAt.localeCompare(a.createdAt),
    votes: (a, b) => b.score - a.score || b.downloads - a.downloads,
    downloads: (a, b) => b.downloads - a.downloads,
  };
  list.sort(sorters[sort] || sorters.recent);

  // Opções de filtro com base no que existe na disciplina
  const all = db.materials.filter((m) => m.disciplineCode === discipline.code && m.status === 'active');
  res.json({
    items: list,
    filters: {
      semesters: [...new Set(all.map((m) => m.semester))].sort().reverse(),
      professors: [...new Set(all.map((m) => m.professor))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      types: [...new Set(all.map((m) => m.type))],
    },
  });
}

function decodeFile(file, errors) {
  if (!file || typeof file !== 'object') {
    errors.push('Selecione um arquivo PDF ou imagem');
    return null;
  }
  const mimeType = String(file.type || '');
  if (!portal.allowedMimeTypes.includes(mimeType)) {
    errors.push('Formato não aceito. Envie PDF, PNG, JPG, WEBP ou GIF');
    return null;
  }
  const base64 = String(file.data || '').replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length) {
    errors.push('O arquivo está vazio');
    return null;
  }
  if (buffer.length > portal.maxUploadBytes) {
    errors.push(`O arquivo passa do limite de ${portal.maxUploadMB} MB`);
    return null;
  }
  if (!SIGNATURES[mimeType](buffer)) {
    errors.push('O conteúdo do arquivo não corresponde ao formato informado');
    return null;
  }
  const originalName = path.basename(String(file.name || `material${EXTENSIONS[mimeType]}`)).slice(0, 120);
  return { buffer, mimeType, originalName };
}

/**
 * POST /api/disciplines/:code/materials — upload de material (RF04/US04).
 * Corpo: { title, description?, type, semester, professor, link? , file?: { name, type, data(base64) } }
 * Exige tipo, semestre e professor; o material aparece na disciplina logo após o envio.
 */
function createMaterial(req, res) {
  const db = getDb();
  const discipline = findDiscipline(req.params.code);
  const body = req.body || {};
  const errors = [];

  const title = requireText(body.title, 'Título', errors, { min: 3, max: 120 });
  const description = typeof body.description === 'string' ? body.description.trim().slice(0, 600) : '';
  if (!portal.materialTypes.some((t) => t.value === body.type)) errors.push('Escolha o tipo do material');
  if (!/^\d{4}\.[12]$/.test(String(body.semester || ''))) errors.push('Escolha o semestre em que o material foi produzido');
  const professor = requireText(body.professor, 'Professor', errors, { max: 80 });

  let kind = 'file';
  let url = null;
  let file = null;
  if (body.link) {
    kind = 'link';
    try {
      const parsed = new URL(String(body.link).trim());
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
      url = parsed.toString();
    } catch {
      errors.push('Informe um link válido começando com http:// ou https://');
    }
  } else {
    file = decodeFile(body.file, errors);
  }

  if (errors.length) throw badRequest(errors[0], errors);

  const material = {
    id: nextId('materials'),
    disciplineCode: discipline.code,
    authorId: req.user.id,
    title,
    description,
    type: body.type,
    semester: body.semester,
    professor,
    kind,
    url,
    file: null,
    downloads: 0,
    votes: {},
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  if (file) {
    const storedName = `${material.id}-${randomToken(6)}${EXTENSIONS[file.mimeType]}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, storedName), file.buffer);
    material.file = { storedName, originalName: file.originalName, mimeType: file.mimeType, size: file.buffer.length };
  }

  db.materials.push(material);
  save();
  res.status(201).json(present.material(db, material, req.user));
}

/** GET /api/materials/:id/download — conta o download e entrega o arquivo ou redireciona ao link (RF05). */
function downloadMaterial(req, res) {
  const material = findMaterial(req.params.id);
  material.downloads += 1;
  save();

  if (material.kind === 'link') return res.redirect(material.url);
  const filePath = path.join(UPLOAD_DIR, material.file.storedName);
  if (!fs.existsSync(filePath)) throw notFound('Arquivo não encontrado no servidor');
  res.download(filePath, material.file.originalName);
}

/** GET /api/materials/:id/view — abre o arquivo no navegador (sem contar download). */
function viewMaterial(req, res) {
  const material = findMaterial(req.params.id);
  if (material.kind === 'link') return res.redirect(material.url);
  const filePath = path.join(UPLOAD_DIR, material.file.storedName);
  if (!fs.existsSync(filePath)) throw notFound('Arquivo não encontrado no servidor');
  res.type(material.file.mimeType);
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(material.file.originalName)}`);
  res.sendFile(filePath);
}

/** Aplica um voto (+1, -1 ou 0 para retirar) num item com mapa de votos. */
function applyVote(item, user, value) {
  const vote = Number(value);
  if (![1, -1, 0].includes(vote)) throw badRequest('Voto inválido');
  if (item.authorId === user.id) throw forbidden('Você não pode votar no seu próprio conteúdo');
  if (vote === 0) delete item.votes[String(user.id)];
  else item.votes[String(user.id)] = vote;
  save();
}

/** POST /api/materials/:id/vote — { value: 1 | -1 | 0 } (RF07) */
function voteMaterial(req, res) {
  const db = getDb();
  const material = findMaterial(req.params.id);
  applyVote(material, req.user, (req.body || {}).value);
  res.json(present.material(db, material, req.user));
}

/** DELETE /api/materials/:id — o autor pode retirar o próprio material. */
function deleteMaterial(req, res) {
  const material = findMaterial(req.params.id);
  if (material.authorId !== req.user.id) throw forbidden('Só quem enviou pode excluir este material');
  material.status = 'deleted';
  save();
  res.status(204).end();
}

module.exports = { listMaterials, createMaterial, downloadMaterial, viewMaterial, voteMaterial, deleteMaterial, applyVote };

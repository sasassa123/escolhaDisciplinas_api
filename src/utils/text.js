/**
 * Normaliza texto para busca: minúsculas e sem acentos ("Cálculo" → "calculo").
 */
function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function matches(query, ...fields) {
  const q = normalize(query);
  if (!q) return true;
  const haystack = normalize(fields.join(' '));
  return q.split(/\s+/).every((term) => haystack.includes(term));
}

/**
 * Valida um campo de texto obrigatório e devolve a versão sem espaços nas pontas.
 * Adiciona a mensagem de erro em `errors` quando inválido.
 */
function requireText(value, label, errors, { min = 1, max = 5000 } = {}) {
  if (typeof value !== 'string' || value.trim().length < min) {
    errors.push(min > 1 ? `${label} precisa ter pelo menos ${min} caracteres` : `${label} é obrigatório`);
    return '';
  }
  const text = value.trim();
  if (text.length > max) errors.push(`${label} pode ter no máximo ${max} caracteres`);
  return text;
}

module.exports = { normalize, matches, requireText };

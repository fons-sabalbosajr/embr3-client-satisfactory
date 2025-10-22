// Canonical service category lists for grouping "Services Availed" options
// Lists are configurable via .env using JSON arrays for clarity and flexibility.
// Example in front-end/.env:
// VITE_EXTERNAL_SERVICES=["Certificate of Conformity (COC)","...other..."]
// VITE_INTERNAL_SERVICES=["Provision of Speeches/Messages ...","...other..."]

function parseEnvList(value) {
  if (!value) return [];
  const raw = String(value).trim();

  // 1) Try strict JSON first
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {}

  // 2) Try lenient JSON: replace single quotes with double quotes if it looks like an array
  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const normalized = raw.replace(/'/g, '"');
      const parsed2 = JSON.parse(normalized);
      if (Array.isArray(parsed2)) return parsed2.filter(Boolean);
    } catch {}
  }

  // 3) Fallback: strip wrappers and split by common separators
  const stripped = raw
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .replace(/^"|"$/g, '')
    .replace(/^'|'$/g, '');

  const tokens = stripped
    .split(/\n|,|;|\|/)
    .map((s) => s.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, ''))
    .filter((s) => s && /[A-Za-z0-9]/.test(s) && s !== '[' && s !== ']');

  return tokens;
}

const externalFromEnv = parseEnvList(import.meta.env.VITE_EXTERNAL_SERVICES);
const internalFromEnv = parseEnvList(import.meta.env.VITE_INTERNAL_SERVICES);

export const EXTERNAL_SERVICES = externalFromEnv;
export const INTERNAL_SERVICES = internalFromEnv;

export function categorizeServices(options) {
  const toKey = (s) => String(s || "").trim().toLowerCase();
  const extSet = new Set(EXTERNAL_SERVICES.map(toKey));
  const intSet = new Set(INTERNAL_SERVICES.map(toKey));

  const internal = [];
  const external = [];
  const other = [];
  (options || []).forEach((opt) => {
    const k = toKey(opt);
    if (intSet.has(k)) internal.push(opt);
    else if (extSet.has(k)) external.push(opt);
    else other.push(opt);
  });

  return { internal, external, other };
}

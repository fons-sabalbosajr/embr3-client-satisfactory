// In-memory cache of survey responses (collection "client-satisfactory-data").
//
// Why: the link to the shared free-tier Atlas cluster is slow and erratic for
// large replies — the ~120 KB Measurement list took 5–15 s while the query
// itself ran in 0 ms on Atlas. Every write to this collection goes through this
// server (survey submit, feedback POST/PUT/DELETE), so those paths update the
// cache in place and readers are served from memory. Only the first read after
// a restart (or after TTL expiry) has to cross the slow link, and even then a
// stale copy is served while a fresh one loads in the background.
//
// Small cursor batches are used because, on this link, many small replies
// arrive far faster than one large one.

import ClientSatisfactory from "../models/clientsatisfactory.js";

const TTL_MS = 5 * 60 * 1000; // re-sync with Atlas at most every 5 minutes
const BATCH_SIZE = 5;

let cache = null; // array of plain docs, newest first
let loadedAt = 0;
let inflight = null;

const idOf = (doc) => String(doc?._id ?? "");
const toPlain = (doc) => (doc && typeof doc.toObject === "function" ? doc.toObject() : doc);
const byNewest = (a, b) => new Date(b?.submittedAt || 0) - new Date(a?.submittedAt || 0);

function load() {
  if (!inflight) {
    inflight = ClientSatisfactory.find({})
      .sort({ submittedAt: -1 })
      .batchSize(BATCH_SIZE)
      .lean()
      .then((docs) => {
        cache = docs;
        loadedAt = Date.now();
        return docs;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/**
 * All survey responses, newest first (plain objects — do not mutate).
 * Serves a stale copy while refreshing in the background once TTL passes.
 */
export async function getSurveys() {
  if (cache && Date.now() - loadedAt < TTL_MS) return cache;
  if (cache) {
    load().catch((err) => console.error("surveyCache refresh failed:", err.message));
    return cache;
  }
  return load();
}

/** Pre-load at startup so the first admin visit is fast. Never throws. */
export function warmSurveyCache() {
  load()
    .then((docs) => console.log(`surveyCache: loaded ${docs.length} responses`))
    .catch((err) => console.error("surveyCache warm-up failed:", err.message));
}

export function cacheAdd(doc) {
  if (!cache) return;
  const plain = toPlain(doc);
  cache = [plain, ...cache.filter((d) => idOf(d) !== idOf(plain))].sort(byNewest);
}

export function cacheUpdate(doc) {
  if (!cache || !doc) return;
  const plain = toPlain(doc);
  cache = cache.map((d) => (idOf(d) === idOf(plain) ? plain : d));
}

export function cacheRemove(id) {
  if (!cache) return;
  cache = cache.filter((d) => idOf(d) !== String(id));
}

/** Reload from Atlas now and wait for it (Developer Settings → System). */
export function reloadSurveys() {
  return load();
}

/** Force the next read to go to Atlas (e.g. after an out-of-band change). */
export function invalidateSurveyCache() {
  loadedAt = 0;
}

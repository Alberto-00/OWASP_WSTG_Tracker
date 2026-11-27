// Controllo di coerenza dei dati della checklist (npm run check:data).
// Da eseguire dopo ogni modifica ai JSON in public/json o alla mappatura Top 10.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TOP10_2021, TOP10_BY_TEST, TOP10_NEW_2025 } from '../src/lib/top10Mapping.ts';
import { canonicalProgress, normalizeProgress } from '../src/lib/progress.ts';

const json = (path) => JSON.parse(readFileSync(new URL(`../public/json/${path}`, import.meta.url), 'utf8'));
const LANGS = ['en', 'it'];
// Tag ammessi nei contenuti HTML: un "<webmail>" o "<base>" non escapato verrebbe interpretato dal renderer
const ALLOWED_TAGS = new Set(['p', 'li', 'ul', 'ol', 'h3', 'h4', 'h5', 'h6', 'pre', 'code', 'br', 'b', 'strong', 'i', 'em', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote', 'span', 'del', 'hr', 'sup', 'sub']);
const CODES = Array.from({ length: 10 }, (_, i) => `A${String(i + 1).padStart(2, '0')}`);
const checkHtml = (html, where) => {
  for (const [, tag, attrs] of html.matchAll(/<\/?([A-Za-z][\w-]*)([^<>]*)>/g)) {
    assert.ok(ALLOWED_TAGS.has(tag.toLowerCase()), `${where}: tag non ammesso <${tag}>`);
    assert.ok(!/\bon\w+\s*=|javascript:/i.test(attrs), `${where}: attributo pericoloso`);
  }
};

const tests = {};
for (const lang of LANGS) {
  const { categories } = json(`${lang}/checklist.json`);
  tests[lang] = Object.entries(categories).flatMap(([name, c]) => c.tests.map((t) => ({ ...t, category: c.id, categoryName: name })));
}
const ids = tests.en.map((t) => t.id);
assert.equal(new Set(ids).size, ids.length, 'ID dei test duplicati');
assert.deepEqual(tests.it.map((t) => t.id), ids, 'EN e IT hanno test diversi');

// Riferimenti WSTG: tutti fissati allo stesso commit (gli URL "latest" cambiano mentre esce la v5)
const pinned = /^https:\/\/github\.com\/OWASP\/wstg\/blob\/([0-9a-f]{40})\/document\/.+\.md$/;
const shas = new Set(tests.en.concat(tests.it).map((t) => (pinned.exec(t.reference) || assert.fail(`riferimento non fissato: ${t.id} ${t.reference}`))[1]));
assert.equal(shas.size, 1, 'riferimenti WSTG su commit diversi');

for (const lang of LANGS) {
  const names = [...new Set(tests[lang].map((t) => t.categoryName))];
  assert.deepEqual(Object.keys(json(`${lang}/category_descriptions.json`)).sort(), names.sort(), `${lang}: descrizioni categoria`);

  const info = json(`${lang}/checklist_info_data.json`);
  assert.deepEqual(Object.keys(info).sort(), [...ids].sort(), `${lang}: contenuti dei test`);
  for (const [id, sections] of Object.entries(info)) {
    for (const [field, html] of Object.entries(sections)) {
      checkHtml(html, `${lang} ${id} ${field}`);
      for (const [, target] of html.matchAll(/href="#(WSTG-[A-Z]+-\d+)"/g)) {
        assert.ok(ids.includes(target), `${lang} ${id} ${field}: link a test inesistente ${target}`);
      }
      assert.ok(!html.includes('href="#"'), `${lang} ${id} ${field}: link vuoto`);
    }
  }

  const top10 = json(`${lang}/owasp_top_10.json`);
  assert.deepEqual(Object.keys(top10).map((k) => k.slice(0, 8)), CODES.map((c) => `${c}:2025`), `${lang}: Top 10 non 2025`);
  // Dati ufficiali (scripts/import-top10.mjs): tabella dei punteggi, testi e CWE mappate
  for (const [key, item] of Object.entries(top10)) {
    assert.match(item.link, /^https:\/\/top10\.owasp\.org\/2025\//, `${lang} ${key}: link`);
    assert.equal(item.stats.length, 9, `${lang} ${key}: tabella dei punteggi`);
    assert.equal(item.cwes.length, Number(item.stats[0][1]), `${lang} ${key}: CWE mappate diverse dalla tabella`);
    for (const field of ['background', 'description', 'prevention', 'scenarios', 'references']) {
      assert.ok(item[field], `${lang} ${key}: ${field} vuoto`);
      checkHtml(item[field], `${lang} ${key} ${field}`);
    }
  }
}
assert.deepEqual(Object.keys(json('en/owasp_top_10.json')), Object.keys(json('it/owasp_top_10.json')), 'Top 10 EN/IT diverse');

// Mappatura Top 10: copre tutti i test, solo codici validi, senza duplicati
assert.deepEqual(Object.keys(TOP10_BY_TEST).sort(), [...ids].sort(), 'mappatura Top 10 incompleta');
for (const [id, codes] of Object.entries(TOP10_BY_TEST)) {
  assert.ok(codes.every((c) => CODES.includes(c)), `${id}: codice Top 10 non valido`);
  assert.equal(new Set(codes).size, codes.length, `${id}: codici duplicati`);
}
const mapped = new Set(Object.values(TOP10_BY_TEST).flat());
assert.deepEqual([...mapped].sort(), CODES, 'categorie Top 10 senza test collegati');

// Top 10:2021 → 2025: ogni categoria 2021 una volta e in ordine, verso codici validi; una 2025 senza provenienza è "nuova"
assert.deepEqual(TOP10_2021.map((o) => o.code), CODES, 'Top 10:2021 incompleta o fuori ordine');
assert.ok(TOP10_2021.every((o) => CODES.includes(o.to)), 'Top 10:2021 verso un codice 2025 non valido');
assert.ok(CODES.every((c) => TOP10_2021.some((o) => o.to === c && !o.merged) || TOP10_NEW_2025.includes(c)), 'categoria 2025 senza provenienza non segnata come nuova');

// File di avanzamento: progress.json incluso + validazione dei file aperti dall'utente
const progress = normalizeProgress(json('progress.json'));
assert.ok(Object.keys(progress.status).every((id) => ids.includes(id)), 'progress.json: ID sconosciuti');
assert.throws(() => normalizeProgress([]), 'un array non è un salvataggio');
assert.throws(() => normalizeProgress({ foo: 1 }), 'oggetto senza status/notes');
assert.deepEqual(
  normalizeProgress({ status: { A: 'done', B: 'hacked', C: 3 }, notes: { A: '<p>x</p>', B: '<p></p>', C: 5 } }),
  { status: { A: 'done' }, notes: { A: '<p>x</p>' } },
);
assert.equal(
  canonicalProgress({ status: { B: 'done', A: 'pending' }, notes: { X: '<p></p>' } }),
  canonicalProgress({ status: { B: 'done' }, notes: {} }),
  'ordine delle chiavi, stati pending e note vuote non contano come modifiche',
);
assert.notEqual(canonicalProgress({ status: { A: 'done' }, notes: {} }), canonicalProgress({ status: { A: 'in-progress' }, notes: {} }));

console.log(`OK: ${ids.length} test, ${mapped.size} categorie Top 10:2025, riferimenti WSTG al commit ${[...shas][0].slice(0, 10)}`);

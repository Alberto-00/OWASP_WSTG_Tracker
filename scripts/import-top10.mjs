// Importa le categorie OWASP Top 10:2025 dalle pagine ufficiali (inglese e italiano) in
// public/json/<lingua>/owasp_top_10.json. Sorgente: repository OWASP/Top10 al commit fissato,
// lo stesso testo pubblicato su https://top10.owasp.org/2025/.
// Uso: npm run import:top10 (poi npm run check:data)
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SHA = 'ef7a95c3d49cf80ab5c0c4e53634c89c5d5a21cc';
const RAW = `https://raw.githubusercontent.com/OWASP/Top10/${SHA}/2025/docs`;
const SITE = 'https://top10.owasp.org/2025';
const PAGES = [
  'A01_2025-Broken_Access_Control',
  'A02_2025-Security_Misconfiguration',
  'A03_2025-Software_Supply_Chain_Failures',
  'A04_2025-Cryptographic_Failures',
  'A05_2025-Injection',
  'A06_2025-Insecure_Design',
  'A07_2025-Authentication_Failures',
  'A08_2025-Software_or_Data_Integrity_Failures',
  'A09_2025-Security_Logging_and_Alerting_Failures',
  'A10_2025-Mishandling_of_Exceptional_Conditions',
];
// Stesso ordine in ogni lingua: Background/Contesto, Score table/Tabella dei punteggi, Description/Descrizione, …
const SECTIONS = ['background', 'scores', 'description', 'prevention', 'scenarios', 'references', 'cwes'];

const page = async (lang, name) => {
  const res = await fetch(`${RAW}/${lang}/${name}.md`);
  assert.ok(res.ok, `${lang}/${name}: HTTP ${res.status}`);
  const md = (await res.text()).replace(/\r\n/g, '\n');
  const parts = md.split(/^## .*$/m);
  assert.equal(parts.length, SECTIONS.length + 1, `${lang}/${name}: sezioni inattese`);
  const sections = Object.fromEntries(SECTIONS.map((key, i) => [key, parts[i + 1].trim()]));
  // Tabella dei punteggi (HTML nel markdown): prima riga etichette, seconda valori, come pubblicati
  const rows = [...sections.scores.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(([, row]) => [...row.matchAll(/<td>([\s\S]*?)<\/td>/g)].map(([, cell]) => cell.trim()));
  assert.equal(rows.length, 2, `${lang}/${name}: tabella dei punteggi`);
  return { title: /^#\s+A\d\d:2025\s+(.+?)\s+!\[/m.exec(md)[1], sections, stats: rows[0].map((label, i) => [label, rows[1][i]]) };
};

const html = (md, lang) =>
  renderToStaticMarkup(
    h(
      Markdown,
      {
        remarkPlugins: [remarkGfm],
        components: {
          h3: ({ children }) => h('h4', null, children),
          // Link tra pagine della Top 10 (relativi nel sorgente) → pagina sul sito ufficiale
          a: ({ href = '', children }) =>
            h('a', { href: /^https?:/.test(href) ? href : `${SITE}/${lang === 'en' ? '' : `${lang}/`}${href.replace(/\.md$/, '/')}` }, children),
        },
      },
      md,
    ),
  );

const out = { en: {}, it: {} };
for (const name of PAGES) {
  const [en, it] = await Promise.all([page('en', name), page('it', name)]);
  // Elenco CWE dalla pagina inglese: quello italiano è incompleto in alcune categorie (es. A05, A06, A07)
  const cwes = [...en.sections.cwes.matchAll(/\[(CWE-\d+)\s+([^\]]+)\]\((https:[^)]+)\)/g)].map(([, id, cweName, url]) => ({ id, name: cweName.trim(), url }));
  assert.equal(cwes.length, Number(en.stats[0][1]), `${name}: CWE elencate diverse dalla tabella`);
  assert.deepEqual(
    it.stats.map(([, value]) => value.replace(/[.,]/g, '')),
    en.stats.map(([, value]) => value.replace(/[.,]/g, '')),
    `${name}: punteggi EN/IT diversi`,
  );
  const key = `${name.slice(0, 3)}:2025 - ${en.title}`;
  for (const [lang, data] of Object.entries({ en, it })) {
    const s = data.sections;
    out[lang][key] = {
      link: `${SITE}/${lang === 'en' ? '' : `${lang}/`}${name}/`,
      stats: data.stats,
      background: html(s.background, lang),
      description: html(s.description, lang),
      prevention: html(s.prevention, lang),
      scenarios: html(s.scenarios, lang),
      references: html(s.references, lang),
      cwes,
    };
  }
}
for (const lang of ['en', 'it']) {
  writeFileSync(new URL(`../public/json/${lang}/owasp_top_10.json`, import.meta.url), JSON.stringify(out[lang], null, 2) + '\n');
}
console.log(`OK: ${PAGES.length} categorie, OWASP/Top10 @ ${SHA.slice(0, 10)}`);

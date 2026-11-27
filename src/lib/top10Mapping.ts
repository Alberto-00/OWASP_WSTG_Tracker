// Mappatura di ogni test WSTG alle categorie OWASP Top 10:2025 delle debolezze che può far emergere.
// La prima categoria è la principale. Riferimento: le CWE che OWASP assegna a ciascuna categoria 2025
// (es. CSRF CWE-352 e SSRF CWE-918 in A01, cookie Secure/HttpOnly CWE-614/1004 in A02, upload CWE-434 in A06,
// mass assignment CWE-915 in A08, errori verbosi CWE-209 in A10).
// I test di sola ricognizione (lista vuota) non corrispondono a una categoria specifica.
export const TOP10_BY_TEST: Record<string, string[]> = {
  'WSTG-INFO-01': ['A01', 'A02'],
  'WSTG-INFO-02': ['A02', 'A03'],
  'WSTG-INFO-03': ['A01', 'A02'],
  'WSTG-INFO-04': ['A02'],
  'WSTG-INFO-05': ['A01', 'A02'],
  'WSTG-INFO-06': [],
  'WSTG-INFO-07': [],
  'WSTG-INFO-08': ['A03', 'A02'],
  'WSTG-INFO-09': ['A03', 'A02'],
  'WSTG-INFO-10': [],

  'WSTG-CONF-01': ['A02', 'A03'],
  'WSTG-CONF-02': ['A02', 'A09'],
  'WSTG-CONF-03': ['A02', 'A01'],
  'WSTG-CONF-04': ['A02', 'A01'],
  'WSTG-CONF-05': ['A02', 'A01'],
  'WSTG-CONF-06': ['A02', 'A01'],
  'WSTG-CONF-07': ['A02', 'A04'],
  'WSTG-CONF-08': ['A02'],
  'WSTG-CONF-09': ['A01', 'A02'],
  'WSTG-CONF-10': ['A02'],
  'WSTG-CONF-11': ['A02', 'A01'],
  'WSTG-CONF-12': ['A02'],
  'WSTG-CONF-13': ['A02'],
  'WSTG-CONF-14': ['A02'],

  'WSTG-IDNT-01': ['A01', 'A06'],
  'WSTG-IDNT-02': ['A07', 'A06'],
  'WSTG-IDNT-03': ['A01', 'A06'],
  'WSTG-IDNT-04': ['A07'],
  'WSTG-IDNT-05': ['A07'],

  'WSTG-ATHN-01': ['A04', 'A07'],
  'WSTG-ATHN-02': ['A07', 'A02'],
  'WSTG-ATHN-03': ['A07'],
  'WSTG-ATHN-04': ['A07', 'A01'],
  'WSTG-ATHN-05': ['A07', 'A06'],
  'WSTG-ATHN-06': ['A06', 'A02'],
  'WSTG-ATHN-07': ['A07'],
  'WSTG-ATHN-08': ['A07'],
  'WSTG-ATHN-09': ['A07'],
  'WSTG-ATHN-10': ['A07'],
  'WSTG-ATHN-11': ['A07'],

  'WSTG-ATHZ-01': ['A01', 'A05'],
  'WSTG-ATHZ-02': ['A01'],
  'WSTG-ATHZ-03': ['A01'],
  'WSTG-ATHZ-04': ['A01'],
  'WSTG-ATHZ-05': ['A07', 'A01'],

  'WSTG-SESS-01': ['A07', 'A04'],
  'WSTG-SESS-02': ['A02', 'A01'],
  'WSTG-SESS-03': ['A07'],
  'WSTG-SESS-04': ['A07', 'A04'],
  'WSTG-SESS-05': ['A01'],
  'WSTG-SESS-06': ['A07'],
  'WSTG-SESS-07': ['A07'],
  'WSTG-SESS-08': ['A07', 'A06'],
  'WSTG-SESS-09': ['A07', 'A04'],
  'WSTG-SESS-10': ['A07', 'A04', 'A08'],
  'WSTG-SESS-11': ['A07'],

  'WSTG-INPV-01': ['A05'],
  'WSTG-INPV-02': ['A05'],
  'WSTG-INPV-03': ['A01', 'A02'],
  'WSTG-INPV-04': ['A05', 'A10'],
  'WSTG-INPV-05': ['A05'],
  'WSTG-INPV-06': ['A05'],
  'WSTG-INPV-07': ['A05', 'A02'],
  'WSTG-INPV-08': ['A05'],
  'WSTG-INPV-09': ['A05'],
  'WSTG-INPV-10': ['A05'],
  'WSTG-INPV-11': ['A05'],
  'WSTG-INPV-12': ['A05'],
  'WSTG-INPV-13': ['A05'],
  'WSTG-INPV-14': ['A05'],
  'WSTG-INPV-15': ['A05', 'A06'],
  'WSTG-INPV-16': [],
  'WSTG-INPV-17': ['A05', 'A01'],
  'WSTG-INPV-18': ['A05'],
  'WSTG-INPV-19': ['A01'],
  'WSTG-INPV-20': ['A08', 'A01'],

  'WSTG-ERRH-01': ['A10', 'A02'],
  'WSTG-ERRH-02': ['A10', 'A02'],

  'WSTG-CRYP-01': ['A04'],
  'WSTG-CRYP-02': ['A04'],
  'WSTG-CRYP-03': ['A04'],
  'WSTG-CRYP-04': ['A04'],

  'WSTG-BUSL-01': ['A06'],
  'WSTG-BUSL-02': ['A06'],
  'WSTG-BUSL-03': ['A08', 'A06'],
  'WSTG-BUSL-04': ['A06'],
  'WSTG-BUSL-05': ['A06'],
  'WSTG-BUSL-06': ['A06'],
  'WSTG-BUSL-07': ['A09', 'A06'],
  'WSTG-BUSL-08': ['A06'],
  'WSTG-BUSL-09': ['A06'],
  'WSTG-BUSL-10': ['A06', 'A08'],

  'WSTG-CLNT-01': ['A05'],
  'WSTG-CLNT-02': ['A05'],
  'WSTG-CLNT-03': ['A05'],
  'WSTG-CLNT-04': ['A01'],
  'WSTG-CLNT-05': ['A05'],
  'WSTG-CLNT-06': ['A05'],
  'WSTG-CLNT-07': ['A02', 'A01'],
  'WSTG-CLNT-08': ['A05'],
  'WSTG-CLNT-09': ['A06', 'A02'],
  'WSTG-CLNT-10': ['A01', 'A04', 'A05'],
  'WSTG-CLNT-11': ['A05', 'A01'],
  'WSTG-CLNT-12': ['A01', 'A06'],
  'WSTG-CLNT-13': ['A01'],
  'WSTG-CLNT-14': ['A06'],

  'WSTG-APIT-01': ['A02', 'A01'],
  'WSTG-APIT-02': ['A01'],
  'WSTG-APIT-99': ['A02', 'A01', 'A05'],
};

// Codice breve ("A05") dalla chiave di owasp_top_10.json ("A05:2025 - Injection").
export const top10Code = (key: string) => key.slice(0, 3);

// OWASP Top 10:2021 → 2025 come nella figura ufficiale dell'introduzione 2025
// (https://top10.owasp.org/2025/0x00_2025-Introduction/): ogni categoria 2021 e la categoria 2025 in cui è confluita.
// SSRF (A10:2021) è stata accorpata in A01:2025: è la linea tratteggiata della figura.
export const TOP10_2021 = [
  { code: 'A01', name: 'Broken Access Control', to: 'A01' },
  { code: 'A02', name: 'Cryptographic Failures', to: 'A04' },
  { code: 'A03', name: 'Injection', to: 'A05' },
  { code: 'A04', name: 'Insecure Design', to: 'A06' },
  { code: 'A05', name: 'Security Misconfiguration', to: 'A02' },
  { code: 'A06', name: 'Vulnerable and Outdated Components', to: 'A03' },
  { code: 'A07', name: 'Identification and Authentication Failures', to: 'A07' },
  { code: 'A08', name: 'Software and Data Integrity Failures', to: 'A08' },
  { code: 'A09', name: 'Security Logging and Monitoring Failures', to: 'A09' },
  { code: 'A10', name: 'Server-Side Request Forgery (SSRF)', to: 'A01', merged: true },
];

// Segnate "(New)" nella figura: A03 amplia A06:2021, A10 non ha precedenti
export const TOP10_NEW_2025 = ['A03', 'A10'];

// Posizioni guadagnate (> 0) o perse (< 0) passando al 2025; null se la categoria è stata accorpata
export const rankChange = (o: (typeof TOP10_2021)[number]) => (o.merged ? null : Number(o.code.slice(1)) - Number(o.to.slice(1)));

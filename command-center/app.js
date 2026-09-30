// Classic script, not a module: browsers refuse to run modules from a page opened
// straight from disk, and this page has to work when index.html is double-clicked.
(() => {
const SAMPLE = window.CC_SAMPLE;
const NOTES = window.CC_NOTES ?? { decisions: [], notes: [] };
const DATA_MODEL = window.CC_DATA_MODEL ?? { tables: [] };

// Everything on this page is read at runtime from the files the platform commits.
// Paths are relative to index.html at the repo root.
const DATA_DIR = '.colaberry/';

// The build was paused at the Overview checkpoint for review; all tabs are built now.
const PAUSED_AT_OVERVIEW = false;

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'outcomes', label: 'Outcomes' },
  { id: 'users', label: 'Users & use case' },
  { id: 'guardrails', label: 'Guardrails' },
  { id: 'systems', label: 'Systems' },
  { id: 'project', label: 'Project management' },
  { id: 'agents', label: 'AI agents' },
  { id: 'knowledge', label: 'Knowledge base' },
  { id: 'data-model', label: 'Data model' },
];

const DAY_MS = 86_400_000;
const STALE_AFTER_DAYS = 7;

const STATE_LABELS = {
  not_started: 'Not started',
  in_progress: 'In progress',
  submitted: 'Submitted',
  verified: 'Verified',
};

const app = document.getElementById('app');
let data = null; // { plan, progress, manifest, manifestError }
let mode = readMode();
const chatLog = []; // Knowledge base questions and answers for this visit

// ---------------------------------------------------------------- helpers

const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function readMode() {
  try {
    return localStorage.getItem('cc-mode') === 'sample' ? 'sample' : 'real';
  } catch (err) {
    console.warn('Mode preference unavailable, defaulting to Real:', err);
    return 'real';
  }
}

function writeMode(m) {
  try {
    localStorage.setItem('cc-mode', m);
  } catch (err) {
    console.warn('Could not remember the mode preference; it lasts for this visit only:', err);
  }
}

async function fetchJson(name) {
  const res = await fetch(DATA_DIR + name, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${DATA_DIR}${name} returned HTTP ${res.status}`);
  return res.json();
}

// 'YYYY-MM-DD' -> Date at local midnight, so plan dates are not shifted by time zone.
function dayOnly(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function today() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}
const fmtDate = (d) => (d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');
const fmtDay = (iso) => (iso ? fmtDate(dayOnly(iso)) : 'no date');
const daysBetween = (a, b) => Math.round((b - a) / DAY_MS);
const plural = (n, word) => `${n} ${n === 1 ? word : /[^aeiou]y$/.test(word) ? word.slice(0, -1) + 'ies' : word + 's'}`;
const money = (n) => `${SAMPLE.currency}${Number(n).toLocaleString('en-NG')}`;

function relAge(ms) {
  if (ms < 0) return 'timestamp is in the future — check your clock';
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return 'less than an hour ago';
  if (hours < 24) return `${plural(hours, 'hour')} ago`;
  return `${plural(Math.floor(hours / 24), 'day')} ago`;
}

const sampleBadge = () => '<span class="badge badge-sample" title="Made-up data for Sample mode">SAMPLE</span>';
const stateLabel = (state) => (state ? STATE_LABELS[state] ?? state : 'Not checked yet');
const orNotReported = (v) => (v === null || v === undefined ? '<span class="muted">not reported</span>' : esc(v));

// ---------------------------------------------------------------- data model

// Joins plan and progress on story id. Completion comes from progress only.
function model() {
  const { plan, progress } = data;
  const progressById = new Map((progress.stories ?? []).map((s) => [s.id, s]));
  const stories = (plan.stories ?? []).map((s) => {
    const v = progressById.get(s.id)?.verification ?? null;
    return { ...s, v, state: v?.state ?? null, inPlan: true };
  });
  const planIds = new Set(stories.map((s) => s.id));
  // Stories the platform tracks in progress.json that have no entry in plan.json (e.g. STORY-000).
  const extra = (progress.stories ?? [])
    .filter((p) => !planIds.has(p.id))
    .map((p) => ({
      id: p.id,
      title: null,
      release: p.release ?? null,
      acceptance: (p.criteria ?? []).map((c) => c.text),
      v: p.verification ?? null,
      state: p.verification?.state ?? null,
      inPlan: false,
    }));
  const isBuilt = (req) =>
    (req.fulfilled_by ?? []).length > 0 &&
    req.fulfilled_by.every((id) => progressById.get(id)?.verification?.state === 'verified');
  return { plan, progress, progressById, stories, allStories: [...stories, ...extra], isBuilt };
}

function termPosition(plan) {
  const s = plan.schedule ?? null;
  const t = today();
  const current = (plan.releases ?? []).filter(
    (r) => r.starts_on && r.ends_on && dayOnly(r.starts_on) <= t && t <= dayOnly(r.ends_on),
  );
  let phase;
  if (!s) phase = 'No schedule in plan.json';
  else if (s.build_start && t < dayOnly(s.build_start)) phase = `Build starts ${fmtDay(s.build_start)}`;
  else if (s.build_end && t <= dayOnly(s.build_end)) phase = 'Building';
  else if (s.demo_day && t <= dayOnly(s.demo_day)) phase = 'Demo prep';
  else phase = 'Term finished';
  return { schedule: s, current, phase, t };
}

function demoRelease(plan) {
  const releases = plan.releases ?? [];
  return releases.find((r) => r.is_demo_target) ?? releases.find((r) => r.key === plan.schedule?.demo_release_key) ?? null;
}

function systemRows(plan) {
  return (plan.derived?.systems ?? []).map((name, i) => {
    if (mode !== 'sample') return { name, status: 'unknown', label: 'Not checked from here', checked: 'Never — nothing in this repo can reach it', sample: false };
    const status = SAMPLE.systemStatuses[i % SAMPLE.systemStatuses.length];
    const mins = SAMPLE.systemCheckedMinutesAgo[i % SAMPLE.systemCheckedMinutesAgo.length];
    const label = { connected: 'Connected', not_connected: 'Not connected', error: 'Error' }[status];
    return { name, status, label, checked: `${plural(mins, 'minute')} ago`, sample: true };
  });
}

// ---------------------------------------------------------------- layout

function freshnessHtml() {
  const m = data.manifest;
  const at = m?.generated_at ? new Date(m.generated_at) : null;
  if (!at || Number.isNaN(at.getTime())) {
    const why = data.manifestError ? 'could not be read' : 'has no generated_at';
    return `<div class="stamp stamp-warn" role="status">Data age unknown — .colaberry/manifest.json ${why}. Sync from the portal to refresh.</div>`;
  }
  const age = Date.now() - at.getTime();
  const text = `Data as of ${fmtDate(at)} (${relAge(age)})`;
  const title = `generated_at ${m.generated_at}`;
  if (age > STALE_AFTER_DAYS * DAY_MS) {
    return `<div class="stamp stamp-warn" role="status" title="${esc(title)}">⚠ ${esc(text)} — over a week old. Sync from the portal to refresh.</div>`;
  }
  if (age > DAY_MS) {
    return `<div class="stamp stamp-aging" role="status" title="${esc(title)}">${esc(text)} — sync from the portal if you expected newer data.</div>`;
  }
  return `<div class="stamp" role="status" title="${esc(title)}">${esc(text)}</div>`;
}

function parseRoute() {
  const [tab, detail] = location.hash.replace(/^#\/?/, '').split('/');
  let decoded = null;
  try {
    decoded = detail ? decodeURIComponent(detail) : null;
  } catch (err) {
    console.warn('Unreadable link, showing the tab instead:', err);
  }
  return { tab: TABS.some((t) => t.id === tab) ? tab : 'overview', detail: decoded };
}

function render() {
  if (!data) return;
  const { tab, detail } = parseRoute();
  const project = data.plan.project ?? {};
  const name = project.name ?? data.plan.project_name ?? 'Untitled project';
  const descriptor = project.descriptor ?? data.plan.descriptor ?? '';
  document.title = `${name} — Command Center`;

  const body = TAB_RENDERERS[tab](detail);

  app.innerHTML = `
    <header class="top">
      <div class="wrap">
        <div class="brand">
          <h1>${esc(name)} · Command Center</h1>
          <p>${esc(descriptor)}</p>
        </div>
        <div class="controls">
          ${freshnessHtml()}
          <div class="mode" role="group" aria-label="Data mode">
            <button type="button" data-mode="real" aria-pressed="${mode === 'real'}">Real</button>
            <button type="button" data-mode="sample" aria-pressed="${mode === 'sample'}">Sample</button>
          </div>
        </div>
      </div>
    </header>
    <nav class="tabs" aria-label="Command Center tabs">
      <ul>${TABS.map((t) => `<li><a href="#/${t.id}"${t.id === tab ? ' aria-current="page"' : ''}>${esc(t.label)}</a></li>`).join('')}</ul>
    </nav>
    <div class="wrap">
      ${mode === 'sample' ? `<div class="banner banner-sample" role="note"><p>SAMPLE MODE — anything marked SAMPLE is made up to show the shape of this page. It is not from your system. Do not demo it as real. Switch to Real to see only what the project has produced.</p></div>` : ''}
      <main id="main">${body}</main>
    </div>`;
  window.scrollTo(0, 0);
}

app.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-mode]');
  if (!btn) return;
  mode = btn.dataset.mode === 'sample' ? 'sample' : 'real';
  writeMode(mode);
  render();
});
app.addEventListener('submit', (e) => {
  if (e.target.id !== 'cc-chat') return;
  e.preventDefault();
  const input = e.target.elements.q;
  const q = input.value.trim();
  if (!q) return;
  chatLog.push({ q, a: answer(q) });
  render();
  const next = document.querySelector('#cc-chat input');
  if (next) next.focus();
});
window.addEventListener('hashchange', render);

// ---------------------------------------------------------------- shared bits

const back = (tab, label) => `<a class="back" href="#/${tab}">← ${esc(label)}</a>`;
const link = (tab, id, text) => `<a href="#/${tab}/${encodeURIComponent(id)}">${esc(text ?? id)}</a>`;
const tabLabel = (id) => TABS.find((t) => t.id === id)?.label ?? id;

function notFound(tab) {
  return `${back(tab, tabLabel(tab))}
    <h2 class="page-title">Not found</h2>
    <p class="lede">There is nothing by that name in the current plan. It may have been removed from plan.json since this link was made.</p>`;
}

function card({ id, tab = 'overview', title, value, caption, sample = false, empty = false, extra = '' }) {
  return `
    <a class="card${sample ? ' is-sample' : ''}" href="#/${tab}/${encodeURIComponent(id)}">
      <div class="card-head"><h3>${esc(title)}</h3>${sample ? sampleBadge() : ''}</div>
      <div class="card-value${empty ? ' is-empty' : ''}">${value}</div>
      <p class="card-caption">${caption}</p>
      ${extra}
      <span class="card-more">Details →</span>
    </a>`;
}

const OVERVIEW_DETAILS = {
  term: detailTerm,
  stories: detailStories,
  criteria: detailCriteria,
  points: detailPoints,
  demo: detailDemo,
  live: detailLive,
  connections: detailConnections,
  business: detailBusiness,
};

function renderOverview(detail) {
  if (detail && OVERVIEW_DETAILS[detail]) {
    return `<a class="back" href="#/overview">← Overview</a>${OVERVIEW_DETAILS[detail](model())}`;
  }
  const m = model();
  const { plan, progress } = m;
  const totals = progress.totals ?? null;
  const pos = termPosition(plan);
  const demo = demoRelease(plan);
  const reqs = plan.requirements ?? [];
  const built = reqs.filter(m.isBuilt).length;
  const systems = systemRows(plan);

  const demoDay = pos.schedule?.demo_day ? dayOnly(pos.schedule.demo_day) : null;
  const demoIn = demoDay ? daysBetween(pos.t, demoDay) : null;
  const demoText = demoDay
    ? `Demo day ${esc(fmtDate(demoDay))}${demoIn > 0 ? ` (in ${plural(demoIn, 'day')})` : demoIn === 0 ? ' (today)' : ''}.`
    : 'No demo day in plan.json.';

  const pausedBanner = PAUSED_AT_OVERVIEW
    ? `<div class="banner banner-pause" role="note"><p><strong>Build paused for your review.</strong> Only this Overview tab is built. Check it over, then say <strong>build the rest</strong> in Claude Code and the other eight tabs get built.</p></div>`
    : '';

  const cards = [
    card({
      id: 'term',
      title: 'Where we are',
      value: pos.current.length ? pos.current.map((r) => esc(r.key)).join(' + ') : esc(pos.phase),
      caption: `${pos.current.length ? `${esc(pos.current.map((r) => r.name).join(' / '))} · ${esc(pos.phase)}. ` : ''}${demoText}`,
    }),
    card({
      id: 'stories',
      title: 'Stories verified',
      value: totals ? `${orNotReported(totals.stories_verified)} <small>of ${orNotReported(totals.stories_total)}</small>` : '<span class="muted">not reported</span>',
      caption: totals ? `${orNotReported(totals.stories_in_progress)} in progress · ${orNotReported(totals.stories_submitted)} submitted · ${orNotReported(totals.stories_not_started)} not started.` : 'progress.json has no totals.',
    }),
    card({
      id: 'criteria',
      title: 'Acceptance criteria passed',
      value: totals ? `${orNotReported(totals.criteria_passed)} <small>of ${orNotReported(totals.criteria_total)}</small>` : '<span class="muted">not reported</span>',
      caption: 'Counted by the platform from the ticks in progress.json.',
    }),
    card({
      id: 'points',
      title: 'Points awarded',
      value: totals ? orNotReported(totals.points_awarded) : '<span class="muted">not reported</span>',
      caption: 'As reported by the platform in progress.json — see details for how it breaks down.',
    }),
    card({
      id: 'demo',
      title: 'Demo target',
      value: demo ? esc(demo.key) : '<span class="muted">none set</span>',
      caption: demo ? `<strong>${esc(demo.name)}</strong> · ${esc(fmtDay(demo.starts_on))} → ${esc(fmtDay(demo.ends_on))}. ${esc(demo.goal ?? '')}` : 'No release is marked as the demo target in plan.json.',
    }),
    card({
      id: 'live',
      title: 'What is live',
      value: `${built} <small>of ${reqs.length} requirements built</small>`,
      caption: 'A requirement counts as built only when every story that fulfils it is verified.',
    }),
    card({
      id: 'connections',
      title: 'Connections',
      value: systems.length ? `${systems.length} <small>systems in the plan</small>` : '<span class="muted">none named</span>',
      caption: mode === 'sample' ? 'Sample statuses, made up.' : 'Grey = unknown. This page cannot reach them, so it does not guess.',
      sample: mode === 'sample',
      extra: `<ul class="syslist">${systems.map((s) => `<li><span class="dot dot-${s.status}"></span>${esc(s.name)} — ${esc(s.label)}</li>`).join('')}</ul>`,
    }),
    mode === 'sample'
      ? card({
          id: 'business',
          title: "Today's business",
          value: `${money(SAMPLE.snapshot.sales_today)} <small>sales</small>`,
          caption: `Est. profit ${money(SAMPLE.snapshot.estimated_profit_today)} · debts ${money(SAMPLE.snapshot.customer_debts_outstanding)} · ${SAMPLE.snapshot.low_stock_products} low-stock products.`,
          sample: true,
        })
      : card({
          id: 'business',
          title: "Today's business",
          value: 'No figures yet',
          empty: true,
          caption: 'The system has not produced any sales, profit or debt figures. They appear once it runs and reports them.',
        }),
  ];

  return `
    ${pausedBanner}
    <h2 class="page-title">Overview</h2>
    <p class="lede">What BizPilot does, which release we are in, and what is live — read from .colaberry/plan.json and .colaberry/progress.json each time this page loads.</p>
    <div class="grid">${cards.join('')}</div>`;
}

// ---------------------------------------------------------------- overview details

function storyTable(stories, cols = ['release', 'due', 'state', 'criteria']) {
  const head = {
    release: '<th>Release</th>',
    due: '<th>Due</th>',
    state: '<th>State</th>',
    criteria: '<th class="num">Criteria</th>',
    points: '<th class="num">Points</th>',
  };
  const cell = {
    release: (s) => `<td>${esc(s.release ?? '—')}</td>`,
    due: (s) => {
      if (!s.inPlan) return '<td class="muted">not in plan.json</td>';
      const slipped = s.due_baseline_on && s.due_on && s.due_on !== s.due_baseline_on;
      return `<td>${esc(fmtDay(s.due_on))}${slipped ? `<br><span class="slip">was ${esc(fmtDay(s.due_baseline_on))}</span>` : ''}</td>`;
    },
    state: (s) => `<td>${esc(stateLabel(s.state))}</td>`,
    criteria: (s) =>
      `<td class="num">${s.v ? `${esc(s.v.criteria_passed ?? '—')} / ${esc(s.v.criteria_total ?? '—')}` : '<span class="muted">not checked yet</span>'}</td>`,
    points: (s) => `<td class="num">${s.v ? orNotReported(s.v.points_awarded) : '<span class="muted">not checked yet</span>'}</td>`,
  };
  return `<div class="table-scroll"><table>
    <thead><tr><th>Story</th>${cols.map((c) => head[c]).join('')}</tr></thead>
    <tbody>${stories
      .map(
        (s) =>
          `<tr><td><strong>${link('project', s.id)}</strong><br>${s.title ? esc(s.title) : '<span class="muted">no title in plan.json</span>'}</td>${cols.map((c) => cell[c](s)).join('')}</tr>`,
      )
      .join('')}</tbody></table></div>`;
}

function detailTerm({ plan }) {
  const pos = termPosition(plan);
  const s = pos.schedule;
  const currentKeys = new Set(pos.current.map((r) => r.key));
  const releases = plan.releases ?? [];
  return `
    <h2 class="page-title">Where we are</h2>
    <p class="lede">Today is ${esc(fmtDate(pos.t))}. Phase: <strong>${esc(pos.phase)}</strong>.</p>
    <section class="panel">
      <h3>Schedule</h3>
      ${
        s
          ? `<dl class="kv">
              <dt>Build starts</dt><dd>${esc(fmtDay(s.build_start))}</dd>
              <dt>Build ends</dt><dd>${esc(fmtDay(s.build_end))}</dd>
              <dt>Demo day</dt><dd>${esc(fmtDay(s.demo_day))}</dd>
              <dt>Demo release</dt><dd>${esc(s.demo_release_key ?? '—')}</dd>
              <dt>Roadmap (after this term)</dt><dd>${esc((s.roadmap_release_keys ?? []).join(', ') || '—')}</dd>
            </dl>`
          : '<p class="muted">plan.json has no schedule yet.</p>'
      }
    </section>
    <section class="panel">
      <h3>Releases</h3>
      <div class="table-scroll"><table>
        <thead><tr><th>Release</th><th>Dates</th><th class="num">Stories</th><th></th></tr></thead>
        <tbody>${releases
          .map(
            (r) => `<tr>
              <td><strong>${esc(r.key)}</strong> ${esc(r.name)}</td>
              <td>${esc(fmtDay(r.starts_on))} → ${esc(fmtDay(r.ends_on))}</td>
              <td class="num">${(r.story_ids ?? []).length}</td>
              <td>${r.is_demo_target ? '<span class="badge badge-demo">DEMO TARGET</span> ' : ''}${currentKeys.has(r.key) ? '<span class="badge badge-now">NOW</span>' : ''}</td>
            </tr>`,
          )
          .join('')}</tbody>
      </table></div>
    </section>
    ${
      s?.prep?.length
        ? `<section class="panel"><h3>Demo prep</h3><div class="table-scroll"><table>
            <thead><tr><th>Task</th><th>Due</th></tr></thead>
            <tbody>${s.prep.map((p) => `<tr><td>${esc(p.title)}</td><td>${esc(fmtDay(p.due_on))}</td></tr>`).join('')}</tbody>
          </table></div></section>`
        : ''
    }`;
}

function detailStories({ allStories, progress }) {
  const t = progress.totals ?? {};
  return `
    <h2 class="page-title">Stories verified</h2>
    <p class="lede">${orNotReported(t.stories_verified)} of ${orNotReported(t.stories_total)} verified, per the totals in progress.json. Each story's state comes from its <code>verification</code> block; a story with no block shows "not checked yet".</p>
    <section class="panel">${storyTable(allStories)}</section>`;
}

function detailCriteria({ allStories, progress }) {
  const t = progress.totals ?? {};
  return `
    <h2 class="page-title">Acceptance criteria passed</h2>
    <p class="lede">${orNotReported(t.criteria_passed)} of ${orNotReported(t.criteria_total)} passed. A criterion passes when it is ticked in progress.json and the platform has read the push.</p>
    ${allStories
      .map((s) => {
        const outstanding = new Set(s.v?.outstanding ?? []);
        return `<section class="panel">
          <h3>${esc(s.id)}${s.title ? ` — ${esc(s.title)}` : ''}</h3>
          <p class="muted">${esc(stateLabel(s.state))}${s.v ? ` · ${esc(s.v.criteria_passed ?? '—')} of ${esc(s.v.criteria_total ?? '—')} passed` : ''}</p>
          <ul>${(s.acceptance ?? []).map((c) => `<li>${s.v && !outstanding.has(c) && s.v.criteria_passed > 0 ? '✓ ' : ''}${esc(c)}</li>`).join('')}</ul>
        </section>`;
      })
      .join('')}`;
}

function detailPoints({ allStories, progress }) {
  const t = progress.totals ?? {};
  return `
    <h2 class="page-title">Points awarded</h2>
    <p class="lede">progress.json reports <strong>${orNotReported(t.points_awarded)}</strong> points in its totals, with ${orNotReported(t.stories_verified)} stories verified. Both figures are shown exactly as the platform wrote them; this page does not recalculate them.</p>
    <section class="panel">${storyTable(allStories, ['release', 'state', 'points'])}</section>`;
}

function detailDemo({ plan, stories }) {
  const demo = demoRelease(plan);
  if (!demo) return '<h2 class="page-title">Demo target</h2><p class="lede">No release is marked as the demo target in plan.json.</p>';
  const ids = new Set(demo.story_ids ?? []);
  return `
    <h2 class="page-title">Demo target — ${esc(demo.key)} ${esc(demo.name)}</h2>
    <p class="lede">${esc(fmtDay(demo.starts_on))} → ${esc(fmtDay(demo.ends_on))}. Releases after this one are the roadmap, not this term's work.</p>
    <section class="panel">
      <dl class="kv">
        <dt>Goal</dt><dd>${esc(demo.goal ?? '—')}</dd>
        <dt>What the demo shows</dt><dd>${esc(demo.demo ?? '—')}</dd>
      </dl>
    </section>
    <section class="panel"><h3>Stories in this release</h3>${storyTable(stories.filter((s) => ids.has(s.id)))}</section>`;
}

function detailLive({ plan, isBuilt }) {
  const reqs = plan.requirements ?? [];
  return `
    <h2 class="page-title">What is live</h2>
    <p class="lede">A requirement is built when every story that fulfils it is verified. Nothing here is measured from the running system — it follows the verification state in progress.json.</p>
    <section class="panel"><div class="table-scroll"><table>
      <thead><tr><th>Requirement</th><th>Kind</th><th>Fulfilled by</th><th>Built</th></tr></thead>
      <tbody>${reqs
        .map((r) => {
          const by = r.fulfilled_by ?? [];
          const gap = by.length === 0;
          return `<tr>
            <td><strong>${esc(r.id)}</strong> ${esc(r.statement)}</td>
            <td>${esc(r.kind)} · ${esc(r.priority)}</td>
            <td>${gap ? `<span class="badge badge-gap">NO STORY</span>` : esc(by.join(', '))}</td>
            <td>${isBuilt(r) ? 'Yes' : 'Not yet'}</td>
          </tr>`;
        })
        .join('')}</tbody>
    </table></div></section>`;
}

function detailConnections({ plan }) {
  const rows = systemRows(plan);
  return `
    <h2 class="page-title">Connections ${mode === 'sample' ? sampleBadge() : ''}</h2>
    <p class="lede">${
      mode === 'sample'
        ? 'These statuses are made up for Sample mode. Your real system has not reported any.'
        : 'These names come from the requirements in plan.json. That is all the repo knows about them — whether one is connected is a fact about your running system, so every indicator stays grey until that system reports.'
    }</p>
    <section class="panel"><div class="table-scroll"><table>
      <thead><tr><th>System</th><th>Status</th><th>Last checked</th></tr></thead>
      <tbody>${rows
        .map((r) => `<tr><td>${esc(r.name)}</td><td><span class="dot dot-${r.status}"></span>${esc(r.label)}${r.sample ? ' ' + sampleBadge() : ''}</td><td>${esc(r.checked)}</td></tr>`)
        .join('')}</tbody>
    </table></div></section>`;
}

function detailBusiness() {
  if (mode !== 'sample') {
    return `
      <h2 class="page-title">Today's business</h2>
      <section class="panel">
        <p><strong>No figures yet.</strong> Sales, expenses, estimated profit, customer debts and low-stock products will show here once your system is running and reporting them.</p>
        <p class="muted">What has to happen first: the stories that record transactions and build the dashboard need to be built and verified, and this page needs to be pointed at the running system. Switch to Sample to see the shape of this view.</p>
      </section>`;
  }
  const s = SAMPLE.snapshot;
  return `
    <h2 class="page-title">Today's business ${sampleBadge()}</h2>
    <p class="lede">Made-up figures for Sample mode. None of this came from your system.</p>
    <section class="panel">
      <dl class="kv">
        <dt>Sales today</dt><dd>${money(s.sales_today)} ${sampleBadge()}</dd>
        <dt>Expenses today</dt><dd>${money(s.expenses_today)} ${sampleBadge()}</dd>
        <dt>Estimated profit</dt><dd>${money(s.estimated_profit_today)} ${sampleBadge()}</dd>
        <dt>Customer debts outstanding</dt><dd>${money(s.customer_debts_outstanding)} ${sampleBadge()}</dd>
        <dt>Low-stock products</dt><dd>${s.low_stock_products} ${sampleBadge()}</dd>
      </dl>
    </section>
    <section class="panel"><h3>Low stock ${sampleBadge()}</h3><div class="table-scroll"><table>
      <thead><tr><th>Product</th><th class="num">Quantity</th><th class="num">Reorder level</th></tr></thead>
      <tbody>${SAMPLE.lowStock.map((p) => `<tr><td>${esc(p.product)}</td><td class="num">${p.quantity}</td><td class="num">${p.reorder_level}</td></tr>`).join('')}</tbody>
    </table></div></section>
    <section class="panel"><h3>Customer debts ${sampleBadge()}</h3><div class="table-scroll"><table>
      <thead><tr><th>Customer</th><th class="num">Owed</th><th class="num">Days overdue</th></tr></thead>
      <tbody>${SAMPLE.debtors.map((d) => `<tr><td>${esc(d.customer)}</td><td class="num">${money(d.owed)}</td><td class="num">${d.days_overdue}</td></tr>`).join('')}</tbody>
    </table></div></section>`;
}

// ---------------------------------------------------------------- shared lookups

const reqMap = (plan) => new Map((plan.requirements ?? []).map((r) => [r.id, r]));

// Criteria for a story with their ticks: text from the plan, ticks from progress.
function criteriaFor(m, storyId) {
  const p = m.progressById.get(storyId);
  const planStory = m.stories.find((s) => s.id === storyId);
  const ticks = new Map((p?.criteria ?? []).map((c) => [c.text, c.passed === true]));
  const texts = planStory?.acceptance ?? (p?.criteria ?? []).map((c) => c.text);
  return texts.map((text) => ({ text, passed: ticks.get(text) === true }));
}

function criteriaList(items) {
  if (!items.length) return '<p class="muted">No acceptance criteria recorded.</p>';
  return `<ul class="checks">${items
    .map((c) => `<li class="${c.passed ? 'ok' : ''}"><span class="tick" aria-label="${c.passed ? 'ticked' : 'not ticked'}">${c.passed ? '✓' : '○'}</span>${esc(c.text)}</li>`)
    .join('')}</ul>`;
}

// "As a business owner, I want …" -> "business owner"
const narrativeRole = (n) => (n ?? '').match(/^As an? ([^,]+),/i)?.[1]?.trim().toLowerCase() ?? null;

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function emptyState(title, body) {
  return `<section class="panel empty"><h3>${esc(title)}</h3>${body}</section>`;
}

// ---------------------------------------------------------------- 2. outcomes

function renderOutcomes(detail) {
  const m = model();
  const measures = m.plan.derived?.measures ?? [];
  const reqs = reqMap(m.plan);

  if (detail === 'add-a-measure') {
    return `${back('outcomes', 'Outcomes')}
      <h2 class="page-title">Adding a measure</h2>
      <section class="panel">
        <p>A card appears here for each entry in <code>plan.derived.measures</code>. Your plan has none yet, so there is nothing to track.</p>
        <p><strong>What has to happen first:</strong> add a measurable outcome to your plan in the portal — a number this system must move, with a target (for example "time to record a sale, under 10 seconds"). The next sync writes it into plan.json and a card appears here with its target.</p>
        <p class="muted">The current value is a different fact: it comes from your running system once it reports it. Until then the card will say "not measured", never 0.</p>
      </section>`;
  }
  if (detail) {
    const sm = mode === 'sample' ? SAMPLE.measures.find((x) => x.id === detail) : null;
    if (sm) {
      return `${back('outcomes', 'Outcomes')}
        <h2 class="page-title">${esc(sm.name)} ${sampleBadge()}</h2>
        <p class="lede">A made-up measure showing what a card will look like once your plan carries targets and your system reports values.</p>
        <section class="panel"><dl class="kv">
          <dt>Target</dt><dd>${esc(sm.target)} ${sampleBadge()}</dd>
          <dt>Current value</dt><dd>${esc(sm.value)} ${sampleBadge()}</dd>
        </dl></section>
        <section class="panel"><h3>Last readings ${sampleBadge()}</h3><div class="table-scroll"><table>
          <thead><tr><th>Day</th><th class="num">Value</th></tr></thead>
          <tbody>${sm.history.map((h) => `<tr><td>${esc(h.day)}</td><td class="num">${esc(h.value)}</td></tr>`).join('')}</tbody>
        </table></div></section>`;
    }
    const measure = measures.find((x) => x.id === detail);
    if (!measure) return notFound('outcomes');
    const req = reqs.get(measure.id);
    return `${back('outcomes', 'Outcomes')}
      <h2 class="page-title">${esc(measure.id)}</h2>
      <section class="panel"><dl class="kv">
        <dt>Statement</dt><dd>${esc(measure.statement)}</dd>
        <dt>Target</dt><dd>${measure.target ? esc(measure.target) : '<span class="muted">No numeric target yet</span>'}</dd>
        <dt>Current value</dt><dd><span class="muted">Not measured — your system reports this once it runs</span></dd>
        ${req ? `<dt>Fulfilled by</dt><dd>${(req.fulfilled_by ?? []).map((id) => link('project', id)).join(', ') || '<span class="badge badge-gap">NO STORY</span>'}</dd>` : ''}
      </dl></section>`;
  }

  const realCards = measures.map((x) =>
    card({
      tab: 'outcomes',
      id: x.id,
      title: x.id,
      value: 'Not measured',
      empty: true,
      caption: `${esc(x.statement)} · ${x.target ? `Target ${esc(x.target)}` : 'No numeric target yet'}.`,
    }),
  );
  const sampleCards =
    mode === 'sample'
      ? SAMPLE.measures.map((x) =>
          card({ tab: 'outcomes', id: x.id, title: x.name, value: esc(x.value), caption: `Target ${esc(x.target)}.`, sample: true }),
        )
      : [];
  const emptyCard = measures.length
    ? []
    : [
        card({
          tab: 'outcomes',
          id: 'add-a-measure',
          title: 'No measures yet',
          value: 'Nothing to track',
          empty: true,
          caption: 'Your plan has no measurable outcome. See what has to happen for a card to appear here.',
        }),
      ];

  return `
    <h2 class="page-title">Outcomes — the numbers this has to move</h2>
    <p class="lede">One card per measure in <code>plan.derived.measures</code>. The plan holds the target; the value can only come from your running system.</p>
    ${measures.length ? '' : emptyState('Your plan carries no numeric target yet', '<p>There is nothing here to measure until a target is added to the plan. This tab stays empty rather than inventing one.</p>')}
    <div class="grid">${[...realCards, ...emptyCard, ...sampleCards].join('')}</div>`;
}

// ---------------------------------------------------------------- 3. users

function renderUsers(detail) {
  const m = model();
  const roles = m.plan.derived?.roles ?? [];
  const storiesFor = (role) => m.stories.filter((s) => narrativeRole(s.narrative) === role.toLowerCase());

  if (detail) {
    const role = roles.find((r) => slug(r) === detail);
    if (!role) return notFound('users');
    const list = storiesFor(role);
    return `${back('users', 'Users & use case')}
      <h2 class="page-title">${esc(role)}</h2>
      <p class="lede">${plural(list.length, 'story')} written for this role. Each sentence below is the story's narrative from plan.json.</p>
      ${
        list.length
          ? list
              .map(
                (s) => `<section class="panel">
                  <h3>${link('project', s.id)} — ${esc(s.title)}</h3>
                  <p>${esc(s.narrative)}</p>
                  <p class="muted">Release ${esc(s.release)} · ${esc(stateLabel(s.state))}</p>
                </section>`,
              )
              .join('')
          : emptyState('No story names this role exactly', '<p>The role is listed in plan.derived.roles, but no story narrative starts "As a ' + esc(role) + '".</p>')
      }`;
  }

  return `
    <h2 class="page-title">Users and use case</h2>
    <p class="lede">Who BizPilot is for and what they are trying to get done — the roles in <code>plan.derived.roles</code>, taken from your stories' "As a …, I want …" sentences.</p>
    ${
      roles.length
        ? `<div class="grid">${roles
            .map((role) => {
              const list = storiesFor(role);
              const want = list[0]?.narrative?.match(/I want (.+?)(,|$)/i)?.[1];
              return card({
                tab: 'users',
                id: slug(role),
                title: role.replace(/^./, (c) => c.toUpperCase()),
                value: `${list.length} <small>${list.length === 1 ? 'story' : 'stories'}</small>`,
                caption: want ? `Wants ${esc(want)}${list.length > 1 ? ', and more' : ''}.` : 'No story narrative names this role exactly.',
              });
            })
            .join('')}</div>`
        : emptyState('No roles in the plan yet', '<p>plan.derived.roles is empty. Roles appear once stories are written "As a <role>, I want …".</p>')
    }`;
}

// ---------------------------------------------------------------- 4. guardrails

function guardrailStatus(m, g) {
  const req = reqMap(m.plan).get(g.id);
  const by = req?.fulfilled_by ?? [];
  const states = by.map((id) => m.progressById.get(id)?.verification?.state ?? null);
  const kept = by.length > 0 && states.every((s) => s === 'verified');
  const text = kept
    ? 'Enforced — every story behind it is verified.'
    : by.length
      ? 'A promise made and not yet kept — the stories that enforce it are not verified.'
      : 'A promise made and not yet kept — no story enforces it.';
  return { by, kept, text };
}

function renderGuardrails(detail) {
  const m = model();
  const guardrails = m.plan.derived?.guardrails ?? [];

  if (detail) {
    const g = guardrails.find((x) => x.id === detail);
    if (!g) return notFound('guardrails');
    const st = guardrailStatus(m, g);
    return `${back('guardrails', 'Guardrails')}
      <h2 class="page-title">${esc(g.id)}</h2>
      <p class="lede">${esc(g.statement)}</p>
      <div class="banner ${st.kept ? 'banner-pause' : 'banner-warn'}" role="status"><p>${esc(st.text)}</p></div>
      ${st.by
        .map((id) => {
          const s = m.allStories.find((x) => x.id === id);
          return `<section class="panel">
            <h3>${link('project', id)}${s?.title ? ` — ${esc(s.title)}` : ''}</h3>
            <p class="muted">${esc(stateLabel(s?.state ?? null))}</p>
            ${criteriaList(criteriaFor(m, id))}
          </section>`;
        })
        .join('')}`;
  }

  return `
    <h2 class="page-title">Guardrails — what must never happen</h2>
    <p class="lede">Your SAFE requirements from <code>plan.derived.guardrails</code>. A guardrail counts as enforced only when every story that fulfils it is verified in progress.json.</p>
    ${
      guardrails.length
        ? `<div class="grid">${guardrails
            .map((g) => {
              const st = guardrailStatus(m, g);
              return card({
                tab: 'guardrails',
                id: g.id,
                title: g.id,
                value: st.kept ? 'Enforced' : 'Not yet kept',
                empty: !st.kept,
                caption: `${esc(g.statement)}<br><strong>${esc(st.text)}</strong>`,
              });
            })
            .join('')}</div>`
        : `<div class="banner banner-warn" role="alert"><p><strong>Your plan has no SAFE requirement.</strong> That is worth fixing before building further — without one, nothing on this page describes what the system must never do.</p></div>`
    }`;
}

// ---------------------------------------------------------------- 5. systems

function mentionsOf(plan, name) {
  const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  return (plan.requirements ?? []).filter((r) => re.test(r.statement ?? ''));
}

function renderSystems(detail) {
  const m = model();
  const rows = systemRows(m.plan);

  if (detail) {
    const r = rows.find((x) => slug(x.name) === detail);
    if (!r) return notFound('systems');
    const mentions = mentionsOf(m.plan, r.name);
    return `${back('systems', 'Systems')}
      <h2 class="page-title">${esc(r.name)} ${r.sample ? sampleBadge() : ''}</h2>
      <section class="panel"><dl class="kv">
        <dt>Status</dt><dd><span class="dot dot-${r.status}"></span>${esc(r.label)}${r.sample ? ' ' + sampleBadge() : ''}</dd>
        <dt>Last checked</dt><dd>${esc(r.checked)}</dd>
      </dl>
      <p class="muted">${
        r.sample
          ? 'Made-up status for Sample mode.'
          : 'plan.json names this system; that is all the repo knows. Whether it is connected is a fact about your running system, so this stays grey until that system reports its own health.'
      }</p></section>
      <section class="panel"><h3>Requirements that name it</h3>${
        mentions.length
          ? `<ul>${mentions.map((q) => `<li><strong>${esc(q.id)}</strong> ${esc(q.statement)}</li>`).join('')}</ul>`
          : '<p class="muted">No requirement statement mentions this name directly.</p>'
      }</section>`;
  }

  return `
    <h2 class="page-title">Systems — what this connects to</h2>
    <p class="lede">The systems in <code>plan.derived.systems</code>. Nothing in this repo can reach them, so every indicator is grey — "not checked from here" — until your own system reports otherwise.</p>
    ${
      rows.length
        ? `<div class="grid">${rows
            .map((r) =>
              card({
                tab: 'systems',
                id: slug(r.name),
                title: r.name,
                value: `<span class="dot dot-${r.status}"></span>${esc(r.label)}`,
                caption: `Last checked: ${esc(r.checked)}.`,
                sample: r.sample,
              }),
            )
            .join('')}</div>`
        : emptyState('No systems named in the plan', '<p>plan.derived.systems is empty.</p>')
    }`;
}

// ---------------------------------------------------------------- 6. project management

function gantt(plan) {
  const s = plan.schedule ?? {};
  const rels = (plan.releases ?? []).filter((r) => r.starts_on && r.ends_on);
  const starts = [s.build_start, ...rels.map((r) => r.starts_on)].filter(Boolean).map(dayOnly);
  const ends = [s.demo_day, s.build_end, ...rels.map((r) => r.ends_on)].filter(Boolean).map(dayOnly);
  if (!starts.length || !ends.length) return '<p class="muted">plan.json has no release dates yet.</p>';
  const min = new Date(Math.min(...starts));
  const max = new Date(Math.max(...ends));
  const span = daysBetween(min, max) + 1;
  const left = (d) => (daysBetween(min, d) / span) * 100;
  const width = (a, b) => Math.max(((daysBetween(a, b) + 1) / span) * 100, 2);
  const t = today();
  const now = t >= min && t <= max ? `<span class="g-now" style="left:${left(t) + 50 / span}%" title="Today"></span>` : '';
  const demoKey = demoRelease(plan)?.key;

  const row = (label, href, from, to, cls, note) => `
    <div class="g-row">
      <div class="g-label"><a href="${href}">${label}</a>${note ? ` <span class="muted">${note}</span>` : ''}</div>
      <div class="g-track">${now}<a class="g-bar ${cls}" href="${href}" style="left:${left(from)}%;width:${width(from, to)}%" title="${esc(fmtDate(from))} → ${esc(fmtDate(to))}"></a></div>
    </div>`;

  const rows = rels.map((r) =>
    row(
      `<strong>${esc(r.key)}</strong> ${esc(r.name)}`,
      `#/project/${encodeURIComponent(r.key)}`,
      dayOnly(r.starts_on),
      dayOnly(r.ends_on),
      r.key === demoKey ? 'g-demo' : 'g-roadmap',
      r.key === demoKey ? '<span class="badge badge-demo">DEMO TARGET</span>' : 'roadmap',
    ),
  );
  if (s.build_end && s.demo_day) {
    const prepStart = new Date(dayOnly(s.build_end).getTime() + DAY_MS);
    rows.push(row('<strong>Demo prep</strong>', '#/project/prep', prepStart, dayOnly(s.demo_day), 'g-prep', `demo day ${esc(fmtDay(s.demo_day))}`));
  }
  return `<div class="gantt">
      <div class="g-axis"><span>${esc(fmtDate(min))}</span><span>${esc(fmtDate(max))}</span></div>
      ${rows.join('')}
      <p class="muted g-legend"><span class="g-key g-demo"></span> demo target <span class="g-key g-roadmap"></span> roadmap <span class="g-key g-prep"></span> demo prep ${now ? '<span class="g-key g-nowkey"></span> today' : ''}</p>
    </div>`;
}

function dueCell(s) {
  const slipped = s.due_baseline_on && s.due_on && s.due_on !== s.due_baseline_on;
  const late = s.due_on && dayOnly(s.due_on) < today() && s.state !== 'verified';
  return `${esc(fmtDay(s.due_on))}${late ? ' <span class="badge badge-gap">PAST DUE</span>' : ''}${
    slipped ? `<br><span class="slip">first given ${esc(fmtDay(s.due_baseline_on))} — moved ${plural(daysBetween(dayOnly(s.due_baseline_on), dayOnly(s.due_on)), 'day')}</span>` : ''
  }`;
}

function storyDetail(m, id) {
  const s = m.allStories.find((x) => x.id === id);
  if (!s) return notFound('project');
  const reqs = reqMap(m.plan);
  const v = s.v;
  return `${back('project', 'Project management')}
    <h2 class="page-title">${esc(s.id)}${s.title ? ` — ${esc(s.title)}` : ''}</h2>
    <p class="lede">${s.narrative ? esc(s.narrative) : 'This story is tracked in progress.json but has no entry in plan.json.'}</p>
    <section class="panel"><dl class="kv">
      <dt>State</dt><dd>${esc(stateLabel(s.state))}</dd>
      <dt>Release</dt><dd>${s.release ? link('project', s.release) : '—'}</dd>
      ${s.inPlan ? `<dt>Due</dt><dd>${dueCell(s)}</dd><dt>First given</dt><dd>${esc(fmtDay(s.due_baseline_on))}</dd>` : ''}
      ${s.owner_agent ? `<dt>Owner</dt><dd>${esc(s.owner_agent)}</dd>` : ''}
      ${s.fulfills?.length ? `<dt>Fulfils</dt><dd>${s.fulfills.map((r) => `<strong>${esc(r)}</strong> ${esc(reqs.get(r)?.statement ?? '(not in plan)')}`).join('<br>')}</dd>` : ''}
      ${s.blocked_by?.length ? `<dt>Blocked by</dt><dd>${s.blocked_by.map((b) => link('project', b)).join(', ')}</dd>` : ''}
      ${v?.commit_url ? `<dt>Verified commit</dt><dd><a href="${esc(v.commit_url)}" rel="noopener">${esc((v.commit_sha ?? '').slice(0, 7))}</a></dd>` : ''}
    </dl></section>
    <section class="panel"><h3>Acceptance criteria</h3>${criteriaList(criteriaFor(m, s.id))}</section>
    ${
      Array.isArray(s.failure_paths) && s.failure_paths.length
        ? `<section class="panel"><h3>Failure paths to handle</h3><ul>${s.failure_paths.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></section>`
        : ''
    }
    ${s.task_guidance ? `<section class="panel"><h3>Task guidance</h3><div class="prewrap">${esc(s.task_guidance)}</div></section>` : ''}`;
}

function renderProject(detail) {
  const m = model();
  const { plan } = m;
  const s = plan.schedule ?? null;

  if (detail) {
    const rel = (plan.releases ?? []).find((r) => r.key === detail);
    if (rel) {
      const ids = new Set(rel.story_ids ?? []);
      const isDemo = demoRelease(plan)?.key === rel.key;
      return `${back('project', 'Project management')}
        <h2 class="page-title">${esc(rel.key)} — ${esc(rel.name)} ${isDemo ? '<span class="badge badge-demo">DEMO TARGET</span>' : ''}</h2>
        <p class="lede">${esc(fmtDay(rel.starts_on))} → ${esc(fmtDay(rel.ends_on))}. ${isDemo ? 'This is the release you demo.' : 'Roadmap — after the demo target, not this term’s work.'}</p>
        <section class="panel"><dl class="kv">
          <dt>Goal</dt><dd>${esc(rel.goal ?? '—')}</dd>
          <dt>Demo</dt><dd>${esc(rel.demo ?? '—')}</dd>
        </dl></section>
        <section class="panel"><h3>Stories</h3>${storyTable(m.stories.filter((x) => ids.has(x.id)))}</section>`;
    }
    if (detail === 'prep') {
      return `${back('project', 'Project management')}
        <h2 class="page-title">Demo prep</h2>
        <p class="lede">Build ends ${esc(fmtDay(s?.build_end))}; demo day is ${esc(fmtDay(s?.demo_day))}. The week between is for these tasks.</p>
        <section class="panel">${prepTable(s)}</section>`;
    }
    const prep = (s?.prep ?? []).find((p) => p.key === detail);
    if (prep) {
      return `${back('project', 'Project management')}
        <h2 class="page-title">${esc(prep.key)} — ${esc(prep.title)}</h2>
        <section class="panel"><dl class="kv">
          <dt>Due</dt><dd>${esc(fmtDay(prep.due_on))}</dd>
          <dt>Status</dt><dd><span class="muted">Not tracked — prep tasks live in the plan only, and progress.json holds no state for them.</span></dd>
        </dl></section>`;
    }
    return storyDetail(m, detail);
  }

  const tasks = [...m.stories].sort((a, b) => (a.due_on ?? '9999').localeCompare(b.due_on ?? '9999') || a.id.localeCompare(b.id));
  return `
    <h2 class="page-title">Project management</h2>
    <p class="lede">Releases and due dates from plan.json; state from progress.json. Where a due date has moved, both dates are shown — the gap is slippage.</p>
    <section class="panel"><h3>Releases</h3>${gantt(plan)}</section>
    <section class="panel"><h3>Tasks</h3><div class="table-scroll"><table>
      <thead><tr><th>Story</th><th>Release</th><th>Due</th><th>State</th></tr></thead>
      <tbody>${tasks
        .map(
          (t) => `<tr>
            <td><strong>${link('project', t.id)}</strong><br>${esc(t.title)}</td>
            <td>${link('project', t.release)}</td>
            <td>${dueCell(t)}</td>
            <td>${esc(stateLabel(t.state))}</td>
          </tr>`,
        )
        .join('')}</tbody>
    </table></div></section>
    ${s?.prep?.length ? `<section class="panel"><h3>Demo prep tasks</h3>${prepTable(s)}</section>` : ''}`;
}

function prepTable(s) {
  if (!s?.prep?.length) return '<p class="muted">No prep tasks in plan.json.</p>';
  return `<div class="table-scroll"><table>
    <thead><tr><th>Task</th><th>Due</th></tr></thead>
    <tbody>${s.prep.map((p) => `<tr><td>${link('project', p.key, `${p.key} — ${p.title}`)}</td><td>${esc(fmtDay(p.due_on))}</td></tr>`).join('')}</tbody>
  </table></div>`;
}

// ---------------------------------------------------------------- 7. agents

function renderAgents(detail) {
  const m = model();
  const agents = m.plan.agents ?? [];
  const byAutonomy = Object.entries(m.plan.derived?.counts?.agents_by_autonomy ?? {});
  const owners = [...new Set(m.stories.map((s) => s.owner_agent).filter(Boolean))];
  const ownedBy = (name) => m.stories.filter((s) => s.owner_agent === name);
  const skillsHtml = (skills) =>
    skills?.length ? `<ul>${skills.map((k) => `<li>${esc(typeof k === 'string' ? k : k.name ?? JSON.stringify(k))}</li>`).join('')}</ul>` : '<p class="muted">No skills registered yet.</p>';
  const listOrDash = (xs) => (xs?.length ? xs.map((x) => esc(typeof x === 'string' ? x : JSON.stringify(x))).join('<br>') : '—');

  if (detail === 'sample-agent' && mode === 'sample') {
    const a = SAMPLE.agent;
    return `${back('agents', 'AI agents')}
      <h2 class="page-title">${esc(a.name)} ${sampleBadge()}</h2>
      <p class="lede">A made-up agent showing what a scoped agent card will hold. Your plan has no agents like this yet.</p>
      <section class="panel"><dl class="kv">
        <dt>Purpose</dt><dd>${esc(a.purpose)}</dd>
        <dt>Trigger</dt><dd>${esc(a.trigger)}</dd>
        <dt>Autonomy</dt><dd>${esc(a.autonomy_level)}</dd>
        <dt>Approval gate</dt><dd>${esc(a.approval_gate)}</dd>
      </dl></section>
      <section class="panel"><h3>Recent runs ${sampleBadge()}</h3><div class="table-scroll"><table>
        <thead><tr><th>When</th><th>Result</th></tr></thead>
        <tbody>${a.runs.map((r) => `<tr><td>${esc(r.when)}</td><td>${esc(r.result)}</td></tr>`).join('')}</tbody>
      </table></div></section>`;
  }
  if (detail) {
    const agent = agents.find((a) => (a.id ?? slug(a.name)) === detail);
    if (agent) {
      const owns = agent.owns ?? [];
      return `${back('agents', 'AI agents')}
        <h2 class="page-title">${esc(agent.name)}</h2>
        <p class="lede">${esc(agent.purpose ?? '')}</p>
        <section class="panel"><dl class="kv">
          <dt>Trigger</dt><dd>${esc(agent.trigger_type ?? '—')}${agent.trigger ? ` · ${esc(agent.trigger)}` : ''}</dd>
          <dt>Autonomy</dt><dd>${esc(agent.autonomy_level ?? '—')}</dd>
          <dt>Inputs</dt><dd>${listOrDash(agent.inputs)}</dd>
          <dt>Outputs</dt><dd>${listOrDash(agent.outputs)}</dd>
          <dt>Approval gates</dt><dd>${listOrDash(agent.approval_gates)}</dd>
          <dt>Escalation</dt><dd>${listOrDash(agent.escalation_rules)}</dd>
          <dt>Runs</dt><dd><span class="muted">No runs recorded</span></dd>
        </dl></section>
        <section class="panel"><h3>Skills</h3>${skillsHtml(agent.skills)}</section>
        <section class="panel"><h3>Owns</h3>${storyTable(m.stories.filter((s) => owns.includes(s.id)))}</section>`;
    }
    const owner = owners.find((o) => slug(o) === detail);
    if (!owner) return notFound('agents');
    return `${back('agents', 'AI agents')}
      <h2 class="page-title">${esc(owner)}</h2>
      <p class="lede">A story owner taken from <code>owner_agent</code> in plan.json — a role, not a scoped AI agent. It has no trigger, autonomy level or run history because none has been designed yet.</p>
      <section class="panel"><dl class="kv">
        <dt>Skills</dt><dd><span class="muted">No skills registered yet</span></dd>
        <dt>Runs</dt><dd><span class="muted">No runs recorded</span></dd>
      </dl></section>
      <section class="panel"><h3>Stories owned</h3>${storyTable(ownedBy(owner))}</section>`;
  }

  const sampleCard =
    mode === 'sample'
      ? [card({ tab: 'agents', id: 'sample-agent', title: SAMPLE.agent.name, value: `${SAMPLE.agent.runs.length} <small>runs</small>`, caption: esc(SAMPLE.agent.purpose), sample: true })]
      : [];

  if (agents.length) {
    return `
      <h2 class="page-title">AI agents</h2>
      <p class="lede">The designed roster from <code>plan.agents</code>. Run history does not exist until an agent is built and running, so every card says "no runs recorded".</p>
      <section class="panel"><h3>Roster by autonomy</h3>${
        byAutonomy.length ? `<dl class="kv">${byAutonomy.map(([k, n]) => `<dt>${esc(k)}</dt><dd>${esc(n)}</dd>`).join('')}</dl>` : '<p class="muted">No autonomy breakdown in plan.json.</p>'
      }</section>
      <div class="grid">${[
        ...agents.map((a) =>
          card({
            tab: 'agents',
            id: a.id ?? slug(a.name),
            title: a.name,
            value: esc(a.autonomy_level ?? '—'),
            caption: `${esc(a.purpose ?? '')}<br>Owns ${plural((a.owns ?? []).length, 'story')} · ${a.skills?.length ? plural(a.skills.length, 'skill') : 'no skills registered yet'} · no runs recorded.`,
          }),
        ),
        ...sampleCard,
      ].join('')}</div>`;
  }

  return `
    <h2 class="page-title">AI agents</h2>
    <p class="lede">Your plan does not carry a scoped agent roster yet, so this tab is built from who owns each story.</p>
    <div class="banner banner-warn" role="note"><p><strong>These are story owners, not scoped AI agents.</strong> Each name below is the <code>owner_agent</code> on a story — a role. None of them has a trigger, an autonomy level or a run history. Scoped agents appear here once they are added to the plan.</p></div>
    <p class="muted">Roster by autonomy: ${byAutonomy.length ? byAutonomy.map(([k, n]) => `${esc(k)} ${esc(n)}`).join(' · ') : 'no scoped agents, so no breakdown yet'}.</p>
    <div class="grid">${[
      ...owners.map((o) => {
        const owned = ownedBy(o);
        return card({
          tab: 'agents',
          id: slug(o),
          title: o,
          value: `${owned.length} <small>${owned.length === 1 ? 'story' : 'stories'} owned</small>`,
          caption: `${esc(owned.map((s) => s.id).join(', '))}<br>Story owner · no skills registered yet · no runs recorded.`,
        });
      }),
      ...sampleCard,
    ].join('')}</div>`;
}

// ---------------------------------------------------------------- 8. knowledge base

function traceTable(m) {
  const reqs = m.plan.requirements ?? [];
  return `<div class="table-scroll"><table>
    <thead><tr><th>Requirement</th><th>Kind</th><th>Covered by</th><th>Verified</th></tr></thead>
    <tbody>${reqs
      .map((r) => {
        const by = r.fulfilled_by ?? [];
        const gap = by.length === 0;
        const verified = by.filter((id) => m.progressById.get(id)?.verification?.state === 'verified').length;
        return `<tr>
          <td><strong>${esc(r.id)}</strong> ${esc(r.statement)}</td>
          <td>${esc(r.kind)} · ${esc(r.priority)}</td>
          <td>${
            gap
              ? `<span class="badge badge-gap">NO STORY</span>${r.kind === 'CONSTRAINT' ? '<br><span class="muted">constraint — context for other stories</span>' : r.priority === 'must' ? '<br><span class="slip">must, with nothing covering it</span>' : ''}`
              : by.map((id) => link('project', id)).join(', ')
          }</td>
          <td>${gap ? '—' : `${verified} of ${by.length}`}</td>
        </tr>`;
      })
      .join('')}</tbody>
  </table></div>`;
}

function renderKnowledge(detail) {
  const m = model();
  const reqs = m.plan.requirements ?? [];
  const gaps = reqs.filter((r) => !(r.fulfilled_by ?? []).length);
  const entries = [...(NOTES.decisions ?? []).map((d) => ({ ...d, kind: 'Decision' })), ...(NOTES.notes ?? []).map((n) => ({ ...n, kind: 'Note' }))];

  if (detail === 'requirements') {
    const clusters = [...new Set(reqs.map((r) => r.cluster ?? 'Other'))];
    return `${back('knowledge', 'Knowledge base')}
      <h2 class="page-title">Requirements</h2>
      <p class="lede">${plural(reqs.length, 'requirement')} from plan.json, grouped by capability.</p>
      ${clusters
        .map(
          (c) => `<section class="panel"><h3>${esc(c)}</h3><ul>${reqs
            .filter((r) => (r.cluster ?? 'Other') === c)
            .map((r) => `<li><strong>${esc(r.id)}</strong> <span class="muted">${esc(r.kind)} · ${esc(r.priority)}</span> — ${esc(r.statement)}</li>`)
            .join('')}</ul></section>`,
        )
        .join('')}`;
  }
  if (detail === 'stories') {
    return `${back('knowledge', 'Knowledge base')}
      <h2 class="page-title">Stories</h2>
      <p class="lede">Every story in plan.json with its narrative.</p>
      ${m.stories
        .map((s) => `<section class="panel"><h3>${link('project', s.id)} — ${esc(s.title)}</h3><p>${esc(s.narrative)}</p><p class="muted">Release ${esc(s.release)} · ${esc(stateLabel(s.state))}</p></section>`)
        .join('')}`;
  }
  if (detail === 'traceability') {
    return `${back('knowledge', 'Knowledge base')}
      <h2 class="page-title">Traceability</h2>
      <p class="lede">Every requirement, the stories that cover it (<code>fulfilled_by</code>) and how many of those are verified. Rows with no story are shown, not hidden.</p>
      <section class="panel">${traceTable(m)}</section>`;
  }
  if (detail === 'decisions-and-notes') {
    return `${back('knowledge', 'Knowledge base')}
      <h2 class="page-title">Decisions and notes</h2>
      <p class="lede">What the project has decided and learned as it goes. To add one, append an entry to <code>command-center/notes.js</code> and commit it — entries are added, never regenerated.</p>
      ${
        entries.length
          ? entries
              .map(
                (e) => `<section class="panel"><h3>${esc(e.kind)} · ${esc(e.date ?? '')}</h3><p>${esc(e.statement ?? e.text)}</p>${e.rationale ? `<p class="muted">Why: ${esc(e.rationale)}</p>` : ''}${e.evidence ? `<p class="muted">Evidence: <code>${esc(e.evidence)}</code></p>` : ''}</section>`,
              )
              .join('')
          : emptyState('Nothing recorded yet', '<p>No decisions or notes in command-center/notes.js.</p>')
      }`;
  }
  if (detail) return notFound('knowledge');

  return `
    <h2 class="page-title">Knowledge base</h2>
    <p class="lede">Everything the project knows about itself: requirements and stories from plan.json, state from progress.json, and the decisions and notes you add as you go.</p>
    <div class="grid">
      ${card({ tab: 'knowledge', id: 'requirements', title: 'Requirements', value: `${reqs.length}`, caption: Object.entries(m.plan.derived?.counts?.requirements_by_kind ?? {}).map(([k, n]) => `${esc(k)} ${esc(n)}`).join(' · ') || 'From plan.json.' })}
      ${card({ tab: 'knowledge', id: 'stories', title: 'Stories', value: `${m.stories.length}`, caption: 'Each with its narrative, release and state.' })}
      ${card({ tab: 'knowledge', id: 'traceability', title: 'Traceability', value: `${gaps.length} <small>${gaps.length === 1 ? 'requirement' : 'requirements'} with no story</small>`, caption: 'Which story covers which requirement, and whether it is verified.' })}
      ${card({ tab: 'knowledge', id: 'decisions-and-notes', title: 'Decisions and notes', value: `${entries.length}`, caption: 'Added by hand as the project goes.' })}
    </div>
    <section class="panel chat">
      <h3>Ask about this project</h3>
      <p class="muted">Answers come only from the data on these pages, with the tab they came from. If the data cannot answer, it says so. This runs in your browser; it is not an AI model.</p>
      <div class="chat-log" aria-live="polite">${
        chatLog.length
          ? chatLog
              .map((c) => `<div class="chat-q">${esc(c.q)}</div><div class="chat-a">${c.a.html}${c.a.source ? `<div class="chat-src">Source: ${c.a.source}</div>` : ''}</div>`)
              .join('')
          : '<p class="muted">Try: "Which stories are past due?", "Tell me about STORY-011", "Which guardrails are kept?", "When is demo day?"</p>'
      }</div>
      <form id="cc-chat" class="chat-form"><input name="q" type="text" autocomplete="off" placeholder="Ask a question…" aria-label="Question"><button type="submit">Ask</button></form>
    </section>`;
}

// Deterministic question answering over plan.json + progress.json. Every answer
// names its source tab; anything the files cannot answer is declined.
function answer(q) {
  const m = model();
  const { plan, progress } = m;
  const lc = q.toLowerCase();
  const src = (tab) => `<a href="#/${tab}">${esc(tabLabel(tab))}</a>`;
  const reply = (html, tab) => ({ html, source: tab ? src(tab) : null });
  const t = progress.totals ?? {};

  const storyIds = q.toUpperCase().match(/STORY-\d{3}/g);
  if (storyIds) {
    return reply(
      [...new Set(storyIds)]
        .map((id) => {
          const s = m.allStories.find((x) => x.id === id);
          if (!s) return `${esc(id)} is not in plan.json or progress.json.`;
          const cr = criteriaFor(m, id);
          return `<strong>${esc(id)}</strong>${s.title ? ` — ${esc(s.title)}` : ''}: ${esc(stateLabel(s.state))}, ${cr.filter((c) => c.passed).length} of ${cr.length} criteria ticked${s.inPlan ? `, release ${esc(s.release)}, due ${esc(fmtDay(s.due_on))}` : ''}.`;
        })
        .join('<br>'),
      'project',
    );
  }
  const reqIds = q.toUpperCase().match(/REQ-\d{3}/g);
  if (reqIds) {
    const reqs = reqMap(plan);
    return reply(
      [...new Set(reqIds)]
        .map((id) => {
          const r = reqs.get(id);
          if (!r) return `${esc(id)} is not in plan.json.`;
          return `<strong>${esc(id)}</strong> (${esc(r.kind)}, ${esc(r.priority)}): ${esc(r.statement)} Covered by: ${(r.fulfilled_by ?? []).join(', ') || 'no story'}.${m.isBuilt(r) ? ' Built.' : ' Not built yet.'}`;
        })
        .join('<br>'),
      'knowledge',
    );
  }
  if (/\b(sales|sell|sold|revenue|profit|expenses?|income|turnover|cash|how much|money|stock level|inventory level|owe|owed|owing)\b/.test(lc)) {
    return reply("I can't answer that from this project's data. These files hold the plan and the build progress, not business figures — your system has not produced any yet.", null);
  }
  if (/\b(table|tables|data model|schema|entity|entities)\b/.test(lc)) {
    const names = DATA_MODEL.tables.map((x) => x.name);
    return reply(names.length ? `The proposed data model has ${plural(names.length, 'table')}: ${esc(names.join(', '))}. None has been created yet.` : 'No data model has been proposed yet.', 'data-model');
  }
  if (/\bdemo\b/.test(lc)) {
    const d = demoRelease(plan);
    return reply(
      `Demo day is ${esc(fmtDay(plan.schedule?.demo_day))}. The demo target is ${d ? `<strong>${esc(d.key)}</strong> ${esc(d.name)}: ${esc((d.demo ?? d.goal ?? '').replace(/\.$/, ''))}` : 'not set'}.`,
      'project',
    );
  }
  if (/\b(due|late|overdue|slip|slipped|behind|deadline)\b/.test(lc)) {
    const late = m.stories.filter((s) => s.due_on && dayOnly(s.due_on) < today() && s.state !== 'verified');
    const moved = m.stories.filter((s) => s.due_baseline_on && s.due_on && s.due_on !== s.due_baseline_on);
    return reply(
      `${late.length ? `${plural(late.length, 'story')} past due and not verified: ${esc(late.map((s) => s.id).join(', '))}.` : 'No story is past due.'} ${moved.length ? `${plural(moved.length, 'story')} had their due date moved.` : 'No due date has moved from the date first given.'}`,
      'project',
    );
  }
  if (/\b(release|releases|r\d|sprint|timeline|schedule|gantt)\b/.test(lc)) {
    return reply(
      (plan.releases ?? []).map((r) => `<strong>${esc(r.key)}</strong> ${esc(r.name)} (${esc(fmtDay(r.starts_on))} → ${esc(fmtDay(r.ends_on))}, ${plural((r.story_ids ?? []).length, 'story')})`).join('<br>') || 'No releases in plan.json.',
      'project',
    );
  }
  if (/\b(guardrails?|safety|safe|promises?|never)\b/.test(lc)) {
    const g = plan.derived?.guardrails ?? [];
    return reply(g.length ? g.map((x) => `<strong>${esc(x.id)}</strong> ${esc(x.statement)} — ${esc(guardrailStatus(m, x).text)}`).join('<br>') : 'The plan has no SAFE requirements.', 'guardrails');
  }
  if (/\b(systems?|integrations?|connect|connected|connection|postgres|postgresql|whatsapp|api)\b/.test(lc)) {
    const sys = plan.derived?.systems ?? [];
    return reply(sys.length ? `The plan names ${esc(sys.join(', '))}. None is checked from this page, so their connection status is unknown.` : 'The plan names no systems.', 'systems');
  }
  if (/\b(agents?|owners?|autonomy)\b/.test(lc)) {
    const agents = plan.agents ?? [];
    if (agents.length) return reply(`${plural(agents.length, 'agent')} designed: ${esc(agents.map((a) => a.name).join(', '))}. No runs recorded.`, 'agents');
    const owners = [...new Set(m.stories.map((s) => s.owner_agent).filter(Boolean))];
    return reply(`The plan has no scoped agents. Stories are owned by these roles: ${esc(owners.join(', '))}.`, 'agents');
  }
  if (/\b(measures?|outcomes?|kpis?|targets?|metrics?)\b/.test(lc)) {
    const ms = plan.derived?.measures ?? [];
    return reply(ms.length ? ms.map((x) => `<strong>${esc(x.id)}</strong> ${esc(x.statement)}`).join('<br>') : 'The plan carries no measures or numeric targets yet.', 'outcomes');
  }
  if (/\b(gaps?|traceability|uncovered|not covered|missing)\b/.test(lc)) {
    const gaps = (plan.requirements ?? []).filter((r) => !(r.fulfilled_by ?? []).length);
    return reply(gaps.length ? `${plural(gaps.length, 'requirement')} with no story: ${esc(gaps.map((r) => `${r.id} (${r.kind}, ${r.priority})`).join(', '))}.` : 'Every requirement is covered by at least one story.', 'knowledge');
  }
  if (/\b(roles?|users?|who|persona|customers?)\b/.test(lc)) {
    const roles = plan.derived?.roles ?? [];
    return reply(roles.length ? `BizPilot is written for: ${esc(roles.join(', '))}.` : 'The plan names no roles.', 'users');
  }
  if (/\b(verified|progress|done|points|criteria|status|how far|finished|complete)\b/.test(lc)) {
    return reply(
      `${orNotReported(t.stories_verified)} of ${orNotReported(t.stories_total)} stories verified; ${orNotReported(t.criteria_passed)} of ${orNotReported(t.criteria_total)} criteria passed; ${orNotReported(t.points_awarded)} points, as reported in progress.json.`,
      'overview',
    );
  }
  return reply(
    "I can't answer that from the data on this page. I can answer about stories (e.g. STORY-001), requirements (REQ-008), releases, due dates, demo day, guardrails, systems, roles, agents, measures, traceability gaps, the data model and overall progress.",
    null,
  );
}

// ---------------------------------------------------------------- 9. data model

function renderDataModel(detail) {
  const m = model();
  const reqs = reqMap(m.plan);
  const tables = DATA_MODEL.tables ?? [];
  const reqLinks = (ids) =>
    (ids ?? [])
      .map((id) => (reqs.has(id) ? `<strong>${esc(id)}</strong> ${esc(reqs.get(id).statement)}` : `<strong>${esc(id)}</strong> <span class="slip">no longer in plan.json</span>`))
      .join('<br>') || '—';
  const draft = `<div class="banner banner-warn" role="note"><p><strong>Proposed — nothing has been created.</strong> This is a starting design derived from your requirements, for you to review before any table is built. The table design lives in <code>command-center/data-model.js</code>; the requirements it points at are read live from plan.json.</p></div>`;

  if (detail) {
    const tbl = tables.find((x) => x.name === detail);
    if (!tbl) return notFound('data-model');
    const referencedBy = tables.filter((x) => (x.fields ?? []).some((f) => f.ref === tbl.name)).map((x) => x.name);
    return `${back('data-model', 'Data model')}
      <h2 class="page-title">${esc(tbl.name)}</h2>
      <p class="lede">${esc(tbl.purpose)}</p>
      ${draft}
      <section class="panel"><h3>Fields</h3><div class="table-scroll"><table>
        <thead><tr><th>Field</th><th>Type</th><th>Notes</th></tr></thead>
        <tbody>${(tbl.fields ?? [])
          .map((f) => `<tr><td><code>${esc(f.name)}</code></td><td>${esc(f.type)}</td><td>${f.ref ? `→ ${link('data-model', f.ref)}. ` : ''}${esc(f.note ?? '')}</td></tr>`)
          .join('')}</tbody>
      </table></div></section>
      <section class="panel"><h3>Relationships</h3>
        <p>${(tbl.fields ?? []).filter((f) => f.ref).map((f) => `Each ${esc(tbl.name)} belongs to one ${link('data-model', f.ref)} (via <code>${esc(f.name)}</code>).`).join('<br>') || '<span class="muted">Points at no other table.</span>'}</p>
        <p>${referencedBy.length ? `Referenced by: ${referencedBy.map((n) => link('data-model', n)).join(', ')}.` : '<span class="muted">No other table points at it.</span>'}</p>
      </section>
      <section class="panel"><h3>Requirements it serves</h3><p>${reqLinks(tbl.serves)}</p></section>`;
  }

  return `
    <h2 class="page-title">Data model</h2>
    <p class="lede">The tables behind BizPilot, with fields and relationships, derived from the requirements. Every business table carries <code>tenant_id</code> (REQ-008, REQ-011) and money is stored as whole kobo so calculations stay exact and server-side (REQ-015).</p>
    ${draft}
    ${
      tables.length
        ? `<div class="grid">${tables
            .map((tbl) =>
              card({
                tab: 'data-model',
                id: tbl.name,
                title: tbl.name,
                value: `${(tbl.fields ?? []).length} <small>fields</small>`,
                caption: `${esc(tbl.purpose)}<br><span class="muted">Serves ${esc((tbl.serves ?? []).join(', ') || '—')}</span>`,
              }),
            )
            .join('')}</div>`
        : emptyState('No tables proposed yet', '<p>command-center/data-model.js has no tables.</p>')
    }`;
}

const TAB_RENDERERS = {
  overview: renderOverview,
  outcomes: renderOutcomes,
  users: renderUsers,
  guardrails: renderGuardrails,
  systems: renderSystems,
  project: renderProject,
  agents: renderAgents,
  knowledge: renderKnowledge,
  'data-model': renderDataModel,
};

// ---------------------------------------------------------------- boot

// Takes the three results (Promise.allSettled shape) however they were read.
function start([plan, progress, manifest]) {
  const failed = [plan, progress].filter((r) => r.status === 'rejected');
  if (failed.length) {
    const reasons = failed.map((r) => `<li>${esc(r.reason?.message ?? r.reason)}</li>`).join('');
    app.innerHTML = `<div class="fatal">
      <h1>Could not load the project data</h1>
      <ul>${reasons}</ul>
      <p>This page reads <code>.colaberry/plan.json</code> and <code>.colaberry/progress.json</code> each time it opens. Check the files exist in the repo and sync from the portal.</p>
    </div>`;
    return;
  }
  data = {
    plan: plan.value,
    progress: progress.value,
    manifest: manifest.status === 'fulfilled' ? manifest.value : null,
    manifestError: manifest.status === 'rejected' ? manifest.reason : null,
  };
  if (data.manifestError) console.error('manifest.json could not be loaded:', data.manifestError);
  render();
}

async function bootOverHttp() {
  start(await Promise.allSettled([fetchJson('plan.json'), fetchJson('progress.json'), fetchJson('manifest.json')]));
}

// Opened straight from disk (double-clicked): the browser will not let the page
// fetch files beside it, so ask for the three files and read them directly.
// Still the real files, read at runtime — nothing is copied into the code.
function bootFromDisk(message = '') {
  const names = ['plan.json', 'progress.json', 'manifest.json'];
  app.innerHTML = `<div class="fatal">
    <h1>Open your project data</h1>
    <p>This page was opened straight from disk, so the browser will not let it read <code>.colaberry/</code> by itself. Pick the three files once and it loads them:</p>
    <ol>
      <li>Press the button below.</li>
      <li>Go into the <code>.colaberry</code> folder next to <code>index.html</code>.</li>
      <li>Select <code>plan.json</code>, <code>progress.json</code> and <code>manifest.json</code> together (hold Ctrl), then Open.</li>
    </ol>
    <p><input type="file" id="cc-files" accept=".json,application/json" multiple></p>
    ${message ? `<p class="banner banner-warn">${esc(message)}</p>` : ''}
    <p class="muted">You will be asked again after a reload. To skip this step, serve the folder instead (<code>npx serve</code>) or use the GitHub Pages address.</p>
  </div>`;
  document.getElementById('cc-files').addEventListener('change', async (e) => {
    const byName = new Map([...e.target.files].map((f) => [f.name, f]));
    const missing = names.slice(0, 2).filter((n) => !byName.has(n));
    if (missing.length) return bootFromDisk(`Missing ${missing.join(' and ')} — select all three files from .colaberry.`);
    const read = async (n) => {
      const f = byName.get(n);
      if (!f) throw new Error(`${n} was not selected`);
      return JSON.parse(await f.text());
    };
    start(await Promise.allSettled(names.map(read)));
  });
}

const boot = location.protocol === 'file:' ? async () => bootFromDisk() : bootOverHttp;
boot().catch((err) => {
  console.error(err);
  app.innerHTML = `<div class="fatal"><h1>Something went wrong</h1><p>${esc(err.message)}</p></div>`;
});
})();

// Decisions and notes for the Knowledge base tab. Add new entries to the end of
// each list and commit — this file grows with the project, it is never regenerated.
// Each entry: { date: 'YYYY-MM-DD', statement, rationale?, evidence? }
window.CC_NOTES = {
  decisions: [
    {
      date: '2026-09-30',
      statement: 'The Command Center is a static page that reads .colaberry/plan.json, progress.json and manifest.json at runtime. No backend and no API key.',
      rationale: 'A static page cannot keep a secret, and the platform rewrites these files on every sync, so a copy typed into the code would go stale.',
      evidence: 'command-center/app.js',
    },
    {
      date: '2026-09-30',
      statement: 'When index.html is opened straight from disk, the page asks for the three .colaberry files and reads them directly.',
      rationale: 'Browsers block a page opened from disk from fetching files beside it, and from running JavaScript modules.',
      evidence: 'command-center/app.js (bootFromDisk)',
    },
    {
      date: '2026-09-30',
      statement: 'Connection indicators stay grey ("not checked from here") until the running system reports its own health.',
      rationale: 'plan.json only names the systems; nothing in the repo can reach them.',
      evidence: 'command-center/app.js (systemRows)',
    },
  ],
  notes: [
    {
      date: '2026-09-30',
      statement: 'progress.json reports 800 points awarded while 0 stories are verified. Shown as the platform wrote it; worth checking on the portal whether this is points available rather than earned.',
      evidence: '.colaberry/progress.json totals.points_awarded',
    },
  ],
};

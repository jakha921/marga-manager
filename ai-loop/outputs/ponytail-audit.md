# Ponytail Audit

delete: AI Studio prompt/spec docs from frontend if they are no longer used. Replacement: keep one current README or move historical prompts to docs/archive. [frontend/BACKEND_DOCS.md, frontend/BACKEND_PROMPT.md, frontend/DJANGO_BACKEND_SPEC.md, frontend/ONE_SHOT_PROMPT.md]
delete: unused `@google/genai` dependency and `GEMINI_API_KEY` Vite defines if no GenAI feature exists. Replacement: nothing. [frontend/package.json, frontend/vite.config.ts, frontend/vite-env.d.ts]
delete: Vite-era importmap in `index.html`; bundler already resolves React/Axios/Recharts/Lucide from npm. Replacement: normal Vite imports. [frontend/index.html]
shrink: `QuickInput.tsx` is near 1k lines and owns form config, filtering, history, totals, modals, and export. Replacement: extract only when changing that screen next; do not refactor now. [frontend/views/QuickInput.tsx]
net: -400 lines, -1 dep possible.

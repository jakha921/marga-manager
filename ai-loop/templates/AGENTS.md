# Agentic Loop

Use this section as a merge block for a project `AGENTS.md`. If the project already has `AGENTS.md`, append this section instead of replacing existing instructions.

## Communication

- Reply in Russian by default unless the user asks for another language.
- Be concise, practical, and direct.
- For coding tasks, explain the result, verification, and remaining risk.

## Workflow

- Inspect the existing project before changing files.
- For ambiguous, risky, or multi-step tasks, clarify requirements first.
- For large or complex work, write/update `ai-loop/PLAN.md` and wait for approval before implementation.
- Track meaningful progress in `ai-loop/TODO.md`.
- Keep `ai-loop/PLAN.md` focused on the current task only.
- Use `ai-loop/ITERATION_LOG.md` for meaningful checkpoints, not every file read.
- Use `ai-loop/STOP_CRITERIA.md` to decide when to stop, ask, or finish.

## Ponytail

- Prefer the smallest correct change.
- Reuse existing code and project patterns before adding anything new.
- Prefer stdlib, native platform features, and already-installed dependencies.
- Do not add abstractions, dependencies, config, or scaffolding for speculative future needs.
- Fix root causes once in the shared path instead of patching symptoms in every caller.

## Safety

- Do not overwrite existing `AGENTS.md`; merge instructions.
- Do not edit secrets, env files, credentials, generated files, or vendor files unless explicitly asked.
- Ask before public API changes, database schema changes, migrations, deploys, commit/push/PR/merge, destructive git actions, production/private access, or external write actions.
- Default completion target is a verified local diff, not commit/push/PR/deploy.

## Verification

- Discover existing test/build/lint commands from repo files before inventing new ones.
- Run the smallest relevant check.
- If no tests exist, run a smoke check that proves the changed path works.
- Record command, result, and remaining risk in `ai-loop/TODO.md`.

## Final Response

Use this short shape:

```md
Done.

Changed:
- ...

Verified:
- `command` -> result

Remaining risk:
- ...

Next:
- ...
```

If nothing changed:

```md
No code changes.

Found:
- ...

Next:
- ...
```

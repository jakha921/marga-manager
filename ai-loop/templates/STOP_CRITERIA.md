# STOP_CRITERIA

## Default Stop Criteria

Stop and ask before:

- changing public APIs or database schemas
- adding production dependencies
- migrations, deploy, push, merge, force/delete git actions
- editing secrets, env files, credentials, generated files, or vendor files
- write actions in external systems
- accessing production/private systems
- expanding beyond the approved scope
- continuing after two iterations in a row fail to improve the result

## Default Completion Criteria

The task is complete when:

- the approved scope is implemented
- the smallest relevant verification passed, or the failure is clearly reported
- `ai-loop/TODO.md` records checks, result, and remaining risk
- final response includes changed files, checks run, result, and remaining risk

## Task-Specific Stop Criteria

- [ ] Fill before execution if the task has measurable success criteria.

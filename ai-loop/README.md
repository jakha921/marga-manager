# AI Loop Template

Минимальный шаблон для agentic-loop работы в любом проекте: сначала изучить контекст, уточнить вопросы, написать план, получить подтверждение, потом работать по `TODO.md` и проверять результат.

## Target Layout

Скопируй/создай в целевом проекте:

```text
project/
  AGENTS.md
  ai-loop/
    TODO.md
    PLAN.md
    ITERATION_LOG.md
    STOP_CRITERIA.md
    work/
    outputs/
```

Если `AGENTS.md` уже есть, не перезаписывай его. Добавь секцию из `templates/AGENTS.md` в конец существующего файла.

## How To Use

1. Скопируй секцию из `templates/AGENTS.md` в `project/AGENTS.md`.
2. Скопируй файлы из `templates/` в `project/ai-loop/`.
3. Открой Codex в корне проекта.
4. Вставь prompt из `AGENTIC_LOOP.md`.

## Defaults

- Сначала уточнения, потом план.
- Для большой/сложной работы план обязателен.
- Работать после approval плана.
- Обновлять `ai-loop/TODO.md` после meaningful шагов.
- Не делать commit/push/PR/deploy без явного запроса.
- Использовать Ponytail: самый маленький корректный diff, без зависимостей и абстракций на будущее.
- `install.sh` намеренно нет. Добавлять только когда ручное копирование реально начнет мешать.

## Sources

- OpenAI Codex `AGENTS.md`: https://developers.openai.com/codex/guides/agents-md
- OpenAI Codex best practices: https://developers.openai.com/codex/learn/best-practices
- OpenAI Agent Skills: https://developers.openai.com/codex/skills
- OpenAI eval-driven iteration: https://developers.openai.com/codex/use-cases/iterate-on-difficult-problems
- Spec-first workflow: https://addyosmani.com/blog/good-spec/
- GitHub Spec Kit: https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/

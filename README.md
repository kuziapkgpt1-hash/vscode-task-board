# Task Board for VS Code

[English](#english) · [Русский](#русский)

## English

A sidebar panel that shows the project's task list from a `checklist.json` file in the root of the open folder. Save the file and the panel redraws itself.

It is meant for working with AI assistants (Claude Code, Codex and others): the assistant keeps `checklist.json` up to date, and you see at a glance what is done, what is in progress and what waits for your answer, without reading chats.

The interface is in Russian.

### What it shows

- Progress: how many tasks are done out of all.
- Filters: all, waiting for you, in progress, done.
- Sections that collapse on click.
- Each task: id, title, status, a one-line note; click to see details, date and author.
- Closed tasks rise to a block at the top; hide them one by one or all at once. Hiding is stored in VS Code for this folder only and never written to the file.
- Tasks changed since you last looked are marked.

The panel only reads `checklist.json`. It does not change the file and does not use the network.

### File format

See [example/checklist.json](example/checklist.json).

| Field | Meaning |
|---|---|
| `updated`, `by` | When and by whom the file was last changed (shown at the bottom) |
| `rules` | Optional rules for whoever edits the file; not shown |
| `sections[].id`, `title` | Section |
| `tasks[].id`, `title` | Task |
| `status` | `wait` — waits for you, `now` — in progress, `next` — next in line, `todo` — not started, `later` — some day, `done` — finished, `cancelled` — dropped |
| `note` | One line shown in the list |
| `details` | Longer text, shown on click |
| `changed`, `by` | Date of the last status change and who made it |

### Install

1. Download the `.vsix` file from [Releases](https://github.com/kuziapkgpt1-hash/vscode-task-board/releases).
2. Run `code --install-extension vscode-task-board-0.1.2.vsix`, or in VS Code: Extensions → `…` → Install from VSIX.
3. Open a folder that has `checklist.json` in its root. The panel «Задачи» appears in the activity bar.

Build it yourself without npm: `python build_vsix.py` (the file appears in `dist/`).

### License

MIT

## Русский

Панель слева в VS Code, которая показывает список задач проекта из файла `checklist.json` в корне открытой папки. Сохранили файл — панель перерисовалась сама.

Сделана для работы с ИИ-помощниками (Claude Code, Codex и другими): помощник ведёт `checklist.json`, а вы с одного взгляда видите, что готово, что в работе и что ждёт вашего ответа, — без чтения чатов.

### Что показывает

- Сколько задач готово из всех.
- Фильтры: все, ждёт тебя, в работе, готово.
- Разделы, которые сворачиваются нажатием.
- У задачи: номер, название, статус, строка пояснения; по нажатию — подробности, дата и кто менял.
- Закрытые задачи поднимаются в блок наверху; их можно скрыть по одной или все сразу. Скрытие хранится в VS Code только для этой папки и в файл не пишется.
- Отмечены задачи, которые изменились с прошлого просмотра.

Панель только читает `checklist.json`: файл не меняет и в интернет не ходит.

### Формат файла

Пример — [example/checklist.json](example/checklist.json). Статусы: `wait` — ждёт тебя, `now` — в работе, `next` — дальше, `todo` — не начато, `later` — потом, `done` — готово, `cancelled` — отменено. `note` — строка в списке, `details` — подробности по нажатию, `changed` и `by` — когда и кто менял статус.

### Установка

1. Скачайте файл `.vsix` в разделе [Releases](https://github.com/kuziapkgpt1-hash/vscode-task-board/releases).
2. Выполните `code --install-extension vscode-task-board-0.1.2.vsix` или в VS Code: Расширения → `…` → Установить из VSIX.
3. Откройте папку, в корне которой лежит `checklist.json`. Слева появится панель «Задачи».

Собрать самому без npm: `python build_vsix.py` (файл появится в `dist/`).

### Лицензия

MIT

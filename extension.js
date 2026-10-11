'use strict';
// Панель «Задачи»: показывает checklist.json из корня открытой папки и перерисовывается при его сохранении.
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const FILE = 'checklist.json';
const SAVED_KEYS = ['hidden', 'seen', 'ui'];

function activate(context) {
  const panel = new TasksPanel(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('taskBoard.view', panel, { webviewOptions: { retainContextWhenHidden: true } }),
    vscode.commands.registerCommand('taskBoard.refresh', () => panel.refresh()),
    vscode.commands.registerCommand('taskBoard.show', () => vscode.commands.executeCommand('workbench.view.extension.taskBoard'))
  );
  const file = panel.file();
  if (file && fs.existsSync(file)) {
    setTimeout(() => vscode.commands.executeCommand('workbench.view.extension.taskBoard'), 800);
  }
}

class TasksPanel {
  constructor(context) {
    this.context = context;
    this.view = undefined;
    this.data = undefined;
    this.error = undefined;
    this.timer = undefined;
    const root = this.root();
    if (root) {
      const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(root, FILE));
      const changed = () => {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.refresh(), 200);
      };
      watcher.onDidChange(changed);
      watcher.onDidCreate(changed);
      watcher.onDidDelete(changed);
      context.subscriptions.push(watcher);
    }
  }

  root() {
    const folders = vscode.workspace.workspaceFolders;
    return folders && folders.length ? folders[0].uri.fsPath : undefined;
  }

  file() {
    const root = this.root();
    return root ? path.join(root, FILE) : undefined;
  }

  read() {
    const file = this.file();
    if (!file || !fs.existsSync(file)) {
      this.error = 'В открытой папке нет файла checklist.json';
      return;
    }
    try {
      let text = fs.readFileSync(file, 'utf8');
      if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
      this.data = JSON.parse(text);
      this.error = undefined;
    } catch (e) {
      this.error = 'Ошибка в checklist.json: ' + e.message + (this.data ? '. Показана последняя исправная версия.' : '');
    }
  }

  refresh() {
    this.read();
    if (!this.view) return;
    const state = this.context.workspaceState;
    this.view.webview.postMessage({
      type: 'data',
      data: this.data,
      error: this.error,
      hidden: state.get('hidden', {}),
      seen: state.get('seen', null),
      ui: state.get('ui', {}),
    });
  }

  resolveWebviewView(view) {
    this.view = view;
    const media = vscode.Uri.joinPath(this.context.extensionUri, 'media');
    view.webview.options = { enableScripts: true, localResourceRoots: [media] };
    const css = view.webview.asWebviewUri(vscode.Uri.joinPath(media, 'panel.css'));
    const js = view.webview.asWebviewUri(vscode.Uri.joinPath(media, 'panel.js'));
    const csp = view.webview.cspSource;
    view.webview.html = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${csp}; script-src ${csp};">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${css}"></head>
<body><div id="app"></div><script src="${js}"></script></body></html>`;
    view.webview.onDidReceiveMessage((msg) => {
      if (msg.type === 'ready' || msg.type === 'refresh') this.refresh();
      else if (msg.type === 'save' && SAVED_KEYS.includes(msg.key)) this.context.workspaceState.update(msg.key, msg.value);
    });
    view.onDidChangeVisibility(() => {
      if (view.visible) this.refresh();
    });
  }
}

function deactivate() {}

module.exports = { activate, deactivate };

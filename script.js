/* ============================================================
   NEURAL OS // MATRIX CODE STUDIO v7.0
   IDE ENGINE
   ============================================================ */

'use strict';

/* ============================================================
   CONFIGURAÇÕES
   ============================================================ */

const CONFIG = {
  version: '7.0',
  storageKey: 'NEURAL_OS_WORKSPACE_V7',
  autosaveDelay: 700,
  previewDelay: 250,
  matrixSpeed: 35,
  maxConsoleLines: 500,
  defaultIndent: '  '
};

/* ============================================================
   ELEMENTOS DOM
   ============================================================ */

const canvas = document.getElementById('matrixCanvas');
const ctx = canvas.getContext('2d');

const tabsBar = document.getElementById('tabsBar');
const fileTree = document.getElementById('fileTree');
const codeEditor = document.getElementById('codeEditor');
const highlightCode = document.getElementById('highlightCode');
const highlightArea = document.getElementById('highlightArea');
const lineNumbers = document.getElementById('lineNumbers');
const minimap = document.getElementById('minimap');

const langSelect = document.getElementById('langSelect');
const tabNameInput = document.getElementById('tabNameInput');
const connectTabSelect = document.getElementById('connectTabSelect');

const statusInfo = document.getElementById('statusInfo');
const statusExecution = document.getElementById('statusExecution');

const logContent = document.getElementById('logContent');
const consoleOutput = document.getElementById('consoleOutput');

const livePreviewFrame = document.getElementById('livePreviewFrame');
const btnAutoRefresh = document.getElementById('btnAutoRefresh');

const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

const replInput = document.getElementById('replInput');
const btnSendRepl = document.getElementById('btnSendRepl');

const fileInput = document.getElementById('fileInput');

/* ============================================================
   ESTADO GLOBAL
   ============================================================ */

let files = [];
let activeFileId = null;

let nextFileId = 1;

let isAutoSyncEnabled = true;
let isDirty = false;

let previewTimer = null;
let saveTimer = null;

let editorFontSize = 14;

let pyodide = null;
let pyodideLoading = false;

/* ============================================================
   TEMPLATES
   ============================================================ */

const codeTemplates = {

  html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">

  <title>NEURAL APP</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;

      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;

      background:
        radial-gradient(circle at center, #102516, #020804);

      color: #00ff41;

      font-family:
        Arial,
        sans-serif;

      text-align: center;
    }

    h1 {
      font-size: 42px;

      text-shadow:
        0 0 10px #00ff41,
        0 0 30px #00ff41;
    }

    button {
      padding: 12px 24px;

      background: #00ff41;
      color: #020804;

      border: none;
      border-radius: 6px;

      font-weight: bold;

      cursor: pointer;

      box-shadow:
        0 0 15px rgba(0,255,65,.5);
    }

    button:hover {
      transform: scale(1.05);
    }
  </style>
</head>

<body>

  <h1>NEURAL OS</h1>

  <p>LIVE PREVIEW ONLINE</p>

  <button onclick="teste()">
    EXECUTAR
  </button>

  <script>
    function teste() {
      console.log("Sistema funcionando!");
      alert("NEURAL OS ONLINE");
    }
  <\/script>

</body>
</html>`,

  javascript: `// NEURAL OS JavaScript

console.log("Sistema iniciado!");

const mensagem = "Olá, NEURAL OS!";

console.log(mensagem);

// Experimente modificar o código.

document.body.innerHTML += \`
  <div style="
    padding:20px;
    color:#00ff41;
    font-family:monospace;
  ">
    JavaScript executado com sucesso.
  </div>
\`;`,

  python: `# NEURAL OS Python

print("NEURAL OS ONLINE")

nome = "Programador"

print("Olá,", nome)

for i in range(5):
    print("Processando:", i)`,

  cpp: `#include <iostream>

using namespace std;

int main() {

    cout << "NEURAL OS ONLINE" << endl;

    for (int i = 0; i < 5; i++) {
        cout << "Processando: "
             << i << endl;
    }

    return 0;
}`,

  csharp: `using System;

class Program
{
    static void Main()
    {
        Console.WriteLine("NEURAL OS ONLINE");

        for (int i = 0; i < 5; i++)
        {
            Console.WriteLine(
                "Processando: " + i
            );
        }
    }
}`,

  lua: `print("NEURAL OS ONLINE")

local nome = "Programador"

print("Olá " .. nome)

for i = 1, 5 do
    print("Processando:", i)
end`,

  markdown: `# NEURAL OS

## Matrix Code Studio

Bem-vindo ao **NEURAL OS**.

### Recursos

- Editor
- Live Preview
- Console
- Snippets
- Python
- C/C++
- Markdown

\`\`\`javascript
console.log("Hello World");
\`\`\`
`,

  json: `{
  "name": "NEURAL OS",
  "version": "7.0",
  "status": "online",
  "features": [
    "editor",
    "preview",
    "console",
    "matrix"
  ]
}`
};

/* ============================================================
   UTILITÁRIOS
   ============================================================ */

function escapeHTML(value) {

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


function generateId() {

  return Date.now() + Math.floor(Math.random() * 10000);
}


function getActiveFile() {

  return files.find(file => file.id === activeFileId);
}


function getLanguageFromName(name) {

  const extension =
    name
      .split('.')
      .pop()
      .toLowerCase();

  const map = {
    html: 'html',
    htm: 'html',

    js: 'javascript',
    mjs: 'javascript',

    py: 'python',

    c: 'cpp',
    h: 'cpp',
    cpp: 'cpp',
    hpp: 'cpp',

    cs: 'csharp',

    lua: 'lua',

    md: 'markdown',

    json: 'json'
  };

  return map[extension] || 'javascript';
}


function getExtension(language) {

  const map = {
    html: 'html',
    javascript: 'js',
    python: 'py',
    cpp: 'cpp',
    csharp: 'cs',
    lua: 'lua',
    markdown: 'md',
    json: 'json'
  };

  return map[language] || 'txt';
}


/* ============================================================
   MATRIX BACKGROUND
   ============================================================ */

let matrixWidth = 0;
let matrixHeight = 0;
let matrixColumns = 0;

const matrixChars =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz<>[]{}/*=+#$@';

const matrixFontSize = 15;

let matrixDrops = [];


function resizeMatrix() {

  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  matrixWidth = window.innerWidth;
  matrixHeight = window.innerHeight;

  canvas.width = matrixWidth * dpr;
  canvas.height = matrixHeight * dpr;

  canvas.style.width = matrixWidth + 'px';
  canvas.style.height = matrixHeight + 'px';

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  matrixColumns =
    Math.ceil(matrixWidth / matrixFontSize);

  matrixDrops =
    Array.from(
      { length: matrixColumns },
      () => Math.floor(Math.random() * -80)
    );
}


function drawMatrix() {

  ctx.fillStyle = 'rgba(2, 8, 4, 0.13)';

  ctx.fillRect(
    0,
    0,
    matrixWidth,
    matrixHeight
  );

  ctx.font =
    `bold ${matrixFontSize}px "Fira Code", monospace`;

  for (let i = 0; i < matrixDrops.length; i++) {

    const char =
      matrixChars[
        Math.floor(
          Math.random() * matrixChars.length
        )
      ];

    const x =
      i * matrixFontSize;

    const y =
      matrixDrops[i] * matrixFontSize;

    /* cabeça */
    ctx.fillStyle = '#ffffff';

    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ff41';

    ctx.fillText(
      char,
      x,
      y
    );

    /* corpo */
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#00ff41';

    ctx.fillText(
      char,
      x,
      y - matrixFontSize
    );

    if (
      y > matrixHeight &&
      Math.random() > 0.975
    ) {
      matrixDrops[i] =
        Math.floor(Math.random() * -20);
    }

    matrixDrops[i]++;
  }

  requestAnimationFrame(drawMatrix);
}


resizeMatrix();

window.addEventListener(
  'resize',
  resizeMatrix
);

requestAnimationFrame(drawMatrix);


/* ============================================================
   LOCAL STORAGE
   ============================================================ */

function saveWorkspace() {

  try {

    const data = {
      version: CONFIG.version,
      files,
      activeFileId,
      editorFontSize
    };

    localStorage.setItem(
      CONFIG.storageKey,
      JSON.stringify(data)
    );

  } catch (error) {

    printToTerminal(
      'error',
      ['Falha ao salvar workspace:', error.message]
    );
  }
}


function loadWorkspace() {

  try {

    const saved =
      localStorage.getItem(
        CONFIG.storageKey
      );

    if (!saved) {

      createDefaultWorkspace();

      return;
    }

    const data =
      JSON.parse(saved);

    if (
      !data.files ||
      !Array.isArray(data.files)
    ) {

      createDefaultWorkspace();

      return;
    }

    files = data.files;

    activeFileId =
      data.activeFileId ||
      files[0]?.id;

    editorFontSize =
      data.editorFontSize || 14;

    nextFileId =
      Math.max(
        ...files.map(file => Number(file.id) || 0),
        0
      ) + 1;

  } catch (error) {

    console.error(error);

    createDefaultWorkspace();
  }
}


function createDefaultWorkspace() {

  files = [

    {
      id: generateId(),
      name: 'index.html',
      lang: 'html',
      code: codeTemplates.html,
      dirty: false
    },

    {
      id: generateId(),
      name: 'script.js',
      lang: 'javascript',
      code: codeTemplates.javascript,
      dirty: false
    }

  ];

  activeFileId =
    files[0].id;

  nextFileId =
    files.length + 1;
}


/* ============================================================
   RENDER EXPLORER
   ============================================================ */

function renderExplorer() {

  fileTree.innerHTML = '';

  if (!files.length) {

    fileTree.innerHTML =
      '<div class="file-item">Nenhum arquivo</div>';

    return;
  }

  files.forEach(file => {

    const item =
      document.createElement('div');

    item.className =
      'file-item' +
      (
        file.id === activeFileId
          ? ' active'
          : ''
      );

    const icon =
      getFileIcon(file.lang);

    const dirty =
      file.dirty
        ? ' •'
        : '';

    item.innerHTML = `
      <span>${icon}</span>
      <span>${escapeHTML(file.name)}</span>
      <span style="margin-left:auto">${dirty}</span>
    `;

    item.title =
      `${file.name} — ${file.lang}`;

    item.addEventListener(
      'click',
      () => switchFile(file.id)
    );

    item.addEventListener(
      'contextmenu',
      event => {

        event.preventDefault();

        renameFile(
          file.id,
          prompt(
            'Novo nome:',
            file.name
          )
        );
      }
    );

    fileTree.appendChild(item);
  });
}


function getFileIcon(lang) {

  const icons = {

    html: '🌐',
    javascript: 'JS',
    python: '🐍',
    cpp: 'C++',
    csharp: 'C#',
    lua: '🌙',
    markdown: 'MD',
    json: '{}'
  };

  return icons[lang] || '📄';
}


/* ============================================================
   TABS
   ============================================================ */

function renderTabs() {

  tabsBar.innerHTML = '';

  files.forEach(file => {

    const tab =
      document.createElement('div');

    tab.className =
      'tab' +
      (
        file.id === activeFileId
          ? ' active'
          : ''
      );

    const dirty =
      file.dirty
        ? '●'
        : '';

    tab.innerHTML = `
      <span class="tab-title">
        ${escapeHTML(file.name)}
      </span>

      <span
        style="
          color:#00ff41;
          font-size:9px;
        "
      >
        ${dirty}
      </span>

      <span
        class="tab-close"
        title="Fechar"
      >
        ×
      </span>
    `;

    tab.addEventListener(
      'click',
      event => {

        if (
          event.target.classList.contains(
            'tab-close'
          )
        ) {

          closeFile(file.id);

          return;
        }

        switchFile(file.id);
      }
    );

    tab.addEventListener(
      'dblclick',
      () => {

        const newName =
          prompt(
            'Novo nome do arquivo:',
            file.name
          );

        renameFile(
          file.id,
          newName
        );
      }
    );

    tabsBar.appendChild(tab);
  });

  updateConnectDropdown();
}


/* ============================================================
   DROPDOWN DE CONEXÃO
   ============================================================ */

function updateConnectDropdown() {

  connectTabSelect.innerHTML =
    '<option value="">-- Selecionar --</option>';

  files
    .filter(
      file =>
        file.id !== activeFileId
    )
    .forEach(file => {

      const option =
        document.createElement('option');

      option.value =
        file.id;

      option.textContent =
        file.name;

      connectTabSelect.appendChild(
        option
      );
    });
}


/* ============================================================
   ARQUIVOS
   ============================================================ */

function saveCurrentFile() {

  const file =
    getActiveFile();

  if (!file) return;

  file.code =
    codeEditor.value;

  file.name =
    tabNameInput.value.trim() ||
    file.name;

  file.lang =
    langSelect.value;

  file.dirty = false;

  isDirty = false;

  renderExplorer();
  renderTabs();

  saveWorkspace();

  printToTerminal(
    'info',
    [`Arquivo salvo: ${file.name}`]
  );
}


function switchFile(id) {

  saveCurrentStateOnly();

  const target =
    files.find(
      file => file.id === id
    );

  if (!target) return;

  activeFileId =
    id;

  codeEditor.value =
    target.code;

  langSelect.value =
    target.lang;

  tabNameInput.value =
    target.name;

  isDirty =
    !!target.dirty;

  renderExplorer();
  renderTabs();

  updateEditor();

  updateLivePreview();

  updateStatus();
}


function saveCurrentStateOnly() {

  const file =
    getActiveFile();

  if (!file) return;

  file.code =
    codeEditor.value;

  file.name =
    tabNameInput.value.trim() ||
    file.name;

  file.lang =
    langSelect.value;
}


function createNewFile(language = 'javascript') {

  saveCurrentStateOnly();

  const extension =
    getExtension(language);

  let number = 1;

  let name;

  do {

    name =
      `novo_arquivo_${number}.${extension}`;

    number++;

  } while (
    files.some(
      file => file.name === name
    )
  );

  const file = {

    id: generateId(),

    name,

    lang: language,

    code:
      codeTemplates[language] ||
      '// Novo arquivo\n',

    dirty: false
  };

  files.push(file);

  switchFile(file.id);

  printToTerminal(
    'info',
    [`Novo arquivo criado: ${name}`]
  );
}


function renameFile(id, newName) {

  if (!newName) return;

  newName =
    newName.trim();

  if (!newName) return;

  if (
    files.some(
      file =>
        file.id !== id &&
        file.name.toLowerCase() ===
        newName.toLowerCase()
    )
  ) {

    printToTerminal(
      'error',
      ['Já existe um arquivo com esse nome.']
    );

    return;
  }

  const file =
    files.find(
      file => file.id === id
    );

  if (!file) return;

  file.name =
    newName;

  file.lang =
    getLanguageFromName(newName);

  if (
    file.id === activeFileId
  ) {

    langSelect.value =
      file.lang;

    tabNameInput.value =
      file.name;
  }

  renderExplorer();
  renderTabs();

  saveWorkspace();
}


function closeFile(id) {

  if (files.length <= 1) {

    printToTerminal(
      'warn',
      ['O último arquivo não pode ser fechado.']
    );

    return;
  }

  const index =
    files.findIndex(
      file => file.id === id
    );

  if (index === -1) return;

  const wasActive =
    id === activeFileId;

  files.splice(
    index,
    1
  );

  if (wasActive) {

    const newIndex =
      Math.max(
        0,
        index - 1
      );

    activeFileId =
      files[newIndex].id;
  }

  switchFile(
    activeFileId
  );

  saveWorkspace();
}


/* ============================================================
   EDITOR
   ============================================================ */

function getPrismLanguage(language) {

  const map = {

    javascript: 'javascript',
    html: 'markup',
    python: 'python',
    cpp: 'cpp',
    csharp: 'csharp',
    lua: 'lua',
    markdown: 'markdown',
    json: 'json'
  };

  return map[language] ||
    'javascript';
}


function updateEditor() {

  const code =
    codeEditor.value;

  highlightCode.textContent =
    code;

  highlightCode.className =
    `language-${getPrismLanguage(
      langSelect.value
    )}`;

  if (
    typeof Prism !== 'undefined'
  ) {

    Prism.highlightElement(
      highlightCode
    );
  }

  updateLineNumbers(code);

  updateMinimap(code);

  updateStatus();
}


function updateLineNumbers(code) {

  const lineCount =
    Math.max(
      1,
      code.split('\n').length
    );

  let html = '';

  for (
    let i = 1;
    i <= lineCount;
    i++
  ) {

    html +=
      i +
      (
        i < lineCount
          ? '<br>'
          : ''
      );
  }

  lineNumbers.innerHTML =
    html;
}


function updateMinimap(code) {

  minimap.textContent =
    code
      .replace(/\t/g, '  ')
      .split('\n')
      .map(
        line =>
          line.substring(
            0,
            100
          )
      )
      .join('\n');
}


function updateStatus() {

  const code =
    codeEditor.value;

  const position =
    codeEditor.selectionStart;

  const before =
    code.substring(
      0,
      position
    );

  const line =
    before.split('\n').length;

  const lastNewLine =
    before.lastIndexOf('\n');

  const column =
    position -
    lastNewLine;

  statusInfo.textContent =
    `Linha: ${line} | Coluna: ${column} | Caracteres: ${code.length}`;
}


function markFileModified() {

  const file =
    getActiveFile();

  if (!file) return;

  file.code =
    codeEditor.value;

  file.name =
    tabNameInput.value.trim() ||
    file.name;

  file.lang =
    langSelect.value;

  file.dirty = true;

  isDirty = true;

  renderTabs();
  renderExplorer();

  scheduleSave();
}


function scheduleSave() {

  clearTimeout(saveTimer);

  saveTimer =
    setTimeout(
      saveWorkspace,
      CONFIG.autosaveDelay
    );
}


/* ============================================================
   SCROLL DO EDITOR
   ============================================================ */

function syncEditorScroll() {

  highlightArea.scrollTop =
    codeEditor.scrollTop;

  highlightArea.scrollLeft =
    codeEditor.scrollLeft;

  lineNumbers.scrollTop =
    codeEditor.scrollTop;

  minimap.scrollTop =
    codeEditor.scrollTop;
}


codeEditor.addEventListener(
  'scroll',
  syncEditorScroll
);


/* ============================================================
   LIVE PREVIEW
   ============================================================ */

function updateLivePreview() {

  if (!isAutoSyncEnabled)
    return;

  clearTimeout(
    previewTimer
  );

  previewTimer =
    setTimeout(
      renderPreview,
      CONFIG.previewDelay
    );
}


function renderPreview() {

  const file =
    getActiveFile();

  if (!file) return;

  const start =
    performance.now();

  let content = '';

  switch (
    file.lang
  ) {

    case 'html':

      content =
        file.code;

      break;


    case 'javascript':

      content =
        createJavaScriptPreview(
          file.code
        );

      break;


    case 'markdown':

      content =
        createMarkdownPreview(
          file.code
        );

      break;


    case 'json':

      content =
        createJSONPreview(
          file.code
        );

      break;


    case 'python':

      content =
        createExecutionScreen(
          'PYTHON 3.11',
          'Clique em EXECUTAR ou use Ctrl+Enter.'
        );

      break;


    case 'cpp':

      content =
        createExecutionScreen(
          'C / C++',
          'Clique em EXECUTAR para compilar.'
        );

      break;


    case 'csharp':

      content =
        createExecutionScreen(
          'C#',
          'Visualização de C#.'
        );

      break;


    case 'lua':

      content =
        createExecutionScreen(
          'LUA 5.3',
          'Clique em EXECUTAR.'
        );

      break;


    default:

      content =
        createExecutionScreen(
          'NEURAL OS',
          'Preview indisponível.'
        );
  }

  livePreviewFrame.srcdoc =
    content;

  const elapsed =
    Math.round(
      performance.now() - start
    );

  statusExecution.textContent =
    `Tempo: ${elapsed}ms`;
}


function createJavaScriptPreview(code) {

  const safeCode =
    code.replace(
      /<\/script/gi,
      '<\\/script'
    );

  return `
<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<style>

* {
  box-sizing:border-box;
}

body {
  margin:0;
  min-height:100vh;

  background:
    radial-gradient(
      circle at center,
      #102516,
      #020804
    );

  color:#00ff41;

  font-family:
    "Fira Code",
    monospace;

  padding:25px;
}

h2 {
  text-shadow:
    0 0 10px #00ff41;
}

#output {
  white-space:pre-wrap;

  border:1px solid
    rgba(0,255,65,.3);

  padding:15px;

  margin-top:20px;

  background:
    rgba(0,0,0,.5);
}

.error {
  color:#ff5555;
}

</style>

</head>

<body>

<h2>⚡ JAVASCRIPT EXECUTION</h2>

<div id="output"></div>

<script>

const output =
document.getElementById('output');

function writeLog(...args) {

  output.textContent +=
    args
      .map(
        x =>
          typeof x === 'object'
            ? JSON.stringify(x, null, 2)
            : String(x)
      )
      .join(' ') +
    '\\n';
}

console.log = writeLog;

console.warn = (...args) => {

  writeLog(
    '[WARN]',
    ...args
  );
};

console.error = (...args) => {

  writeLog(
    '[ERROR]',
    ...args
  );
};

window.onerror =
function(
  message,
  source,
  line,
  column,
  error
) {

  output.innerHTML +=
    '<div class="error">' +
    String(message) +
    '</div>';

};

try {

${safeCode}

} catch(error) {

  console.error(
    error.message
  );
}

<\/script>

</body>

</html>
`;
}


function createMarkdownPreview(code) {

  let markdownHTML;

  if (
    typeof marked !== 'undefined'
  ) {

    markdownHTML =
      marked.parse(code);

  } else {

    markdownHTML =
      `<pre>${escapeHTML(code)}</pre>`;
  }

  return `
<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<style>

body {

  margin:0;

  padding:30px;

  background:#020804;

  color:#00ff41;

  font-family:
    Arial,
    sans-serif;

  line-height:1.6;
}

h1,
h2,
h3 {

  color:#00ff41;

  text-shadow:
    0 0 10px
    rgba(0,255,65,.5);
}

code {

  background:#001507;

  padding:3px 6px;

  border-radius:4px;
}

pre {

  background:#001507;

  padding:15px;

  overflow:auto;

  border:
    1px solid
    rgba(0,255,65,.2);
}

a {

  color:#66ff8c;
}

</style>

</head>

<body>

${markdownHTML}

</body>

</html>
`;
}


function createJSONPreview(code) {

  try {

    const data =
      JSON.parse(code);

    return `
<!DOCTYPE html>

<html>

<body style="
  margin:0;
  padding:25px;
  background:#020804;
  color:#00ff41;
  font-family:monospace;
">

<h2>JSON VALID</h2>

<pre>${escapeHTML(
  JSON.stringify(
    data,
    null,
    2
  )
)}</pre>

</body>

</html>
`;

  } catch (error) {

    return `
<!DOCTYPE html>

<html>

<body style="
  background:#020804;
  color:#ff5555;
  font-family:monospace;
  padding:25px;
">

<h2>JSON ERROR</h2>

<pre>${escapeHTML(
  error.message
)}</pre>

</body>

</html>
`;
  }
}


function createExecutionScreen(
  title,
  message
) {

  return `
<!DOCTYPE html>

<html>

<body style="
  margin:0;
  min-height:100vh;

  display:flex;
  flex-direction:column;

  justify-content:center;
  align-items:center;

  background:#020804;

  color:#00ff41;

  font-family:monospace;

  text-align:center;
">

<div style="
  border:1px solid
  rgba(0,255,65,.4);

  padding:30px;

  box-shadow:
    0 0 25px
    rgba(0,255,65,.15);
">

<h1>${escapeHTML(title)}</h1>

<p>${escapeHTML(message)}</p>

<p style="
  opacity:.5;
">
NEURAL OS ENGINE
</p>

</div>

</body>

</html>
`;
}


/* ============================================================
   AUTO SYNC
   ============================================================ */

btnAutoRefresh.addEventListener(
  'click',
  () => {

    isAutoSyncEnabled =
      !isAutoSyncEnabled;

    btnAutoRefresh.classList.toggle(
      'active',
      isAutoSyncEnabled
    );

    btnAutoRefresh.textContent =
      isAutoSyncEnabled
        ? 'Auto-Sync: ON'
        : 'Auto-Sync: OFF';

    if (
      isAutoSyncEnabled
    ) {

      renderPreview();
    }
  }
);


/* ============================================================
   EDITOR INPUT
   ============================================================ */

codeEditor.addEventListener(
  'input',
  () => {

    markFileModified();

    updateEditor();

    updateLivePreview();
  }
);


codeEditor.addEventListener(
  'click',
  updateStatus
);


codeEditor.addEventListener(
  'keyup',
  updateStatus
);


codeEditor.addEventListener(
  'select',
  updateStatus
);


/* ============================================================
   TAB NO EDITOR
   ============================================================ */

codeEditor.addEventListener(
  'keydown',
  event => {

    /* TAB */

    if (
      event.key === 'Tab'
    ) {

      event.preventDefault();

      const start =
        codeEditor.selectionStart;

      const end =
        codeEditor.selectionEnd;

      const selected =
        codeEditor.value.substring(
          start,
          end
        );

      if (
        selected.includes('\n')
      ) {

        const indented =
          selected
            .split('\n')
            .map(
              line =>
                CONFIG.defaultIndent +
                line
            )
            .join('\n');

        codeEditor.value =
          codeEditor.value.substring(
            0,
            start
          ) +
          indented +
          codeEditor.value.substring(
            end
          );

        codeEditor.selectionStart =
          start;

        codeEditor.selectionEnd =
          start +
          indented.length;

      } else {

        codeEditor.value =
          codeEditor.value.substring(
            0,
            start
          ) +
          CONFIG.defaultIndent +
          codeEditor.value.substring(
            end
          );

        codeEditor.selectionStart =
          start +
          CONFIG.defaultIndent.length;

        codeEditor.selectionEnd =
          codeEditor.selectionStart;
      }

      markFileModified();

      updateEditor();

      updateLivePreview();

      return;
    }


    /* ENTER */

    if (
      event.key === 'Enter'
    ) {

      event.preventDefault();

      const start =
        codeEditor.selectionStart;

      const end =
        codeEditor.selectionEnd;

      const before =
        codeEditor.value.substring(
          0,
          start
        );

      const after =
        codeEditor.value.substring(
          end
        );

      const currentLine =
        before
          .split('\n')
          .pop();

      const indentation =
        currentLine.match(
          /^\s*/
        )?.[0] || '';

      let extraIndent = '';

      if (
        /[\{\[\(]\s*$/.test(
          currentLine
        )
      ) {

        extraIndent =
          CONFIG.defaultIndent;
      }

      const insertion =
        '\n' +
        indentation +
        extraIndent;

      codeEditor.value =
        before +
        insertion +
        after;

      codeEditor.selectionStart =
        start +
        insertion.length;

      codeEditor.selectionEnd =
        codeEditor.selectionStart;

      markFileModified();

      updateEditor();

      updateLivePreview();

      return;
    }


    /* CTRL + / */

    if (
      event.ctrlKey &&
      event.key === '/'
    ) {

      event.preventDefault();

      toggleComment();

      return;
    }


    /* CTRL + ENTER */

    if (
      event.ctrlKey &&
      event.key === 'Enter'
    ) {

      event.preventDefault();

      executeCurrentFile();
    }
  }
);


/* ============================================================
   COMENTAR / DESCOMENTAR
   ============================================================ */

function toggleComment() {

  const start =
    codeEditor.selectionStart;

  const end =
    codeEditor.selectionEnd;

  const value =
    codeEditor.value;

  const lineStart =
    value.lastIndexOf(
      '\n',
      start - 1
    ) + 1;

  const lineEndIndex =
    value.indexOf(
      '\n',
      end
    );

  const lineEnd =
    lineEndIndex === -1
      ? value.length
      : lineEndIndex;

  const selected =
    value.substring(
      lineStart,
      lineEnd
    );

  const lines =
    selected.split('\n');

  const language =
    langSelect.value;

  let comment;

  if (
    language === 'html'
  ) {

    comment = '<!--';

  } else if (
    language === 'python' ||
    language === 'lua'
  ) {

    comment = '#';

    if (language === 'lua') {
      comment = '--';
    }

  } else {

    comment = '//';
  }

  const uncomment =
    lines.every(
      line =>
        line.trim() === '' ||
        line.trim().startsWith(comment)
    );

  const changed =
    uncomment

      ? lines
          .map(
            line =>
              line.replace(
                new RegExp(
                  `^(\\s*)${escapeRegex(comment)}\\s?`
                ),
                '$1'
              )
          )
          .join('\n')

      : lines
          .map(
            line =>
              line.trim()
                ? `${comment} ${line}`
                : line
          )
          .join('\n');

  codeEditor.value =
    value.substring(
      0,
      lineStart
    ) +
    changed +
    value.substring(
      lineEnd
    );

  codeEditor.selectionStart =
    lineStart;

  codeEditor.selectionEnd =
    lineStart +
    changed.length;

  markFileModified();

  updateEditor();

  updateLivePreview();
}


function escapeRegex(value) {

  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
}


/* ============================================================
   EXECUÇÃO
   ============================================================ */

async function executeCurrentFile() {

  saveCurrentStateOnly();

  const file =
    getActiveFile();

  if (!file) return;

  const start =
    performance.now();

  printToTerminal(
    'info',
    [
      `Executando ${file.name}...`
    ]
  );

  try {

    switch (
      file.lang
    ) {

      case 'javascript':

        await executeJavaScript(
          file.code
        );

        break;


      case 'html':

        renderPreview();

        printToTerminal(
          'info',
          ['HTML atualizado no Preview.']
        );

        break;


      case 'python':

        await executePython(
          file.code
        );

        break;


      case 'cpp':

        executeCpp(
          file.code
        );

        break;


      case 'lua':

        await executeLua(
          file.code
        );

        break;


      case 'json':

        JSON.parse(
          file.code
        );

        printToTerminal(
          'return',
          ['JSON válido.']
        );

        break;


      case 'markdown':

        renderPreview();

        printToTerminal(
          'return',
          ['Markdown renderizado.']
        );

        break;


      default:

        printToTerminal(
          'warn',
          [
            `Execução não disponível para ${file.lang}.`
          ]
        );
    }

  } catch (error) {

    printToTerminal(
      'error',
      [
        error.message
      ]
    );
  }

  const elapsed =
    Math.round(
      performance.now() - start
    );

  statusExecution.textContent =
    `Tempo: ${elapsed}ms`;
}


/* ============================================================
   JAVASCRIPT ENGINE
   ============================================================ */

async function executeJavaScript(
  code
) {

  const start =
    performance.now();

  try {

    const result =
      Function(
        `"use strict";\n${code}`
      )();

    if (
      result !== undefined
    ) {

      printToTerminal(
        'return',
        [result]
      );
    }

    printToTerminal(
      'info',
      [
        `JS concluído em ${Math.round(
          performance.now() - start
        )}ms`
      ]
    );

    renderPreview();

  } catch (error) {

    throw error;
  }
}


/* ============================================================
   PYTHON / PYODIDE
   ============================================================ */

async function loadPyodideEngine() {

  if (pyodide)
    return pyodide;

  if (pyodideLoading) {

    while (
      pyodideLoading
    ) {

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            100
          )
      );
    }

    return pyodide;
  }

  pyodideLoading = true;

  printToTerminal(
    'info',
    [
      'Carregando Python WASM...'
    ]
  );

  try {

    if (
      typeof loadPyodide !==
      'function'
    ) {

      throw new Error(
        'Pyodide não foi carregado.'
      );
    }

    pyodide =
      await loadPyodide();

    printToTerminal(
      'info',
      [
        'Python WASM pronto.'
      ]
    );

    return pyodide;

  } finally {

    pyodideLoading =
      false;
  }
}


async function executePython(
  code
) {

  const engine =
    await loadPyodideEngine();

  let output = '';

  engine.setStdout({
    batched:
      text => {
        output += text;
      }
  });

  engine.setStderr({
    batched:
      text => {
        output += text;
      }
  });

  try {

    await engine.runPythonAsync(
      code
    );

    if (output.trim()) {

      output
        .trimEnd()
        .split('\n')
        .forEach(
          line =>
            printToTerminal(
              'return',
              [line]
            )
        );
    }

  } catch (error) {

    throw error;
  }
}


/* ============================================================
   C / C++ JSCPP
   ============================================================ */

function executeCpp(code) {

  if (
    typeof JSCPP ===
    'undefined'
  ) {

    throw new Error(
      'JSCPP não foi carregado.'
    );
  }

  let output = '';

  try {

    const config = {
      stdio: {
        write:
          text => {
            output += text;
          }
      }
    };

    JSCPP.run(
      code,
      '',
      config
    );

    if (!output) {

      output =
        'Programa finalizado sem saída.';
    }

    output
      .split('\n')
      .filter(
        line => line.length
      )
      .forEach(
        line =>
          printToTerminal(
            'return',
            [line]
          )
      );

  } catch (error) {

    throw new Error(
      `C/C++: ${error.message || error}`
    );
  }
}


/* ============================================================
   LUA
   ============================================================ */

async function executeLua(code) {

  if (
    typeof fengari ===
    'undefined'
  ) {

    throw new Error(
      'Fengari/Lua não foi carregado.'
    );
  }

  printToTerminal(
    'warn',
    [
      'Lua detectado. Runtime Fengari disponível.'
    ]
  );

  try {

    const lua =
      fengari.load(
        code,
        'neural_os.lua'
      );

    lua();

    printToTerminal(
      'return',
      [
        'Lua executado.'
      ]
    );

  } catch (error) {

    throw error;
  }
}


/* ============================================================
   TERMINAL
   ============================================================ */

function printToTerminal(
  type,
  args
) {

  const line =
    document.createElement('div');

  line.className =
    `log-line log-${type}`;

  const prefix =
    document.createElement('span');

  prefix.className =
    'log-prefix';

  prefix.textContent =
    type === 'return'
      ? '<'
      : type === 'error'
        ? '!'
        : '>';

  const content =
    document.createElement('span');

  content.textContent =
    args
      .map(
        value => {

          if (
            typeof value ===
            'object'
          ) {

            try {

              return JSON.stringify(
                value,
                null,
                2
              );

            } catch {

              return String(value);
            }
          }

          return String(value);
        }
      )
      .join(' ');

  line.appendChild(
    prefix
  );

  line.appendChild(
    content
  );

  logContent.appendChild(
    line
  );

  trimConsole();

  consoleOutput.scrollTop =
    consoleOutput.scrollHeight;
}


function trimConsole() {

  const lines =
    logContent.children;

  while (
    lines.length >
    CONFIG.maxConsoleLines
  ) {

    logContent.removeChild(
      lines[0]
    );
  }
}


/* ============================================================
   REPL
   ============================================================ */

function executeREPL() {

  const input =
    replInput.value.trim();

  if (!input)
    return;

  printToTerminal(
    'info',
    [
      `REPL > ${input}`
    ]
  );

  try {

    const result =
      Function(
        `"use strict"; return (${input})`
      )();

    printToTerminal(
      'return',
      [result]
    );

  } catch (error) {

    printToTerminal(
      'error',
      [
        error.message
      ]
    );
  }

  replInput.value = '';
}


btnSendRepl.addEventListener(
  'click',
  executeREPL
);


replInput.addEventListener(
  'keydown',
  event => {

    if (
      event.key === 'Enter'
    ) {

      event.preventDefault();

      executeREPL();
    }
  }
);


/* ============================================================
   BUSCA NO PROJETO
   ============================================================ */

function searchWorkspace() {

  const query =
    searchInput.value.trim();

  searchResults.innerHTML = '';

  if (!query) return;

  const lower =
    query.toLowerCase();

  let total = 0;

  files.forEach(file => {

    const lines =
      file.code.split('\n');

    lines.forEach(
      (line, index) => {

        if (
          line
            .toLowerCase()
            .includes(lower)
        ) {

          total++;

          const result =
            document.createElement(
              'div'
            );

          result.className =
            'file-item';

          result.innerHTML = `
            <strong>
              ${escapeHTML(file.name)}
            </strong>

            <br>

            <span style="
              color:#66ff8c;
            ">
              Linha ${index + 1}
            </span>

            <br>

            <span style="
              opacity:.7;
            ">
              ${escapeHTML(
                line.trim()
              )}
            </span>
          `;

          result.addEventListener(
            'click',
            () => {

              switchFile(
                file.id
              );

              goToLine(
                index + 1
              );
            }
          );

          searchResults.appendChild(
            result
          );
        }
      }
    );
  });

  if (!total) {

    searchResults.innerHTML =
      '<div style="padding:8px">Nenhum resultado.</div>';

  } else {

    const header =
      document.createElement(
        'div'
      );

    header.style.padding =
      '5px';

    header.textContent =
      `${total} resultado(s)`;

    searchResults.prepend(
      header
    );
  }
}


function goToLine(lineNumber) {

  const lines =
    codeEditor.value.split('\n');

  let position = 0;

  for (
    let i = 0;
    i < lineNumber - 1;
    i++
  ) {

    position +=
      lines[i].length + 1;
  }

  codeEditor.focus();

  codeEditor.selectionStart =
    position;

  codeEditor.selectionEnd =
    position;

  const lineHeight =
    parseFloat(
      getComputedStyle(
        codeEditor
      ).lineHeight
    );

  codeEditor.scrollTop =
    Math.max(
      0,
      (lineNumber - 3) *
      lineHeight
    );

  updateStatus();
}


searchInput.addEventListener(
  'input',
  searchWorkspace
);


/* ============================================================
   SNIPPETS
   ============================================================ */

const snippets = {

  fetch: `async function carregarDados() {

  try {

    const response =
      await fetch("https://api.exemplo.com/dados");

    const data =
      await response.json();

    console.log(data);

  } catch(error) {

    console.error(error);
  }
}`,

  class: `class NeuralSystem {

  constructor(nome) {

    this.nome = nome;
  }

  iniciar() {

    console.log(
      this.nome + " iniciado."
    );
  }
}`,

  async: `async function executar() {

  try {

    const resultado =
      await Promise.resolve(
        "NEURAL OS"
      );

    console.log(resultado);

  } catch(error) {

    console.error(error);
  }
}`
};


document
  .querySelectorAll(
    '[data-snippet]'
  )
  .forEach(
    element => {

      element.addEventListener(
        'click',
        () => {

          const name =
            element.dataset.snippet;

          insertSnippet(
            snippets[name]
          );
        }
      );
    }
  );


function insertSnippet(code) {

  const start =
    codeEditor.selectionStart;

  const end =
    codeEditor.selectionEnd;

  codeEditor.value =
    codeEditor.value.substring(
      0,
      start
    ) +
    code +
    codeEditor.value.substring(
      end
    );

  codeEditor.selectionStart =
    start + code.length;

  codeEditor.selectionEnd =
    codeEditor.selectionStart;

  markFileModified();

  updateEditor();

  updateLivePreview();

  codeEditor.focus();
}


/* ============================================================
   IMPORTAÇÃO ENTRE ARQUIVOS
   ============================================================ */

document
  .getElementById(
    'btnConnectTab'
  )
  .addEventListener(
    'click',
    () => {

      const targetId =
        Number(
          connectTabSelect.value
        );

      if (!targetId)
        return;

      const target =
        files.find(
          file =>
            file.id === targetId
        );

      if (!target)
        return;

      const current =
        getActiveFile();

      if (!current)
        return;

      let importCode = '';

      if (
        current.lang ===
        'javascript'
      ) {

        importCode =
          `// Importação lógica de ${target.name}\n` +
          `const ${sanitizeVariableName(
            target.name
          )} = {\n` +
          `  name: "${target.name}",\n` +
          `  code: ${JSON.stringify(
            target.code
          )}\n` +
          `};\n\n`;

      } else {

        importCode =
          `// Arquivo conectado: ${target.name}\n\n`;
      }

      const position =
        codeEditor.selectionStart;

      codeEditor.value =
        codeEditor.value.substring(
          0,
          position
        ) +
        importCode +
        codeEditor.value.substring(
          position
        );

      codeEditor.selectionStart =
        position +
        importCode.length;

      codeEditor.selectionEnd =
        codeEditor.selectionStart;

      markFileModified();

      updateEditor();

      updateLivePreview();

      printToTerminal(
        'info',
        [
          `Arquivo conectado: ${target.name}`
        ]
      );
    }
  );


function sanitizeVariableName(name) {

  let result =
    name
      .replace(
        /\.[^/.]+$/,
        ''
      )
      .replace(
        /[^a-zA-Z0-9_$]/g,
        '_'
      );

  if (
    /^[0-9]/.test(result)
  ) {

    result =
      '_' + result;
  }

  return result || 'arquivo';
}


/* ============================================================
   NOVO ARQUIVO
   ============================================================ */

document
  .getElementById(
    'btnSidebarNewFile'
  )
  .addEventListener(
    'click',
    () => createNewFile()
  );


document
  .getElementById(
    'menuNewFile'
  )
  .addEventListener(
    'click',
    () => createNewFile()
  );


/* ============================================================
   SALVAR
   ============================================================ */

document
  .getElementById(
    'menuSaveFile'
  )
  .addEventListener(
    'click',
    saveCurrentFile
  );


/* ============================================================
   LIMPAR CONSOLE
   ============================================================ */

document
  .getElementById(
    'menuClear'
  )
  .addEventListener(
    'click',
    () => {

      logContent.innerHTML = '';

      printToTerminal(
        'info',
        [
          'Console limpo.'
        ]
      );
    }
  );


/* ============================================================
   ABRIR ARQUIVO
   ============================================================ */

document
  .getElementById(
    'menuOpenFile'
  )
  .addEventListener(
    'click',
    () => {

      fileInput.click();
    }
  );


fileInput.addEventListener(
  'change',
  async event => {

    const selectedFiles =
      Array.from(
        event.target.files
      );

    for (
      const importedFile
      of selectedFiles
    ) {

      try {

        const code =
          await importedFile.text();

        let name =
          importedFile.name;

        if (
          files.some(
            file =>
              file.name === name
          )
        ) {

          name =
            `${Date.now()}_${name}`;
        }

        const lang =
          getLanguageFromName(
            name
          );

        const file = {

          id: generateId(),

          name,

          lang,

          code,

          dirty: false
        };

        files.push(file);

        activeFileId =
          file.id;

      } catch (error) {

        printToTerminal(
          'error',
          [
            `Erro ao abrir ${importedFile.name}:`,
            error.message
          ]
        );
      }
    }

    switchFile(
      activeFileId
    );

    saveWorkspace();

    fileInput.value = '';
  }
);


/* ============================================================
   EXPORTAR WORKSPACE
   ============================================================ */

function exportWorkspace() {

  saveCurrentStateOnly();

  const data = {

    neuralOS:
      CONFIG.version,

    exportedAt:
      new Date().toISOString(),

    files:
      files.map(
        file => ({
          name: file.name,
          language: file.lang,
          code: file.code
        })
      )
  };

  const blob =
    new Blob(
      [
        JSON.stringify(
          data,
          null,
          2
        )
      ],
      {
        type:
          'application/json'
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const a =
    document.createElement('a');

  a.href = url;

  a.download =
    'neural-os-project.json';

  a.click();

  URL.revokeObjectURL(
    url
  );

  printToTerminal(
    'info',
    [
      'Workspace exportado.'
    ]
  );
}


/* ============================================================
   EXPORTAR HTML DO PREVIEW
   ============================================================ */

function exportPreview() {

  const html =
    livePreviewFrame.srcdoc;

  if (!html) {

    printToTerminal(
      'warn',
      [
        'Não existe Preview para exportar.'
      ]
    );

    return;
  }

  const blob =
    new Blob(
      [html],
      {
        type:
          'text/html'
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const a =
    document.createElement('a');

  a.href = url;

  a.download =
    'neural-preview.html';

  a.click();

  URL.revokeObjectURL(
    url
  );

  printToTerminal(
    'info',
    [
      'Preview exportado como HTML.'
    ]
  );
}


/* ============================================================
   COMMAND PALETTE
   ============================================================ */

function openCommandPalette() {

  const commands = [

    'Novo arquivo',
    'Salvar arquivo',
    'Executar',
    'Exportar Workspace',
    'Exportar Preview',
    'Limpar Console',
    'Aumentar fonte',
    'Diminuir fonte',
    'Resetar fonte'
  ];

  const choice =
    prompt(
      'NEURAL OS COMMAND PALETTE\n\n' +
      commands
        .map(
          (command, index) =>
            `${index + 1}. ${command}`
        )
        .join('\n') +
      '\n\nDigite o número:'
    );

  const index =
    Number(choice) - 1;

  switch (index) {

    case 0:
      createNewFile();
      break;

    case 1:
      saveCurrentFile();
      break;

    case 2:
      executeCurrentFile();
      break;

    case 3:
      exportWorkspace();
      break;

    case 4:
      exportPreview();
      break;

    case 5:
      logContent.innerHTML = '';
      break;

    case 6:
      changeFontSize(1);
      break;

    case 7:
      changeFontSize(-1);
      break;

    case 8:
      setFontSize(14);
      break;
  }
}


/* ============================================================
   TAMANHO DA FONTE
   ============================================================ */

function setFontSize(size) {

  editorFontSize =
    Math.min(
      30,
      Math.max(
        8,
        size
      )
    );

  codeEditor.style.fontSize =
    `${editorFontSize}px`;

  highlightArea.style.fontSize =
    `${editorFontSize}px`;

  lineNumbers.style.fontSize =
    `${editorFontSize}px`;

  saveWorkspace();
}


function changeFontSize(amount) {

  setFontSize(
    editorFontSize + amount
  );
}


/* ============================================================
   ATALHOS GLOBAIS
   ============================================================ */

document.addEventListener(
  'keydown',
  event => {

    /* CTRL + S */

    if (
      event.ctrlKey &&
      event.key.toLowerCase() === 's'
    ) {

      event.preventDefault();

      saveCurrentFile();

      return;
    }


    /* CTRL + P */

    if (
      event.ctrlKey &&
      event.key.toLowerCase() === 'p'
    ) {

      event.preventDefault();

      openCommandPalette();

      return;
    }


    /* CTRL + F */

    if (
      event.ctrlKey &&
      event.key.toLowerCase() === 'f'
    ) {

      event.preventDefault();

      searchInput.focus();

      return;
    }


    /* CTRL + + */

    if (
      event.ctrlKey &&
      (
        event.key === '+' ||
        event.key === '='
      )
    ) {

      event.preventDefault();

      changeFontSize(1);

      return;
    }


    /* CTRL + - */

    if (
      event.ctrlKey &&
      event.key === '-'
    ) {

      event.preventDefault();

      changeFontSize(-1);

      return;
    }
  }
);


/* ============================================================
   MUDANÇA DE LINGUAGEM
   ============================================================ */

langSelect.addEventListener(
  'change',
  () => {

    const file =
      getActiveFile();

    if (!file)
      return;

    file.lang =
      langSelect.value;

    file.dirty =
      true;

    updateEditor();

    updateLivePreview();

    renderExplorer();

    renderTabs();

    scheduleSave();
  }
);


/* ============================================================
   MUDANÇA DE NOME
   ============================================================ */

tabNameInput.addEventListener(
  'change',
  () => {

    const file =
      getActiveFile();

    if (!file)
      return;

    const newName =
      tabNameInput.value.trim();

    if (!newName)
      return;

    renameFile(
      file.id,
      newName
    );
  }
);


/* ============================================================
   ACTIVITY BAR
   ============================================================ */

document
  .querySelectorAll(
    '.activity-icon'
  )
  .forEach(
    icon => {

      icon.addEventListener(
        'click',
        () => {

          document
            .querySelectorAll(
              '.activity-icon'
            )
            .forEach(
              item =>
                item.classList.remove(
                  'active'
                )
            );

          document
            .querySelectorAll(
              '.sidebar-pane'
            )
            .forEach(
              pane =>
                pane.classList.remove(
                  'active'
                )
            );

          icon.classList.add(
            'active'
          );

          const pane =
            document.getElementById(
              `pane-${icon.dataset.pane}`
            );

          if (pane) {

            pane.classList.add(
              'active'
            );
          }
        }
      );
    }
  );


/* ============================================================
   LOG INICIAL
   ============================================================ */

function startupLog() {

  printToTerminal(
    'info',
    [
      `NEURAL OS // MATRIX CODE STUDIO v${CONFIG.version}`
    ]
  );

  printToTerminal(
    'info',
    [
      'Kernel: ONLINE'
    ]
  );

  printToTerminal(
    'info',
    [
      'Editor: ONLINE'
    ]
  );

  printToTerminal(
    'info',
    [
      'Live Preview: ONLINE'
    ]
  );

  printToTerminal(
    'info',
    [
      'Local Storage: READY'
    ]
  );

  printToTerminal(
    'info',
    [
      'Digite uma expressão no REPL.'
    ]
  );
}


/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

function initialize() {

  loadWorkspace();

  setFontSize(
    editorFontSize
  );

  renderExplorer();

  renderTabs();

  if (
    activeFileId === null &&
    files.length
  ) {

    activeFileId =
      files[0].id;
  }

  switchFile(
    activeFileId
  );

  startupLog();
}


initialize();


/* ============================================================
   SEGURANÇA CONTRA FECHAMENTO ACIDENTAL
   ============================================================ */

window.addEventListener(
  'beforeunload',
  event => {

    saveCurrentStateOnly();

    saveWorkspace();

    if (isDirty) {

      event.preventDefault();

      event.returnValue = '';
    }
  }
);


/* ============================================================
   DEBUG GLOBAL
   ============================================================ */

window.NEURAL_OS = {

  version:
    CONFIG.version,

  getFiles:
    () => files,

  getActiveFile:
    () => getActiveFile(),

  save:
    saveWorkspace,

  execute:
    executeCurrentFile,

  exportProject:
    exportWorkspace,

  exportPreview:
    exportPreview,

  newFile:
    createNewFile
};


/* ============================================================
   FIM DO KERNEL
   ============================================================ */

console.log(
  `%cNEURAL OS v${CONFIG.version} ONLINE`,
  'color:#00ff41;font-weight:bold;'
);

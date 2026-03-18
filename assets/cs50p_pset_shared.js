(function () {
  const config = window.CS50P_PAGE_CONFIG;
  if (!config) return;

  const tabs = document.getElementById('problemTabs');
  const panels = document.getElementById('problemPanels');
  const codeEl = document.getElementById('pyCode');
  if (!tabs || !panels || !codeEl) return;

  let editorHost = document.getElementById('pyEditor');
  if (!editorHost) {
    editorHost = document.createElement('div');
    editorHost.id = 'pyEditor';
    editorHost.className = 'editor-host';
    codeEl.parentNode.insertBefore(editorHost, codeEl);
  }

  let editorNote = document.getElementById('editorNote');
  if (!editorNote) {
    editorNote = document.createElement('div');
    editorNote.id = 'editorNote';
    editorNote.className = 'editor-note';
    editorNote.textContent = 'Editor mode: basic editor (trying to load color highlighting…)';
    codeEl.parentNode.insertBefore(editorNote, codeEl.nextSibling);
  }

  const outputEl = document.getElementById('pyOut');
  const statusEl = document.getElementById('pyStatus');
  const loadedInfoEl = document.getElementById('loadedInfo');
  const runBtn = document.getElementById('runPy');
  const clearBtn = document.getElementById('clearOut');

  const DEFAULT_EDITOR_TEXT = `print("${config.psetLabel} practice runner")\n\n# Load starter code, worked example, or note example from a problem tab.`;

  let pyodide = null;
  let pyEditor = null;
  let pyodideIndexURL = null;
  const attemptedScripts = new Set();
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const PYODIDE_CANDIDATES = [
    { scriptURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js', indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/' },
    { scriptURL: 'https://cdn.jsdelivr.net/npm/pyodide@0.24.1/pyodide.js', indexURL: 'https://cdn.jsdelivr.net/npm/pyodide@0.24.1/' },
    { scriptURL: 'https://unpkg.com/pyodide@0.24.1/pyodide.js', indexURL: 'https://unpkg.com/pyodide@0.24.1/' }
  ];

  function setStatus(text, ready = false) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.toggle('ready', ready);
  }

  function setLoadedInfo(text) {
    if (!loadedInfoEl) return;
    loadedInfoEl.textContent = text || 'Loaded code info: none yet.';
  }

  function appendOut(text) {
    if (!outputEl) return;
    outputEl.textContent += text;
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  function safeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

  function adjustEditorHeight() {
    const minHeight = 320;
    const maxHeight = 780;

    if (pyEditor && typeof monaco !== 'undefined') {
      const model = pyEditor.getModel();
      const lineCount = model ? model.getLineCount() : 1;
      const lineHeight = pyEditor.getOption(monaco.editor.EditorOption.lineHeight) || 20;
      const contentHeight = Math.ceil(lineCount * lineHeight + 44);
      const nextHeight = Math.max(minHeight, Math.min(maxHeight, contentHeight));
      editorHost.style.height = `${nextHeight}px`;
      pyEditor.layout();
      return;
    }

    codeEl.style.height = 'auto';
    const nextHeight = Math.max(minHeight, Math.min(maxHeight, codeEl.scrollHeight + 6));
    codeEl.style.height = `${nextHeight}px`;
  }

  function getEditorCode() {
    if (pyEditor) return pyEditor.getValue();
    return codeEl.value;
  }

  function setCode(code) {
    const next = code || '';
    codeEl.value = next;
    if (pyEditor) pyEditor.setValue(next);
    adjustEditorHeight();
  }

  function problemStarter(problem) {
    if (problem.starter) return problem.starter;
    return `# Starter for ${problem.title}\n# TODO: Read the official spec first\n\n\ndef main():\n    # TODO: implement ${problem.title}\n    pass\n\n\nif __name__ == "__main__":\n    main()`;
  }

  function problemWorked(problem) {
    if (problem.worked) return problem.worked;
    return `# Worked practice pattern for ${problem.title}\n# Similar practice only, not the exact CS50 solution.\n\ntext = input("Input: ").strip()\nprint("You entered:", text)`;
  }

  function problemLecturePattern(problem) {
    if (problem.lecturePattern) return problem.lecturePattern;
    return `for _ in range(3):\n    print("practice")`;
  }

  function problemNoteExample(problem) {
    if (problem.noteExample) return problem.noteExample;
    return `for _ in range(3):\n    print("meow")`;
  }

  async function loadExternalScript(url) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load: ${url}`));
      document.head.appendChild(script);
    });
  }

  async function initializeMonacoEditor() {
    try {
      if (!window.require) {
        await loadExternalScript('https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/loader.js');
      }
      if (!window.require) throw new Error('Monaco loader unavailable');

      const monacoBase = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/';
      window.MonacoEnvironment = {
        getWorkerUrl: function () {
          return `data:text/javascript;charset=utf-8,${encodeURIComponent(
            `self.MonacoEnvironment={baseUrl:'${monacoBase}'};importScripts('${monacoBase}vs/base/worker/workerMain.js');`
          )}`;
        }
      };

      await new Promise((resolve, reject) => {
        window.require.config({ paths: { vs: monacoBase + 'vs' } });
        window.require(['vs/editor/editor.main'], resolve, reject);
      });

      pyEditor = monaco.editor.create(editorHost, {
        value: codeEl.value,
        language: 'python',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        tabSize: 4,
        insertSpaces: true,
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        wrappingIndent: 'same',
        ariaLabel: 'Python code editor',
      });

      pyEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        runCode();
      });

      pyEditor.onDidChangeModelContent(() => {
        adjustEditorHeight();
      });

      editorHost.style.display = 'block';
      codeEl.style.display = 'none';
      editorNote.textContent = 'Editor mode: color highlighting is on.';
      adjustEditorHeight();
    } catch (_) {
      pyEditor = null;
      editorHost.style.display = 'none';
      codeEl.style.display = 'block';
      editorNote.textContent = 'Editor mode: basic editor (color highlighting may be blocked on this network).';
      adjustEditorHeight();
    }
  }

  function renderProblems() {
    tabs.innerHTML = '';
    panels.innerHTML = '';

    config.problems.forEach((problem, index) => {
      const key = `p${index}`;
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = `problem-tab${index === 0 ? ' active' : ''}`;
      tab.setAttribute('role', 'tab');
      tab.id = `tab-${key}`;
      tab.setAttribute('aria-controls', `panel-${key}`);
      tab.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
      tab.setAttribute('tabindex', index === 0 ? '0' : '-1');
      tab.dataset.index = String(index);
      tab.textContent = `${index + 1}. ${problem.title}`;
      tabs.appendChild(tab);

      const panel = document.createElement('article');
      panel.className = `problem-panel${index === 0 ? '' : ' hidden'}`;
      panel.id = `panel-${key}`;
      panel.dataset.index = String(index);
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', `tab-${key}`);
      if (index !== 0) panel.hidden = true;

      panel.innerHTML = `
        <h3 style="margin:0 0 8px">${safeHtml(problem.title)}</h3>
        <p><strong>Focus skill:</strong> ${safeHtml(problem.skill || 'Use loops, conditions, and string/list/dict tools from this week.')}</p>
        <div class="hint">
          <strong>Lecture pattern</strong>
          <pre><code>${safeHtml(problemLecturePattern(problem))}</code></pre>
          <p><strong>Example from the notes</strong></p>
          <pre><code>${safeHtml(problemNoteExample(problem))}</code></pre>
          <div class="row" style="margin-top:8px">
            <button type="button" class="ghost mini-load load-note" data-index="${index}">Load note example</button>
          </div>
        </div>
        <p class="subtle" style="margin:0 0 8px">Use the official prompt first, then use starter/worked code here for guided practice.</p>
        <p><a href="${problem.url}" target="_blank" rel="noopener noreferrer">Open official CS50 problem</a></p>
        <div class="row" style="margin-top:8px">
          <button type="button" class="load-starter" data-index="${index}">Load starter code</button>
          <button type="button" class="ghost load-worked" data-index="${index}">Load worked example</button>
        </div>
      `;
      panels.appendChild(panel);
    });

    tabs.querySelectorAll('.problem-tab').forEach((tab, index) => {
      tab.addEventListener('click', () => activateTab(index, true));
      tab.addEventListener('keydown', (event) => {
        const total = config.problems.length;
        if (event.key === 'ArrowRight') { event.preventDefault(); activateTab((index + 1) % total, true, true); }
        if (event.key === 'ArrowLeft') { event.preventDefault(); activateTab((index - 1 + total) % total, true, true); }
        if (event.key === 'Home') { event.preventDefault(); activateTab(0, true, true); }
        if (event.key === 'End') { event.preventDefault(); activateTab(total - 1, true, true); }
      });
    });

    panels.querySelectorAll('.load-starter').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.index);
        const problem = config.problems[idx];
        setCode(problemStarter(problem));
        setLoadedInfo(`Loaded starter code for ${problem.title}.`);
        scrollToRunner();
      });
    });

    panels.querySelectorAll('.load-worked').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.index);
        const problem = config.problems[idx];
        setCode(problemWorked(problem));
        setLoadedInfo(`Loaded worked example for ${problem.title}.`);
        scrollToRunner();
      });
    });

    panels.querySelectorAll('.load-note').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.index);
        const problem = config.problems[idx];
        setCode(problemNoteExample(problem));
        setLoadedInfo(`Loaded note example for ${problem.title}.`);
        scrollToRunner();
      });
    });
  }

  function activateTab(index, clearEditor = false, focusTab = false) {
    const tabList = Array.from(tabs.querySelectorAll('.problem-tab'));
    const panelList = Array.from(panels.querySelectorAll('.problem-panel'));

    tabList.forEach((tab, i) => {
      const active = i === index;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.setAttribute('tabindex', active ? '0' : '-1');
      if (active && focusTab) tab.focus();
    });

    panelList.forEach((panel, i) => {
      const active = i === index;
      panel.classList.toggle('hidden', !active);
      panel.hidden = !active;
    });

    if (clearEditor) {
      setCode(DEFAULT_EDITOR_TEXT);
      if (outputEl) outputEl.textContent = '';
      setLoadedInfo('Loaded code info: none yet.');
    }
  }

  function scrollToRunner() {
    const runner = document.getElementById('runner');
    if (!runner) return;
    runner.scrollIntoView({
      behavior: prefersReducedMotion.matches ? 'auto' : 'smooth',
      block: 'start'
    });
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function waitForGlobalLoader(timeoutMs = 2500) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (typeof loadPyodide === 'function') return true;
      await delay(50);
    }
    return false;
  }

  async function loadScriptOnce(url) {
    if (attemptedScripts.has(url)) return typeof loadPyodide === 'function';
    attemptedScripts.add(url);

    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load: ${url}`));
      document.head.appendChild(script);
    });

    return waitForGlobalLoader(3000);
  }

  async function preparePyodideLoader() {
    if (typeof loadPyodide === 'function') {
      pyodideIndexURL = pyodideIndexURL || PYODIDE_CANDIDATES[0].indexURL;
      return;
    }

    for (const candidate of PYODIDE_CANDIDATES) {
      try {
        const ready = await loadScriptOnce(candidate.scriptURL);
        if (ready) {
          pyodideIndexURL = candidate.indexURL;
          return;
        }
      } catch (_) {}
    }

    throw new Error('Unable to load Pyodide. Check internet access or content filtering for jsdelivr/unpkg.');
  }

  async function ensurePyodide() {
    if (pyodide) return pyodide;

    await preparePyodideLoader();
    if (typeof loadPyodide !== 'function' || !pyodideIndexURL) throw new Error('Python runtime unavailable.');

    setStatus('Downloading Python…');
    pyodide = await loadPyodide({
      indexURL: pyodideIndexURL,
      stdout: (t) => appendOut(t + '\n'),
      stderr: (t) => appendOut(t + '\n'),
    });

    if (pyodide.setStdin) {
      pyodide.setStdin({
        stdin: () => {
          const entered = window.prompt('Python input() — enter a line:') ?? '';
          appendOut(`[Input entered] ${entered}\n`);
          return entered + '\n';
        }
      });
    }

    setStatus('Ready', true);
    return pyodide;
  }

  async function runCode() {
    if (outputEl) outputEl.textContent = '';
    if (runBtn) runBtn.disabled = true;
    try {
      const py = await ensurePyodide();
      await py.runPythonAsync(getEditorCode());
    } catch (error) {
      appendOut(String(error) + '\n');
    } finally {
      if (runBtn) runBtn.disabled = false;
    }
  }

  if (runBtn) runBtn.addEventListener('click', runCode);
  if (clearBtn) clearBtn.addEventListener('click', () => { if (outputEl) outputEl.textContent = ''; });

  codeEl.addEventListener('input', adjustEditorHeight);
  codeEl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      runCode();
    }
  });

  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle) pageTitle.textContent = `${config.psetLabel} Student Support`;

  const pageLead = document.getElementById('pageLead');
  if (pageLead) pageLead.textContent = config.lead;

  const psetChip = document.getElementById('psetChip');
  if (psetChip) psetChip.textContent = config.psetLabel;

  const officialPsetLink = document.getElementById('officialPsetLink');
  if (officialPsetLink) {
    officialPsetLink.href = config.officialPsetUrl;
    officialPsetLink.textContent = `${config.psetLabel} Official Page`;
  }

  renderProblems();
  setCode(DEFAULT_EDITOR_TEXT);
  setLoadedInfo('Loaded code info: none yet.');
  adjustEditorHeight();
  initializeMonacoEditor();

  ensurePyodide().catch(() => {
    setStatus('Python not ready (click Run to retry)', false);
  });
})();

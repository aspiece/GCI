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

  const PROBLEM_ALIGNMENT = {
    // PSET 0
    'Indoor Voice': {
      skill: 'String methods and direct output formatting.',
      lecturePattern: 'text = input("Input: ")\nprint(text.lower())',
      noteExample: 'name = input("What\'s your name? ")\nprint(f"hello, {name}")'
    },
    'Playback Speed': {
      skill: 'String replacement and transformation.',
      lecturePattern: 'text = input("Input: ")\nprint(text.replace(" ", "..."))',
      noteExample: 'word = "cat"\nprint(word * 3)'
    },
    'Making Faces': {
      skill: 'Writing and calling small helper functions.',
      lecturePattern: 'def convert(text):\n    return text.replace(":)", "🙂").replace(":(", "🙁")\n\nprint(convert(input("Input: ")))',
      noteExample: 'def main():\n    name = input("What\'s your name? ")\n    hello(name)\n\ndef hello(to):\n    print("hello,", to)\n\nmain()'
    },
    'Einstein': {
      skill: 'Variables, arithmetic, and constants.',
      lecturePattern: 'c = 300000000\nm = int(input("m: "))\nprint(m * c ** 2)',
      noteExample: 'x = int(input("x: "))\nprint(x * 2)'
    },
    'Tip Calculator': {
      skill: 'Parsing input and computing formulas.',
      lecturePattern: 'dollars = float(input("How much was the meal? ").replace("$", ""))\npercent = float(input("Tip percentage? ").replace("%", ""))\nprint(dollars * (percent / 100))',
      noteExample: 'x = float(input("x: "))\ny = float(input("y: "))\nprint(x + y)'
    },

    // PSET 1
    'Deep Thought': {
      skill: 'if/else condition checks with normalized text.',
      lecturePattern: 'answer = input("What is the Answer to the Great Question of Life, the Universe, and Everything? ").strip().lower()\nif answer == "42" or answer == "forty-two" or answer == "forty two":\n    print("Yes")\nelse:\n    print("No")',
      noteExample: 'x = int(input("x: "))\nif x < y:\n    print("x is less than y")\nelif x > y:\n    print("x is greater than y")\nelse:\n    print("x is equal to y")'
    },
    'Home Federal Savings Bank': {
      skill: 'Startswith checks and branch logic.',
      lecturePattern: 'greeting = input("Greeting: ").strip().lower()\nif greeting.startswith("hello"):\n    print("$0")\nelif greeting.startswith("h"):\n    print("$20")\nelse:\n    print("$100")',
      noteExample: 'name = input("Name: ").strip()\nif name == "Harry":\n    print("Gryffindor")\nelse:\n    print("Who?")'
    },
    'File Extensions': {
      skill: 'String split and mapping outcomes.',
      lecturePattern: 'name = input("File name: ").strip().lower()\nif name.endswith(".gif"):\n    print("image/gif")\nelif name.endswith(".jpg") or name.endswith(".jpeg"):\n    print("image/jpeg")\nelse:\n    print("application/octet-stream")',
      noteExample: 'filename = "photo.jpg"\nprint(filename.lower())'
    },
    'Math Interpreter': {
      skill: 'Split input into tokens and compute by operator.',
      lecturePattern: 'expr = input("Expression: ")\nx, op, y = expr.split(" ")\nx = float(x)\ny = float(y)\nif op == "+":\n    print(x + y)\nelif op == "-":\n    print(x - y)',
      noteExample: 'x = int(input("x: "))\ny = int(input("y: "))\nprint(x + y)'
    },
    'Meal Time': {
      skill: 'Function decomposition and range checks.',
      lecturePattern: 'def convert(time):\n    h, m = time.split(":")\n    return int(h) + int(m) / 60\n\nt = convert(input("What time is it? "))\nif 7 <= t <= 8:\n    print("breakfast time")',
      noteExample: 'def main():\n    value = get_number()\n    print(value)\n\ndef get_number():\n    return int(input("Number: "))\n\nmain()'
    },

    // PSET 3
    'Fuel Gauge': {
      skill: 'Loop validation and conditional output bands.',
      lecturePattern: 'while True:\n    frac = input("Fraction: ")\n    if "/" in frac:\n        x, y = frac.split("/")\n        if int(y) != 0:\n            pct = round(int(x) / int(y) * 100)\n            if 0 <= pct <= 100:\n                break',
      noteExample: 'while True:\n    n = int(input("What\'s n? "))\n    if n > 0:\n        break\n\nfor _ in range(n):\n    print("meow")'
    },
    'Felipe’s Taqueria': {
      skill: 'Dictionary lookups inside a loop.',
      lecturePattern: 'menu = {"baja taco": 4.25, "burrito": 7.50}\ntotal = 0\nwhile True:\n    item = input("Item: ").lower()\n    if item in menu:\n        total += menu[item]\n        print(f"Total: ${total:.2f}")',
      noteExample: 'students = {"Hermione": "Gryffindor", "Harry": "Gryffindor"}\nfor student in students:\n    print(student, students[student], sep=", ")'
    },
    'Grocery List': {
      skill: 'Count items with a dictionary and print sorted output.',
      lecturePattern: 'counts = {}\nwhile True:\n    item = input().upper()\n    counts[item] = counts.get(item, 0) + 1',
      noteExample: 'students = ["Hermione", "Harry", "Ron"]\nfor student in students:\n    print(student)'
    },
    'Outdated': {
      skill: 'Loop until valid format, then normalize.',
      lecturePattern: 'while True:\n    date = input("Date: ").strip()\nif "/" in date:\n    month, day, year = date.split("/")\n    print(f"{int(year):04}-{int(month):02}-{int(day):02}")',
      noteExample: 'months = ["January", "February", "March"]\nfor i in range(len(months)):\n    print(i + 1, months[i])'
    },

    // PSET 4
    'Emojize': {
      skill: 'Library usage and transformed output.',
      lecturePattern: 'import emoji\ntext = input("Input: ")\nprint(emoji.emojize(text, language="alias"))',
      noteExample: 'import random\nprint(random.randint(1, 10))'
    },
    'Frank, Ian and Glen’s Letters': {
      skill: 'Command-line arguments and third-party package use.',
      lecturePattern: 'from pyfiglet import Figlet\nfiglet = Figlet()\nprint(figlet.renderText(input("Input: ")))',
      noteExample: 'import sys\nprint("Arguments:", sys.argv)'
    },
    'Adieu, Adieu': {
      skill: 'Collect list input and format final sentence.',
      lecturePattern: 'names = []\nwhile True:\n    name = input("Name: ")\n    names.append(name)',
      noteExample: 'students = ["Hermione", "Harry", "Ron"]\nfor student in students:\n    print(student)'
    },
    'Guessing Game': {
      skill: 'Random value + looped user guesses.',
      lecturePattern: 'import random\nlevel = int(input("Level: "))\nsecret = random.randint(1, level)\nwhile True:\n    guess = int(input("Guess: "))',
      noteExample: 'i = 0\nwhile i < 3:\n    print("meow")\n    i += 1'
    },
    'Little Professor': {
      skill: 'Nested loops and score tracking.',
      lecturePattern: 'for _ in range(10):\n    # ask question\n    # allow up to 3 tries\n    pass',
      noteExample: 'for _ in range(3):\n    print("#")'
    },
    'Bitcoin Price Index': {
      skill: 'API request + numeric conversion/output.',
      lecturePattern: 'import requests\nimport sys\nprice = requests.get("https://api.coindesk.com/v1/bpi/currentprice.json").json()["bpi"]["USD"]["rate_float"]\nprint(price * float(sys.argv[1]))',
      noteExample: 'import requests\nresponse = requests.get("https://example.com")\nprint(response.status_code)'
    },

    // PSET 5
    'Testing my twttr': {
      skill: 'Write test functions that assert expected outputs.',
      lecturePattern: 'from twttr import shorten\n\ndef test_lowercase():\n    assert shorten("twitter") == "twttr"',
      noteExample: 'def square(n):\n    return n * n\n\ndef test_square():\n    assert square(2) == 4'
    },
    'Back to the Bank': {
      skill: 'Test branches for multiple input categories.',
      lecturePattern: 'from bank import value\n\ndef test_hello():\n    assert value("hello") == 0',
      noteExample: 'def is_even(n):\n    return n % 2 == 0\n\ndef test_is_even():\n    assert is_even(4) == True'
    },
    'Re-requesting a Vanity Plate': {
      skill: 'Test validation logic with valid/invalid cases.',
      lecturePattern: 'from plates import is_valid\n\ndef test_valid():\n    assert is_valid("CS50") == True',
      noteExample: 'def test_invalid():\n    assert function("bad") == False'
    },
    'Refueling': {
      skill: 'Test numeric parsing and edge output behavior.',
      lecturePattern: 'from fuel import convert, gauge\n\ndef test_convert():\n    assert convert("1/2") == 50',
      noteExample: 'def test_gauge():\n    assert gauge(99) == "F"'
    },

    // PSET 6
    'Lines of Code': {
      skill: 'Read files and count lines based on rules.',
      lecturePattern: 'with open("file.py") as f:\n    lines = f.readlines()\nprint(len(lines))',
      noteExample: 'with open("names.txt") as file:\n    for line in file:\n        print(line.rstrip())'
    },
    'Pizza Py': {
      skill: 'CSV reading and table display.',
      lecturePattern: 'import csv\nwith open("menu.csv") as file:\n    reader = csv.DictReader(file)\n    for row in reader:\n        print(row)',
      noteExample: 'import csv\nwith open("students.csv") as file:\n    reader = csv.reader(file)\n    for row in reader:\n        print(row)'
    },
    'Scourgify': {
      skill: 'Parse and rewrite CSV rows with new format.',
      lecturePattern: 'import csv\nwith open("before.csv") as before, open("after.csv", "w", newline="") as after:\n    writer = csv.DictWriter(after, fieldnames=["first", "last", "house"])',
      noteExample: 'with open("students.csv") as file:\n    reader = csv.DictReader(file)\n    for row in reader:\n        print(row["name"], row["house"])'
    },
    'CS50 P-Shirt': {
      skill: 'Image resizing and overlay with PIL.',
      lecturePattern: 'from PIL import Image, ImageOps\nshirt = Image.open("shirt.png")\nphoto = Image.open("input.jpg")\nphoto = ImageOps.fit(photo, shirt.size)\nphoto.paste(shirt, shirt)',
      noteExample: 'from PIL import Image\nimg = Image.open("before.jpg")\nimg.save("after.jpg")'
    },

    // PSET 7
    'NUMB3RS': {
      skill: 'Regex validation with full-string matching.',
      lecturePattern: 'import re\nif re.fullmatch(r"\\d+\\.\\d+\\.\\d+\\.\\d+", ip):\n    print("Valid")',
      noteExample: 'import re\nif re.search(r"cat", text):\n    print("Found")'
    },
    'Watch on YouTube': {
      skill: 'Regex extraction from URL formats.',
      lecturePattern: 'import re\nmatches = re.search(r"(?:youtube\\.com/watch\\?v=|youtu\\.be/)([\\w-]+)", url)',
      noteExample: 'import re\nname = re.sub(r"^https?://", "", website)'
    },
    'Working 9 to 5': {
      skill: 'Regex groups + time conversion.',
      lecturePattern: 'import re\nmatch = re.search(r"^(\\d{1,2})(?::(\\d{2}))? (AM|PM) to", s)',
      noteExample: 'import re\nif re.fullmatch(r"\\d{1,2}:\\d{2}", t):\n    print("ok")'
    },
    'Regular, um, Expressions': {
      skill: 'Regex substitution/counting.',
      lecturePattern: 'import re\ncount = len(re.findall(r"\\bum\\b", text, re.IGNORECASE))',
      noteExample: 'import re\nclean = re.sub(r"\\s+", " ", text).strip()'
    },
    'Response Validation': {
      skill: 'Validate email-like input with regex.',
      lecturePattern: 'import re\nif re.fullmatch(r"[^@]+@[^@]+\\.[^@]+", email):\n    print("Valid")',
      noteExample: 'import re\nif re.search(r"@", email):\n    print("Has @")'
    },

    // PSET 8
    'Seasons of Love': {
      skill: 'Date calculations and text conversion.',
      lecturePattern: 'from datetime import date\nborn = date.fromisoformat(input("Date of Birth: "))\nminutes = int((date.today() - born).total_seconds() / 60)',
      noteExample: 'from datetime import date\nprint(date.today())'
    },
    'Cookie Jar': {
      skill: 'Define class with constructor and methods.',
      lecturePattern: 'class Jar:\n    def __init__(self, capacity=12):\n        self.capacity = capacity\n        self.size = 0',
      noteExample: 'class Student:\n    def __init__(self, name):\n        self.name = name'
    },
    'CS50 Shirtificate': {
      skill: 'Generate PDF output with FPDF.',
      lecturePattern: 'from fpdf import FPDF\npdf = FPDF()\npdf.add_page()\npdf.set_font("Helvetica", size=24)',
      noteExample: 'from fpdf import FPDF\npdf = FPDF()\npdf.add_page()\npdf.output("out.pdf")'
    }
  };

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
    const aligned = PROBLEM_ALIGNMENT[problem.title];
    if (aligned?.starter) return aligned.starter;
    if (problem.starter) return problem.starter;
    return `# Starter for ${problem.title}\n# TODO: Read the official spec first\n\n\ndef main():\n    # TODO: implement ${problem.title}\n    pass\n\n\nif __name__ == "__main__":\n    main()`;
  }

  function problemWorked(problem) {
    const aligned = PROBLEM_ALIGNMENT[problem.title];
    if (aligned?.worked) return aligned.worked;
    if (problem.worked) return problem.worked;
    return `# Worked practice pattern for ${problem.title}\n# Similar practice only, not the exact CS50 solution.\n\ntext = input("Input: ").strip()\nprint("You entered:", text)`;
  }

  function problemLecturePattern(problem) {
    const aligned = PROBLEM_ALIGNMENT[problem.title];
    if (aligned?.lecturePattern) return aligned.lecturePattern;
    if (problem.lecturePattern) return problem.lecturePattern;
    return `for _ in range(3):\n    print("practice")`;
  }

  function problemNoteExample(problem) {
    const aligned = PROBLEM_ALIGNMENT[problem.title];
    if (aligned?.noteExample) return aligned.noteExample;
    if (problem.noteExample) return problem.noteExample;
    return `for _ in range(3):\n    print("meow")`;
  }

  function buildSnippetBlock(codeText, label) {
    const encoded = encodeURIComponent(codeText);
    return `
      <div class="snippet-block" aria-label="${safeHtml(label)} code example">
        <div class="snippet-editor" data-code="${encoded}" data-label="${safeHtml(label)}"></div>
        <pre class="snippet-fallback"><code>${safeHtml(codeText)}</code></pre>
      </div>
    `;
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
        <p><strong>Focus skill:</strong> ${safeHtml(problem.skill || PROBLEM_ALIGNMENT[problem.title]?.skill || 'Use loops, conditions, and string/list/dict tools from this week.')}</p>
        <div class="hint">
          <strong>Lecture pattern</strong>
          ${buildSnippetBlock(problemLecturePattern(problem), 'Lecture pattern')}
          <p><strong>Example from the notes</strong></p>
          ${buildSnippetBlock(problemNoteExample(problem), 'Example from the notes')}
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

  function enhanceSnippetsWithMonaco() {
    if (typeof monaco === 'undefined') return;

    const editors = document.querySelectorAll('.snippet-editor[data-code]');
    editors.forEach((host) => {
      if (host.dataset.enhanced === 'true') return;

      const code = decodeURIComponent(host.dataset.code || '');
      const lines = Math.max(1, code.split('\n').length);
      const lineHeight = 20;
      const height = Math.max(70, Math.min(320, lines * lineHeight + 18));

      host.style.height = `${height}px`;
      host.style.display = 'block';

      const fallback = host.parentElement ? host.parentElement.querySelector('.snippet-fallback') : null;
      if (fallback) fallback.style.display = 'none';

      monaco.editor.create(host, {
        value: code,
        language: 'python',
        theme: 'vs-dark',
        readOnly: true,
        lineNumbers: 'on',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        fontSize: 13,
        lineHeight,
        automaticLayout: true,
        scrollbar: {
          vertical: 'hidden',
          horizontal: 'auto',
          handleMouseWheel: false,
        },
        ariaLabel: host.dataset.label || 'Code example'
      });

      host.dataset.enhanced = 'true';
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

    enhanceSnippetsWithMonaco();
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

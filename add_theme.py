#!/usr/bin/env python3
import re

# Read the file
with open('wordguide2.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add theme functions before "const pages = buildPages"
theme_functions = '''        // Theme management
        const THEME_STORAGE_KEY = 'mos-word-p2-theme';
        
        function initializeTheme() {
            const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
            document.documentElement.setAttribute('data-theme', savedTheme);
        }
        
        function setTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem(THEME_STORAGE_KEY, theme);
        }
        
        // Initialize theme immediately
        initializeTheme();

'''

# Insert theme functions
content = re.sub(
    r'(\s+})\n(\s+const pages = buildPages)',
    r'\1\n\n' + re.escape(theme_functions) + r'\2',
    content
)

# 2. Add theme event listener after resetBtn listener
content = re.sub(
    r"(els\.resetBtn\.addEventListener\('click', \(\) => \{ idx = 0; render\(\); \}\);)\n(\s+els\.jumpToTask\.addEventListener)",
    r'\1\n        els.themeSelector.addEventListener(\'change\', (e) => { setTheme(e.target.value); });\n\2',
    content
)

# Write back
with open('wordguide2.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Theme management code added successfully!")

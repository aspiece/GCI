// tools/expr_stress_test.js
// Puppeteer-based stress test: open OOOReview.html and run the in-page expression stress function
const puppeteer = require('puppeteer');
const path = require('path');

async function run() {
    const file = path.resolve(__dirname, '..', 'OOOReview.html');
    const url = 'file://' + file.replace(/\\/g, '/');
    console.log('Opening', url);
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'load' });

    // Expose a function that runs within the page to stress-generate expressions
    const levels = ['very-easy', 'easy', 'medium', 'hard', 'expert'];
    for (const lvl of levels) {
        console.log(`Testing level: ${lvl}`);
        const result = await page.evaluate(async (lvl) => {
            // If the page provides a stress function, use it; otherwise implement a quick runner
            const iters = 2000;
            const stats = { level: lvl, iterations: iters, failures: 0, maxAbs: 0, samples: [] };
            // ensure difficulty select is set so generation matches UI choice
            try { const sel = document.getElementById('difficulty'); if (sel) sel.value = lvl; } catch (e) { }
            for (let i = 0; i < iters; i++) {
                try {
                    const expr = window.generateExpression ? window.generateExpression(lvl, parseInt(document.getElementById('range').value || '9', 10)) : null;
                    if (!expr) { stats.failures++; continue; }
                    let val;
                    try { val = window.evaluateExpr ? window.evaluateExpr(expr) : Function('return (' + expr + ')')(); } catch (e) { stats.failures++; continue; }
                    if (!Number.isFinite(val) || !Number.isInteger(val)) { stats.failures++; }
                    const a = Math.abs(val);
                    if (a > stats.maxAbs) stats.maxAbs = a;
                    if (stats.samples.length < 6) stats.samples.push({ expr, val });
                } catch (e) { stats.failures++; }
            }
            return stats;
        }, lvl);
        console.log('Result', result);
        if (result.failures > result.iterations * 0.1) {
            console.error('High failure rate detected for', lvl, result.failures, '/', result.iterations);
            await browser.close();
            process.exit(2);
        }
    }

    await browser.close();
    console.log('Expression stress test completed successfully');
}

run().catch((err) => { console.error(err); process.exit(1); });

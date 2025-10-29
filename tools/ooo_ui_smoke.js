const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const filePath = path.resolve(__dirname, '..', 'OOOReview.html');
    const fileUrl = 'file:///' + filePath.replace(/\\/g, '/');
    console.log('Opening', fileUrl);

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);

    await page.goto(fileUrl);

    // Start a small set (5 problems)
    await page.waitForSelector('#generate');
    await page.click('#generate');

    // wait for problem to appear
    await page.waitForSelector('#problem');

    const solveCurrent = async () => {
        // read problem text
        const expr = await page.$eval('#problem', el => el.textContent.trim());
        // evaluate expression safely in Node (convert ^ to **)
        const jsExpr = expr.replace(/\^/g, '**');
        // remove any non-expression text (if problem contains prompts) - assume expr is directly evaluable
        let val;
        try {
            // use Function to evaluate
            val = Function('return (' + jsExpr + ')')();
            // round like app does
            val = Math.round((val + Number.EPSILON) * 100000) / 100000;
        } catch (e) {
            throw new Error('Failed evaluating expression: ' + jsExpr + ' -> ' + e.message);
        }
        // for integers (expected), use integer
        const answer = String(Math.trunc(val));
        await page.focus('#answer');
        await page.$eval('#answer', (el, v) => { el.value = v; }, answer);
        // press Enter to submit
        await page.keyboard.press('Enter');
        // give UI a moment
        await page.waitForTimeout(200);
        // read score
        const scoreText = await page.$eval('#score', el => el.textContent.trim());
        return Number(scoreText);
    };

    // Run three problems and test that repeated Enter doesn't increase score
    let prevScore = 0;
    for (let i = 0; i < 3; i++) {
        const s = await solveCurrent();
        console.log('After answer, score =', s);
        if (s < prevScore) {
            console.error('Score decreased unexpectedly');
            await browser.close();
            process.exit(2);
        }
        // press Enter again (should not change score)
        await page.keyboard.press('Enter');
        await page.waitForTimeout(150);
        const s2 = Number(await page.$eval('#score', el => el.textContent.trim()));
        console.log('After repeated Enter, score =', s2);
        if (s2 !== s) {
            console.error('Score changed on repeated Enter — bug');
            await browser.close();
            process.exit(3);
        }
        // click Next to move on
        await page.click('#next');
        await page.waitForTimeout(120);
        prevScore = s;
    }

    console.log('Smoke test passed: repeated Enter does not double-score and score is authoritative.');
    await browser.close();
    process.exit(0);
})();

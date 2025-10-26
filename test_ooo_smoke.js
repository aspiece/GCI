// Smoke test for OOOReview generator/evaluator
// Run with: node test_ooo_smoke.js

'use strict';

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateExpression(level, maxAbs) {
    const opsBasic = ['+', '-', '*', '/'];
    const opsWithExp = ['+', '-', '*', '/', '**'];
    const ops = opsWithExp;
    let opsCount;
    if (level === 'very-easy') opsCount = 1;
    else if (level === 'easy') opsCount = 2;
    else if (level === 'medium') opsCount = randInt(3, 4);
    else if (level === 'hard') opsCount = randInt(4, 6);
    else if (level === 'expert') opsCount = randInt(6, 8);
    else opsCount = 2;
    let tokens = [];
    const includeExpChance = level === 'very-easy' ? 0.10 : level === 'easy' ? 0.25 : level === 'medium' ? 0.5 : level === 'hard' ? 0.75 : 0.9;
    for (let i = 0; i <= opsCount; i++) {
        let n = randInt(-maxAbs, maxAbs);
        tokens.push(String(n));
        if (i < opsCount) {
            let op;
            if (Math.random() < includeExpChance) op = '**';
            else op = pick(opsBasic);
            tokens.push(op);
        }
    }
    // parentheses insertion (simple)
    let pairs = 0;
    if (level === 'very-easy') pairs = randInt(0, 1);
    else if (level === 'easy') pairs = randInt(0, 1);
    else if (level === 'medium') pairs = randInt(0, 1);
    else if (level === 'hard') pairs = randInt(1, 2);
    else if (level === 'expert') pairs = randInt(2, 3);
    if (opsCount < 2) pairs = 0;
    for (let p = 0; p < pairs; p++) {
        const len = tokens.length;
        if (len < 3) break;
        let i = randInt(0, Math.max(0, len - 3));
        if (i % 2 === 1) i++;
        let j = randInt(i + 2, Math.min(len - 1, i + 6));
        if (j % 2 === 1) j++;
        tokens.splice(i, 0, '(');
        tokens.splice(j + 1, 0, ')');
    }

    // Clamp exponents and bases similar to app
    const findNextNumber = (arr, start) => {
        for (let i = start + 1; i < arr.length; i++) {
            if (/^-?\d+$/.test(arr[i])) return i;
        }
        return -1;
    };
    const findPrevNumber = (arr, start) => {
        for (let i = start - 1; i >= 0; i--) {
            if (/^-?\d+$/.test(arr[i])) return i;
        }
        return -1;
    };
    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === '**') {
            const expIdx = findNextNumber(tokens, i);
            const baseIdx = findPrevNumber(tokens, i);
            if (expIdx !== -1) {
                tokens[expIdx] = String(randInt(0, 4));
            }
            if (baseIdx !== -1) {
                let base = parseInt(tokens[baseIdx], 10) || 1;
                if (base > 6) base = 6;
                if (base < -6) base = -6;
                tokens[baseIdx] = String(base);
            }
        }
    }
    const expr = tokens.join(' ');
    if (/\/\s*0(?!\d|\.|\))/g.test(expr)) return generateExpression(level, maxAbs);
    return expr;
}

function evaluateExpr(expr) {
    if (!/^[0-9+\-*/^().\s]+$/.test(expr)) throw new Error('Invalid expression characters');
    const jsExpr = expr.replace(/\^/g, '**');
    const val = Function('return (' + jsExpr + ')')();
    if (!isFinite(val)) throw new Error('Non-finite result');
    return Math.round((val + Number.EPSILON) * 100000) / 100000;
}

// Run smoke tests
const difficulties = ['very-easy', 'easy', 'medium', 'hard', 'expert'];
let failures = 0;
let tests = 0;
for (const d of difficulties) {
    for (let i = 0; i < 500; i++) {
        tests++;
        try {
            const ex = generateExpression(d, 20);
            const val = evaluateExpr(ex);
            // enforce integer results (matches app requirement)
            if (typeof val !== 'number' || Number.isNaN(val) || !isFinite(val) || Math.abs(val) > 1e9 || !Number.isInteger(val)) {
                console.error('Bad value (non-integer or invalid)', d, ex, val);
                failures++;
            }
        } catch (err) {
            console.error('Error for', d, 'iteration', i, err && err.message);
            failures++;
        }
    }
}

console.log(`Ran ${tests} tests. Failures: ${failures}`);
if (failures > 0) process.exit(2);
process.exit(0);

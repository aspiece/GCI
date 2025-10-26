Playwright checklist and quick run guide

This repository includes a minimal Playwright test to validate keyboard focus and badge-modal open/close flow.

Prerequisites

- Node.js (14+)
- Optional: install Playwright browsers (npx playwright install)

Install and run (recommended):

1. Install dev dependencies (Playwright):

```powershell
npm init -y
npm i -D @playwright/test
npx playwright install chromium
```

2. Run the specific test:

```powershell
npx playwright test tests/playwright/accessibility.spec.mjs --project=chromium
```

Notes

- The test loads the local file via file:// URL. If your workspace is in a different path, update the URL in the test file accordingly.
- If running in CI, prefer serving the site with a simple static server (e.g., npx http-server) and target <http://localhost:8080/OOOReview.html> to avoid file:// restrictions.

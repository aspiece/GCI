# GCI Student Launch Portal

A lightweight student onboarding website for Genesee Career Institute Computer Science and technology courses.

Students can use one URL to:

- choose their course
- open required sign-in systems
- open their LMS
- access course tools
- review orientation expectations
- complete a setup check
- report problems
- start a first activity while others finish setup

The site is built for GitHub Pages with only HTML, CSS, and vanilla JavaScript.

## Project structure

```text
/
├── index.html
├── orientation.html
├── help.html
├── css/
│   └── styles.css
├── js/
│   ├── config.js
│   └── app.js
├── assets/
│   └── README.md
└── README.md
```

## Preview locally

Because this is a static site, you can preview it in either of these ways:

1. Open `index.html` directly in a browser.
2. Or run a simple local server from the repository root:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

## Enable GitHub Pages

1. Push the repository to GitHub.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the branch you want to publish and the `/ (root)` folder.
5. Save the settings.
6. Wait for GitHub Pages to publish the site.

All site links use relative paths so the portal also works from GitHub Pages project URLs such as `https://username.github.io/gci-student-launch/`.

## Course configuration

All course data and editable external links live in:

- `js/config.js`

This includes:

- course names
- course descriptions
- LMS links
- tool links
- syllabus links
- orientation links
- setup check link
- help/reporting link
- first mission links

## Change links

Open `js/config.js` and update the URL strings.

Examples of values you will likely replace:

- `setupCheckUrl`
- `helpFormUrl`
- `firstMissionDefaultUrl`
- each course's `syllabusUrl`
- each course's `orientationUrl`
- each course's LMS and tool URLs

Temporary links are intentionally labeled with obvious `REPLACE-WITH-...` placeholders.

## Add another course

1. Open `js/config.js`.
2. Add a new item inside `SITE_CONFIG.courses`.
3. Give the new course a unique key.
4. Provide its name, description, LMS items, tool items, syllabus URL, orientation URL, and first mission URL.
5. Save the file and reload the site.

The homepage course cards and dashboard content are generated from that configuration.

## Logo placement

Put the official GCI logo in:

- `assets/`

A placeholder logo area is already built into the interface so the site still looks polished before the final logo is available.

## Placeholder URLs still to update

The following values are still placeholders by default:

- district Canvas URL
- setup check form URL
- help/report problem form URL
- course syllabi URLs
- course orientation URLs
- first mission URLs
- district/internal course tools
- certification and hardware resource links
- student help desk URL

Public services already use real public URLs where appropriate:

- Gmail
- Google Drive
- Google Classroom
- GitHub
- CodeHS
- Google account sign-in

## Privacy and security notes

- The site does not collect student names.
- The site does not collect student email addresses.
- The site stores only course choice and step completion in local browser storage.
- No databases, authentication systems, API keys, or private credentials are used.
- Assume the site is publicly accessible when hosted on GitHub Pages.

## Before launch checklist

- [ ] Replace every `REPLACE-WITH-...` URL in `js/config.js`
- [ ] Add the official GCI logo if available
- [ ] Verify each course shows the correct LMS buttons
- [ ] Verify each course shows the correct tools
- [ ] Test course selection and change course behavior
- [ ] Test onboarding progress save/reset behavior
- [ ] Test the setup check and help form destinations
- [ ] Test the site on a phone and a Chromebook
- [ ] Confirm all external links open safely in a new tab

# GCI

Tools Built for the Genesee Career Institute

## App status

- Production
  - `OOOReview` (Python Order of operations) — interactive practice app with badge cabinet, mastery tracking, and PNG export. Path: `OOOReview.html`
  - `AgileReview` — instructor review tools
  - `No_School_Viewer` — schedule viewer
  - `wordguide1` — MOS Word Project 1 step-by-step guide. Path: `wordguide1.html`
  - `wordguide2` — MOS Word Project 2 step-by-step guide (34 tasks). Path: `wordguide2.html`

  - `Lab Manual Generator` (Python) — Teacher edition DOCX generator (production). Script: `HArdware Lab Manual.py`. Output: `GCI_Computer_Hardware_Labs_Teacher_Edition_updated.docx`

- Alpha Testing
  - `GCI_Communications` — communications utilities (Alpha)
  
## In Development

- `AgileVocab` — vocabulary practice (In Development)
- `GCI3Dorder` — 3D order demo (In Development)
- `mathquest` — interactive math exercises (In Development)
- `ProgReview` — programming review (In Development)

## Quick start (OOOReview)

- Open `OOOReview.html` in a browser to run the production app locally.

## Quick start (MOS Word Guides)

- Open `wordguide1.html` in a browser for Project 1 guided walkthrough
- Open `wordguide2.html` in a browser for Project 2 guided walkthrough (34 tasks)
- Required project files are located in the `wordprojectfiles` folder
- Progress is automatically saved in your browser

Contributions welcome — please open an issue describing proposed changes and test steps.

## Quick start (Lab Manual Generator)

- Requirements: Python 3.8+ and the `python-docx` package.
- Install dependency (PowerShell):

```powershell
python -m pip install --user python-docx
```

- Generate the teacher edition (PowerShell):

```powershell
python "c:\github\GCI\HArdware Lab Manual.py"
```

- Notes:
  - The script writes `GCI_Computer_Hardware_Labs_Teacher_Edition_updated.docx` by default to avoid write errors if an earlier document is open. Close any open copies of the DOCX to allow overwriting the primary filename.
  - After opening the DOCX in Microsoft Word, update the Table of Contents by selecting the TOC page and pressing F9 (or References → Update Table) so page numbers and hyperlinks populate.

# Scientific Portfolio (Static Site)

A modern, static landing page that renders a scientific CV from a single CSV database of publications and conference contributions. The build pipeline also computes summary metrics (MNiSW points, total Impact Factor, and counts by category) and exports the CV to PDF and DOCX.

## Repository structure

- `data/publications.csv` — single source of truth (publications + conferences)
- `data/metrics.json` — Google Scholar metrics (manual or automated)
- `data/summary.json` — computed totals used by the site/CV
- `assets/Dawid-Tobolski-Scientific-CV.pdf` — auto-generated CV (PDF)
- `assets/Dawid-Tobolski-Scientific-CV.docx` — auto-generated CV (DOCX)
- `scripts/build_site.py` — local build script
- `.github/workflows/update-scholar.yml` — daily workflow (optional)

## 1) Edit the database (CSV)

File: `data/publications.csv`

Encoding note (Polish diacritics): Save the CSV as **UTF-8** (or UTF-8 with BOM). When exporting from Microsoft Excel on Windows, CSV may be saved as **Windows-1250 (cp1250)** and/or use a **semicolon** delimiter. The build script is configured to auto-detect the delimiter and to try UTF-8, cp1250, and ISO-8859-2.

### Columns

All columns are strings unless noted.

- `record_type`: `journal_article` | `other_publication` | `book_chapter` | `conference_contribution`
- `year`: e.g., `2025`
- `category`: `A` | `B` | `Book chapter` | `Conference`
- `subtype`: e.g., `Journal article`, `Poster`, `Oral presentation`
- `citation`: full, human-readable reference (displayed on the website and in the CV)
- `doi`: DOI without the `https://doi.org/` prefix (optional)
- `mnicsw_points`: numeric (optional)
- `impact_factor`: numeric (optional)
- `start_date`, `end_date`: `DD.MM.YYYY` or `YYYY-MM-DD` (optional; conferences)
- `city`, `country`, `award`: optional (conferences)

## 2) Build locally

From the repository root:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python scripts/build_site.py
python -m http.server 8000

#!/usr/bin/env python3
"""
Fetch Google Scholar metrics (citations, h-index, i10-index) via SerpApi and store them in data/metrics.json.

Why SerpApi:
- Google Scholar does not provide an official public API for automated metric retrieval.
- Direct scraping is brittle and can trigger IP throttling/captchas.

Requirements:
- SERPAPI_API_KEY secret (GitHub Actions secret)
- SCHOLAR_AUTHOR_ID (defaults to Dawid Tobolski: Rj58qXIAAAAJ)

Usage:
  python scripts/fetch_scholar_metrics_serpapi.py
"""

from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import requests

PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = PROJECT_ROOT / "data" / "metrics.json"

SERPAPI_ENDPOINT = "https://serpapi.com/search.json"
DATE_FMT = "%d.%m.%Y"


def _extract_since_key(d: Dict[str, Any]) -> Tuple[Optional[Any], Optional[Any]]:
    """
    In SerpApi outputs, the "since 2016" key can appear as "since_2016" (English) or "depuis_2016" (French).
    """
    all_val = d.get("all")
    since_val = None
    for k in ("since_2016", "depuis_2016", "since_2017", "since_2018"):
        if k in d:
            since_val = d.get(k)
            break
    return all_val, since_val


def _parse_cited_by_table(table: Any) -> Dict[str, Any]:
    citations_all = citations_since = None
    h_all = h_since = None
    i10_all = i10_since = None

    if not isinstance(table, list):
        return {}

    for row in table:
        if not isinstance(row, dict):
            continue

        # Citations row
        if "citations" in row and isinstance(row["citations"], dict):
            citations_all, citations_since = _extract_since_key(row["citations"])
            continue

        # h-index row (h_index or indice_h)
        for key in ("h_index", "indice_h"):
            if key in row and isinstance(row[key], dict):
                h_all, h_since = _extract_since_key(row[key])
                break

        # i10-index row (i10_index or indice_i10)
        for key in ("i10_index", "indice_i10"):
            if key in row and isinstance(row[key], dict):
                i10_all, i10_since = _extract_since_key(row[key])
                break

    return {
        "citations_all": citations_all,
        "citations_since_2016": citations_since,
        "h_index_all": h_all,
        "h_index_since_2016": h_since,
        "i10_index_all": i10_all,
        "i10_index_since_2016": i10_since,
    }


def main() -> None:
    api_key = os.getenv("SERPAPI_API_KEY")
    if not api_key:
        raise SystemExit("Missing SERPAPI_API_KEY (set it as an environment variable / GitHub Actions secret).")

    author_id = os.getenv("SCHOLAR_AUTHOR_ID", "Rj58qXIAAAAJ")
    hl = os.getenv("SCHOLAR_HL", "en")

    params = {
        "engine": "google_scholar_author",
        "author_id": author_id,
        "hl": hl,
        "api_key": api_key,
    }

    r = requests.get(SERPAPI_ENDPOINT, params=params, timeout=60)
    r.raise_for_status()
    data = r.json()

    cited_by = data.get("cited_by", {})
    table = cited_by.get("table", [])
    parsed = _parse_cited_by_table(table)

    out = {
        "source": "Google Scholar (via SerpApi)",
        "author_id": author_id,
        "profile_url": f"https://scholar.google.com/citations?hl={hl}&user={author_id}",
        "citations_all": parsed.get("citations_all", ""),
        "citations_since_2016": parsed.get("citations_since_2016", ""),
        "h_index_all": parsed.get("h_index_all", ""),
        "h_index_since_2016": parsed.get("h_index_since_2016", ""),
        "i10_index_all": parsed.get("i10_index_all", ""),
        "i10_index_since_2016": parsed.get("i10_index_since_2016", ""),
        "last_updated": datetime.now().strftime(DATE_FMT),
        "raw": {
            # Keep a minimal trace for debugging (no API key)
            "search_metadata": data.get("search_metadata", {}),
            "search_parameters": data.get("search_parameters", {}),
        },
    }

    OUT_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved: {OUT_PATH}")


if __name__ == "__main__":
    main()

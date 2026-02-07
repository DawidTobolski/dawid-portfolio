"""
Fetch per-publication Google Scholar citation counts via SerpApi and store them in data/scholar_publications.json.

Usage:
  export SERPAPI_API_KEY="your_key"
  python scripts/fetch_scholar_publications_serpapi.py
"""

from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

import requests

PROJECT_ROOT = Path(__file__).resolve().parents[1]
METRICS_PATH = PROJECT_ROOT / "data" / "metrics.json"
OUT_PATH = PROJECT_ROOT / "data" / "scholar_publications.json"


def load_author_id() -> str:
    if METRICS_PATH.exists():
        data = json.loads(METRICS_PATH.read_text(encoding="utf-8"))
        if isinstance(data, dict) and data.get("author_id"):
            return str(data["author_id"])
    env_author = os.getenv("SCHOLAR_AUTHOR_ID")
    if env_author:
        return env_author
    raise RuntimeError("Author ID not found. Set SCHOLAR_AUTHOR_ID or ensure data/metrics.json includes author_id.")


def fetch_all_articles(author_id: str, api_key: str) -> List[Dict[str, Any]]:
    base_url = "https://serpapi.com/search.json"
    params: Dict[str, Any] | None = {
        "engine": "google_scholar_author",
        "author_id": author_id,
        "hl": "en",
        "api_key": api_key,
        "start": 0,
    }
    url = base_url
    items: List[Dict[str, Any]] = []
    while True:
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        payload = response.json()
        items.extend(payload.get("articles", []))
        pagination = payload.get("serpapi_pagination", {})
        next_url = pagination.get("next")
        if not next_url:
            break
        url = next_url
        params = None
    return items


def main() -> None:
    api_key = os.getenv("SERPAPI_API_KEY")
    if not api_key:
        raise RuntimeError("Missing SERPAPI_API_KEY environment variable.")
    author_id = load_author_id()

    articles = fetch_all_articles(author_id, api_key)
    items = []
    for article in articles:
        cited_by = None
        cited_by_data = article.get("cited_by") or {}
        if isinstance(cited_by_data, dict):
            cited_by = cited_by_data.get("value")
        items.append(
            {
                "title": article.get("title", ""),
                "link": article.get("link", ""),
                "year": article.get("year", ""),
                "authors": article.get("authors", ""),
                "publication": article.get("publication", ""),
                "cited_by": cited_by,
            }
        )

    output = {
        "source": "Google Scholar (via SerpApi)",
        "author_id": author_id,
        "profile_url": f"https://scholar.google.com/citations?hl=en&user={author_id}",
        "generated_on": datetime.now().strftime("%Y-%m-%d"),
        "items": items,
    }

    OUT_PATH.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved {len(items)} publications to {OUT_PATH}")


if __name__ == "__main__":
    main()

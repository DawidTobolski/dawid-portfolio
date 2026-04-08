# Analiza ostatnich ulepszeń (problem z dodaniem do GitHub)

Data analizy: 2026-04-08 (UTC)

## Co sprawdziłem

- historię commitów i najnowsze zmiany funkcjonalne,
- stan bieżącej gałęzi lokalnej,
- konfigurację połączenia z repozytorium zdalnym (GitHub).

## Najnowsze istotne ulepszenia (poza automatycznymi update'ami metryk)

Poniżej zestawienie ostatnich commitów funkcjonalnych, które wprowadzają realne zmiany w portfolio:

1. `1d62695` — **„nowy artykuł”**
   - Aktualizacja `data/publications.csv` (dodanie/zmiana wpisu publikacji).

2. `3a72d88` — **„Improve portfolio SEO and add research activity section”**
   - Ulepszenia SEO oraz sekcji aktywności naukowej (`index.html`, `assets/app.js`, `assets/styles.css`).

3. `bfe3f1b` — **„Update key metrics ordering and breakdown”**
   - Reorganizacja kluczowych metryk i ich prezentacji (`assets/app.js`, `assets/styles.css`, `index.html`, `scripts/build_site.py`).

4. `3300029` — **„Fix citations yearly totals”**
   - Naprawa sum cytowań rocznych (`assets/app.js`).

5. `1601c43` — **„Add refresh button for metrics data”**
   - Dodanie przycisku odświeżania metryk i większych usprawnień UI/logic (`assets/app.js`, `assets/styles.css`, `index.html`) oraz rozszerzeń skryptu pobierania danych (`scripts/fetch_scholar_publications_serpapi.py`).

6. `7dc1460` — **„Update metrics visualization and publication DOIs”**
   - Rozszerzenia wizualizacji metryk + poprawki DOI i danych publikacji.

7. `90d62d0` — **„Update publication filters and metrics”**
   - Usprawnienie filtrów publikacji i metryk (`assets/app.js`, `assets/styles.css`, `index.html`).

## Co najpewniej zablokowało dodanie do GitHub

W aktualnym klonie lokalnym nie ma skonfigurowanego zdalnego repozytorium (`git remote -v` zwraca brak), a gałąź `work` nie ma upstreamu. To oznacza, że nawet poprawne commity lokalne **nie mogą zostać wypchnięte** bez ponownej konfiguracji połączenia z GitHub.

## Wnioski

- Ulepszenia są widoczne w historii commitów i istnieją lokalnie.
- Główny problem wygląda na **konfiguracyjny (Git remote/upstream)**, a nie brak commitów.
- Automatyczne commity „Automated Scholar metrics update [skip ci]” mogły „przykryć” widoczność ostatnich zmian funkcjonalnych, ale ich nie usuwają.

## Rekomendowany plan naprawy

1. Dodać zdalne repozytorium:
   - `git remote add origin <URL_DO_REPO_GITHUB>`
2. Ustawić gałąź bazową i upstream:
   - `git push -u origin work` (lub na docelową gałąź, np. `main` przez PR)
3. Zweryfikować publikację commitów i ewentualnie otworzyć PR.
4. (Opcjonalnie) odfiltrować automatyczne commity w widoku historii, aby łatwiej śledzić zmiany funkcjonalne.

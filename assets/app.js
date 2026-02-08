(() => {
  const $ = (sel) => document.querySelector(sel);

  const state = {
    profile: null,
    summary: null,
    metrics: null,
    records: [],
  };

  function withCacheBust(url) {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}v=${Date.now()}`;
  }

  async function readJSON(url) {
    const res = await fetch(withCacheBust(url), { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
    return res.json();
  }

  async function readOptionalJSON(url) {
    try {
      return await readJSON(url);
    } catch (err) {
      console.warn(`Optional data not loaded: ${url}`, err);
      return null;
    }
  }

  function fmtNumber(x) {
    if (x === null || x === undefined || x === "") return "—";
    const n = Number(x);
    if (Number.isNaN(n)) return String(x);
    return new Intl.NumberFormat("en-US").format(n);
  }

  function toNumber(value) {
    if (value === null || value === undefined || value === "") return 0;
    const n = Number(value);
    return Number.isNaN(n) ? 0 : n;
  }

  function escapeHTML(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeTitle(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  function ensureSelectOptions(selectEl, values, allLabel = "All") {
    selectEl.innerHTML = "";
    const optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = allLabel;
    selectEl.appendChild(optAll);

    values.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      selectEl.appendChild(opt);
    });
  }

  function renderExternalLinks(profile) {
    const container = $("#externalLinks");
    const quick = $("#quickLinks");
    container.innerHTML = "";
    quick.innerHTML = "";

    const links = profile?.links || {};
    const entries = Object.entries(links);

    for (const [label, href] of entries) {
      const a = document.createElement("a");
      a.className = "link-pill";
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = label;
      container.appendChild(a);

      const b = document.createElement("a");
      b.className = "link-pill";
      b.href = href;
      b.target = "_blank";
      b.rel = "noopener";
      b.textContent = label;
      quick.appendChild(b);
    }
  }

  function renderProfile(profile) {
    $("#name").textContent = profile?.name || "Name";
    $("#footerName").textContent = profile?.name || "Name";
    $("#contactName").textContent = profile?.name || "Name";
    $("#role").textContent = profile?.role || "";
    $("#affiliation").textContent = profile?.affiliation || "";
    $("#contactAffiliation").textContent = profile?.affiliation || "";
    $("#location").textContent = profile?.location || "";

    const email = profile?.email || "";
    const emailLink = $("#emailLink");
    const emailBtn = $("#contactEmailBtn");
    if (email) {
      emailLink.textContent = email;
      emailLink.href = `mailto:${email}`;
      emailBtn.href = `mailto:${email}`;
    }

    renderExternalLinks(profile);
  }

  function renderMetrics(summary, derivedTotals = {}) {
    const grid = $("#metricsGrid");
    grid.innerHTML = "";

    const totals = summary?.totals || {};
    const scholar = summary?.scholar_metrics || {};
    const derived = derivedTotals || {};

    const cards = [
      { key: "citations", label: "Google Scholar citations", value: fmtNumber(scholar.citations_all), hint: `Last updated: ${scholar.last_updated || "—"}` },
      { key: "h_index", label: "Google Scholar h-index", value: fmtNumber(scholar.h_index_all), hint: "Source: Google Scholar" },
      { key: "mnicsw_points", label: "MNiSW points (computed)", value: fmtNumber(totals.mnicsw_points), hint: "Computed from publications.csv" },
      { key: "sum_impact_factor", label: "Sum of journal impact factors (computed)", value: fmtNumber(totals.sum_impact_factor), hint: "Computed from publications.csv" },
      { key: "journal_articles_total", label: "Journal articles (total)", value: fmtNumber(derived.journal_articles_total), hint: "Publications (List A + B, incl. book chapters)" },
      { key: "publications_list_a", label: "Publications (List A)", value: fmtNumber(derived.publications_list_a), hint: "Journal articles with IF" },
      { key: "publications_list_b", label: "Publications (List B)", value: fmtNumber(derived.publications_list_b), hint: "Professional articles, case reports & book chapters" },
      { key: "conference_contributions_total", label: "Conference contributions (total)", value: fmtNumber(totals.conference_contributions_total), hint: `Oral: ${fmtNumber(totals.conference_oral_presentations)} · Poster: ${fmtNumber(totals.conference_posters)}` },
      { key: "articles_and_conferences_total", label: "Articles + conferences (total)", value: fmtNumber(derived.articles_and_conferences_total), hint: "Journal articles + conference contributions" },
    ];

    cards.forEach((c) => {
      const card = document.createElement("div");
      card.className = "card";
      card.dataset.metricKey = c.key;
      card.dataset.metricLabel = c.label;
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.innerHTML = `
        <p class="label">${escapeHTML(c.label)}</p>
        <p class="value">${escapeHTML(c.value)}</p>
        <p class="hint">${escapeHTML(c.hint || "")}</p>
      `;
      grid.appendChild(card);
    });

    $("#lastBuild").textContent = summary?.generated_on || "—";
    $("#buildInfo").textContent = summary?.generated_on
      ? `Build date: ${summary.generated_on}. Outputs: data/publications.json, data/summary.json, and an auto-generated CV (PDF/DOCX).`
      : "";
    $("#metricsUpdated").textContent = scholar?.profile_url
      ? `Google Scholar profile: ${scholar.profile_url}`
      : "";
  }

  function recordBadges(r) {
    const badges = [];
    if (r.category) badges.push({ text: r.category, strong: (r.category === "A" || r.category === "B") });
    if (r.subtype) badges.push({ text: r.subtype, strong: false });
    if (r.year) badges.push({ text: r.year, strong: false });
    if (r.mnicsw_points) badges.push({ text: `MNiSW: ${r.mnicsw_points}`, strong: false });
    if (r.impact_factor) badges.push({ text: `IF: ${r.impact_factor}`, strong: false });
    if (r.award) badges.push({ text: r.award, strong: true });
    return badges;
  }

  function buildMetaLinks(r) {
    const parts = [];
    if (r.doi) {
      const doiUrl = `https://doi.org/${r.doi}`;
      parts.push(`<a href="${doiUrl}" target="_blank" rel="noopener">DOI</a>`);
    }
    if (r.scholar_citations !== undefined && r.scholar_citations !== null && r.scholar_citations !== "") {
      parts.push(`<span>Citations: ${escapeHTML(fmtNumber(r.scholar_citations))}</span>`);
    }
    if (r.start_date || r.end_date) {
      const range = [r.start_date, r.end_date].filter(Boolean).join("–");
      parts.push(`<span>${escapeHTML(range)}</span>`);
    }
    if (r.city || r.country) {
      parts.push(`<span>${escapeHTML([r.city, r.country].filter(Boolean).join(", "))}</span>`);
    }
    return parts.join(" · ");
  }

  function mergeScholarCitations(records, citationsData) {
    if (!citationsData) return records;
    const items = Array.isArray(citationsData.items) ? citationsData.items : Array.isArray(citationsData) ? citationsData : [];
    const byDoi = new Map();
    const byTitle = new Map();

    items.forEach((item) => {
      if (!item) return;
      const doi = String(item.doi || "").toLowerCase();
      const titleKey = normalizeTitle(item.title || item.citation || "");
      if (doi) byDoi.set(doi, item.cited_by ?? item.citations ?? item.citedBy ?? item.count ?? "");
      if (titleKey) byTitle.set(titleKey, item.cited_by ?? item.citations ?? item.citedBy ?? item.count ?? "");
    });

    records.forEach((record) => {
      const doiKey = String(record.doi || "").toLowerCase();
      if (doiKey && byDoi.has(doiKey)) {
        record.scholar_citations = byDoi.get(doiKey);
        return;
      }
      const titleKey = normalizeTitle(record.citation || "");
      if (titleKey && byTitle.has(titleKey)) {
        record.scholar_citations = byTitle.get(titleKey);
      }
    });

    return records;
  }

  function computeYearlyStats(records) {
    const stats = {};
    records.forEach((r) => {
      const year = r.year;
      if (!year) return;
      if (!stats[year]) {
        stats[year] = {
          records_total: 0,
          publications_list_a: 0,
          publications_list_b: 0,
          journal_articles_total: 0,
          conference_contributions_total: 0,
          articles_and_conferences_total: 0,
          mnicsw_points: 0,
          sum_impact_factor: 0,
          citations_total: 0,
        };
      }
      const entry = stats[year];
      const isListA = r.category === "A";
      const isBookChapter = r.record_type === "book_chapter" || String(r.category || "").toLowerCase().includes("book chapter");
      const isListB = r.category === "B" || isBookChapter;
      const isConference = r.record_type === "conference_contribution" || r.category === "Conference";
      entry.records_total += 1;
      if (isListA) entry.publications_list_a += 1;
      if (isListB) entry.publications_list_b += 1;
      if (isListA || isListB) entry.journal_articles_total += 1;
      if (isConference) entry.conference_contributions_total += 1;
      if (isConference || isListA || isListB) entry.articles_and_conferences_total += 1;
      entry.mnicsw_points += toNumber(r.mnicsw_points);
      entry.sum_impact_factor += toNumber(r.impact_factor);
      entry.citations_total += toNumber(r.scholar_citations);
    });
    return stats;
  }

  function setupMetricsVisualization(records) {
    const viz = $("#metricsViz");
    const vizTitle = $("#metricsVizTitle");
    const vizSubtitle = $("#metricsVizSubtitle");
    const vizChart = $("#metricsVizChart");
    const vizLegend = $("#metricsVizLegend");
    const vizCalc = $("#metricsVizCalc");
    const closeBtn = $("#metricsVizClose");

    const yearlyStats = computeYearlyStats(records);
    const years = Object.keys(yearlyStats).sort((a, b) => Number(a) - Number(b));

    const metricConfig = {
      citations: {
        seriesKey: "citations_total",
        subtitle: "Google Scholar citations per publication year.",
        calculation: [
          "For each publication year, sum the Google Scholar citation counts attached to each record.",
          "Citation counts are matched by DOI or normalized title and aggregated per year.",
        ],
      },
      h_index: {
        seriesKey: "records_total",
        subtitle: "Publication output per year (context for h-index).",
        calculation: [
          "The h-index value itself comes from Google Scholar.",
          "The yearly chart shows how many publications are listed in each year as context.",
        ],
      },
      mnicsw_points: {
        seriesKey: "mnicsw_points",
        subtitle: "MNiSW points accumulated per year.",
        calculation: [
          "For each year, sum the MNiSW points from publications.csv.",
          "Entries without points are treated as 0.",
        ],
      },
      sum_impact_factor: {
        seriesKey: "sum_impact_factor",
        subtitle: "Sum of journal impact factors per year.",
        calculation: [
          "For each year, sum the Impact Factor values from publications.csv.",
          "Only journal entries with Impact Factor values contribute to the total.",
        ],
      },
      publications_list_a: {
        seriesKey: "publications_list_a",
        subtitle: "List A journal articles per year.",
        calculation: [
          "Count publications tagged as category A.",
          "Each row in publications.csv counts as one publication.",
        ],
      },
      publications_list_b: {
        seriesKey: "publications_list_b",
        subtitle: "List B publications per year.",
        calculation: [
          "Count publications tagged as category B.",
          "Book chapters are included in List B totals.",
        ],
      },
      journal_articles_total: {
        seriesKey: "journal_articles_total",
        subtitle: "List A + List B journal articles per year.",
        calculation: [
          "Total journal articles = List A + List B (including book chapters).",
        ],
      },
      articles_and_conferences_total: {
        seriesKey: "articles_and_conferences_total",
        subtitle: "Journal articles plus conference contributions per year.",
        calculation: [
          "Articles + conferences = journal articles (List A + B) + conference contributions.",
        ],
      },
      conference_contributions_total: {
        seriesKey: "conference_contributions_total",
        subtitle: "Conference contributions per year.",
        calculation: [
          "Count entries marked as conference contributions.",
          "Oral and poster presentations are included.",
        ],
      },
    };

    function renderChart(metricKey, label) {
      const config = metricConfig[metricKey];
      if (!config) return;
      const data = years.map((year) => ({
        year,
        value: yearlyStats[year]?.[config.seriesKey] ?? 0,
      }));
      const maxValue = Math.max(1, ...data.map((d) => d.value));
      const total = data.reduce((sum, d) => sum + d.value, 0);
      const peak = data.reduce((best, d) => (d.value >= best.value ? d : best), data[0] || { year: "—", value: 0 });

      vizTitle.textContent = label;
      vizSubtitle.textContent = config.subtitle;
      vizChart.innerHTML = `
        <div class="viz-bars">
          ${data
            .map(
              (d) => `
                <div class="viz-bar ${d.year === peak.year ? "is-peak" : ""}" style="--value:${d.value}; --max:${maxValue}" title="${d.year}: ${fmtNumber(d.value)}">
                  <span class="viz-bar-value">${fmtNumber(d.value)}</span>
                  <span class="viz-bar-year">${d.year}</span>
                </div>
              `
            )
            .join("")}
        </div>
      `;
      vizLegend.textContent = `Total: ${fmtNumber(total)} · Peak year: ${peak.year} (${fmtNumber(peak.value)})`;
      vizCalc.innerHTML = (config.calculation || [])
        .map((line) => `<li>${escapeHTML(line)}</li>`)
        .join("");
      viz.removeAttribute("hidden");
      viz.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function handleCardActivate(event) {
      const card = event.currentTarget;
      const metricKey = card.dataset.metricKey;
      const metricLabel = card.dataset.metricLabel || "Metric trend";
      renderChart(metricKey, metricLabel);
    }

    const cards = Array.from(document.querySelectorAll("#metricsGrid .card"));
    cards.forEach((card) => {
      card.addEventListener("click", handleCardActivate);
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleCardActivate(event);
        }
      });
    });

    closeBtn.addEventListener("click", () => {
      viz.setAttribute("hidden", "true");
    });
  }

  function renderList(containerEl, records) {
    containerEl.innerHTML = "";
    if (!records.length) {
      containerEl.innerHTML = `<div class="item"><p class="citation">No matching records.</p></div>`;
      return;
    }

    records.forEach((r) => {
      const badgesHtml = recordBadges(r)
        .map((b) => `<span class="badge ${b.strong ? "badge-strong" : ""}">${escapeHTML(b.text)}</span>`)
        .join("");

      const metaHtml = buildMetaLinks(r);
      const item = document.createElement("div");
      item.className = "item";
      item.innerHTML = `
        <div class="item-top">
          <div class="badges">${badgesHtml}</div>
        </div>
        <p class="citation">${escapeHTML(r.citation || "")}</p>
        ${metaHtml ? `<p class="meta">${metaHtml}</p>` : ""}
      `;
      containerEl.appendChild(item);
    });
  }

  function setupPublicationsUI(pubRecords) {
    const searchEl = $("#pubSearch");
    const yearEl = $("#pubYear");
    const catEl = $("#pubCategory");
    const typeEl = $("#pubType");
    const resetEl = $("#pubReset");
    const listEl = $("#pubList");
    const countEl = $("#pubCount");
    const iconButtons = Array.from(document.querySelectorAll("#publications .icon-filter"));

    const years = Array.from(new Set(pubRecords.map(r => r.year).filter(Boolean))).sort((a,b) => Number(b)-Number(a));
    const cats = Array.from(new Set(pubRecords.map(r => r.category).filter(Boolean))).sort();
    const types = Array.from(new Set(pubRecords.map(r => r.subtype).filter(Boolean))).sort();

    ensureSelectOptions(yearEl, years, "All years");
    ensureSelectOptions(catEl, cats, "All categories");
    ensureSelectOptions(typeEl, types, "All types");

    function apply() {
      const q = (searchEl.value || "").trim().toLowerCase();
      const y = yearEl.value;
      const c = catEl.value;
      const t = typeEl.value;

      const filtered = pubRecords.filter(r => {
        if (y && r.year !== y) return false;
        if (c && r.category !== c) return false;
        if (t && r.subtype !== t) return false;
        if (q) {
          const hay = `${r.citation} ${r.doi} ${r.city} ${r.country} ${r.award}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      const categoryPriority = (record) => {
        if (record.category === "A") return 0;
        if (record.category === "B") return 1;
        return 2;
      };

      const sorted = filtered.slice().sort((a, b) => {
        const yearDiff = Number(b.year || 0) - Number(a.year || 0);
        if (yearDiff !== 0) return yearDiff;
        const catDiff = categoryPriority(a) - categoryPriority(b);
        if (catDiff !== 0) return catDiff;
        return String(a.citation || "").localeCompare(String(b.citation || ""), "pl", { sensitivity: "base" });
      });

      renderList(listEl, sorted);
      countEl.textContent = `${filtered.length} record(s) shown.`;
      iconButtons.forEach((btn) => {
        const isActive = btn.dataset.category === c;
        btn.classList.toggle("is-active", isActive);
        btn.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
    }

    [searchEl, yearEl, catEl, typeEl].forEach(el => el.addEventListener("input", apply));
    resetEl.addEventListener("click", () => {
      searchEl.value = "";
      yearEl.value = "";
      catEl.value = "";
      typeEl.value = "";
      apply();
    });

    iconButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const selected = btn.dataset.category || "";
        catEl.value = catEl.value === selected ? "" : selected;
        apply();
      });
    });

    apply();
  }

  function setupConferencesUI(confRecords) {
    const searchEl = $("#confSearch");
    const yearEl = $("#confYear");
    const subtypeEl = $("#confSubtype");
    const resetEl = $("#confReset");
    const listEl = $("#confList");
    const countEl = $("#confCount");

    const years = Array.from(new Set(confRecords.map(r => r.year).filter(Boolean))).sort((a,b) => Number(b)-Number(a));
    const subtypes = Array.from(new Set(confRecords.map(r => r.subtype).filter(Boolean))).sort();

    ensureSelectOptions(yearEl, years, "All years");
    ensureSelectOptions(subtypeEl, subtypes, "All types");

    function apply() {
      const q = (searchEl.value || "").trim().toLowerCase();
      const y = yearEl.value;
      const s = subtypeEl.value;

      const filtered = confRecords.filter(r => {
        if (y && r.year !== y) return false;
        if (s && r.subtype !== s) return false;
        if (q) {
          const hay = `${r.citation} ${r.city} ${r.country} ${r.award}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      renderList(listEl, filtered);
      countEl.textContent = `${filtered.length} record(s) shown.`;
    }

    [searchEl, yearEl, subtypeEl].forEach(el => el.addEventListener("input", apply));
    resetEl.addEventListener("click", () => {
      searchEl.value = "";
      yearEl.value = "";
      subtypeEl.value = "";
      apply();
    });

    apply();
  }

  function setupTheme() {
    const root = document.documentElement;
    const btn = $("#themeToggle");

    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      root.setAttribute("data-theme", stored);
    } else {
      // Use OS preference
      const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
      root.setAttribute("data-theme", prefersLight ? "light" : "dark");
    }

    btn.addEventListener("click", () => {
      const current = root.getAttribute("data-theme") || "dark";
      const next = current === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
    });
  }

  function setupPrint() {
    $("#printBtn").addEventListener("click", () => window.print());
  }

  function setupRefresh() {
    const btn = $("#refreshDataBtn");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const url = new URL(window.location.href);
      url.searchParams.set("refresh", Date.now().toString());
      window.location.replace(url.toString());
    });
  }

  async function init() {
    setupTheme();
    setupPrint();
    setupRefresh();

    $("#yearNow").textContent = new Date().getFullYear();

    try {
      const [profile, summary, records, citations] = await Promise.all([
        readJSON("data/profile.json"),
        readJSON("data/summary.json"),
        readJSON("data/publications.json"),
        readOptionalJSON("data/scholar_publications.json"),
      ]);

      state.profile = profile;
      state.summary = summary;
      state.records = mergeScholarCitations(records, citations);

      renderProfile(profile);

      const totals = summary?.totals || {};
      const listA = state.records.filter((r) => r.category === "A").length;
      const listB = state.records.filter((r) => {
        const isBookChapter = r.record_type === "book_chapter" || String(r.category || "").toLowerCase().includes("book chapter");
        return r.category === "B" || isBookChapter;
      }).length;
      const confTotal = state.records.filter((r) => r.record_type === "conference_contribution" || r.category === "Conference").length;
      const journalTotal = listA + listB;
      const derivedTotals = {
        publications_list_a: listA,
        publications_list_b: listB,
        journal_articles_total: journalTotal,
        articles_and_conferences_total: journalTotal + confTotal,
      };

      renderMetrics(summary, derivedTotals);
      setupMetricsVisualization(state.records);

      const pubRecords = state.records.filter(r => r.record_type !== "conference_contribution" && r.category !== "Conference");
      const confRecords = state.records.filter(r => r.record_type === "conference_contribution" || r.category === "Conference");

      setupPublicationsUI(pubRecords);
      setupConferencesUI(confRecords);

    } catch (err) {
      console.error(err);
      const metricsGrid = $("#metricsGrid");
      metricsGrid.innerHTML = `<div class="card"><p class="label">Error</p><p class="value">Data failed to load</p><p class="hint">If you are opening the file locally, run a local server (e.g., <code>python -m http.server</code>) or deploy to GitHub Pages.</p></div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();

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

  function fmtNumber(x) {
    if (x === null || x === undefined || x === "") return "—";
    const n = Number(x);
    if (Number.isNaN(n)) return String(x);
    return new Intl.NumberFormat("en-US").format(n);
  }

  function escapeHTML(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
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
      { label: "Google Scholar citations", value: fmtNumber(scholar.citations_all), hint: `Last updated: ${scholar.last_updated || "—"}` },
      { label: "Google Scholar h-index", value: fmtNumber(scholar.h_index_all), hint: "Source: Google Scholar" },
      { label: "MNiSW points (computed)", value: fmtNumber(totals.mnicsw_points), hint: "Computed from publications.csv" },
      { label: "Sum of journal impact factors (computed)", value: fmtNumber(totals.sum_impact_factor), hint: "Computed from publications.csv" },
      { label: "Publications (List A)", value: fmtNumber(totals.publications_list_a), hint: "Journal articles with IF" },
      { label: "Publications (List B)", value: fmtNumber(derived.publications_list_b ?? totals.publications_list_b), hint: "Professional articles & case reports" },
      { label: "Journal articles (total)", value: fmtNumber(derived.journal_articles_total), hint: "All journal articles" },
      { label: "Articles + conferences (total)", value: fmtNumber(derived.articles_and_conferences_total), hint: "Journal articles + conference contributions" },
      { label: "Conference contributions (total)", value: fmtNumber(totals.conference_contributions_total), hint: `Oral: ${fmtNumber(totals.conference_oral_presentations)} · Poster: ${fmtNumber(totals.conference_posters)}` },
    ];

    cards.forEach((c) => {
      const card = document.createElement("div");
      card.className = "card";
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
    if (r.start_date || r.end_date) {
      const range = [r.start_date, r.end_date].filter(Boolean).join("–");
      parts.push(`<span>${escapeHTML(range)}</span>`);
    }
    if (r.city || r.country) {
      parts.push(`<span>${escapeHTML([r.city, r.country].filter(Boolean).join(", "))}</span>`);
    }
    return parts.join(" · ");
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
    }

    [searchEl, yearEl, catEl, typeEl].forEach(el => el.addEventListener("input", apply));
    resetEl.addEventListener("click", () => {
      searchEl.value = "";
      yearEl.value = "";
      catEl.value = "";
      typeEl.value = "";
      apply();
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

  async function init() {
    setupTheme();
    setupPrint();

    $("#yearNow").textContent = new Date().getFullYear();

    try {
      const [profile, summary, records] = await Promise.all([
        readJSON("data/profile.json"),
        readJSON("data/summary.json"),
        readJSON("data/publications.json"),
      ]);

      state.profile = profile;
      state.summary = summary;
      state.records = records;

      renderProfile(profile);

      const journalArticles = records.filter((r) => r.record_type === "journal_article");
      const derivedTotals = {
        publications_list_b: records.filter((r) => r.category === "B").length,
        journal_articles_total: journalArticles.length,
        articles_and_conferences_total: journalArticles.length
          + records.filter((r) => r.record_type === "conference_contribution" || r.category === "Conference").length,
      };

      renderMetrics(summary, derivedTotals);

      const pubRecords = records.filter(r => r.record_type !== "conference_contribution" && r.category !== "Conference");
      const confRecords = records.filter(r => r.record_type === "conference_contribution" || r.category === "Conference");

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

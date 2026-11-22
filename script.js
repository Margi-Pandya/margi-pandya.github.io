/* Site behaviour: dark mode, mobile menu, and search. No libraries needed. */
(function () {
  var root = document.documentElement;

  /* ---------- Dark / light mode ---------- */
  var themeBtn = document.getElementById("themeToggle");
  function setThemeLabel() {
    var dark = root.dataset.theme === "dark";
    themeBtn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  }
  setThemeLabel();
  themeBtn.addEventListener("click", function () {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
    setThemeLabel();
  });

  /* ---------- Mobile menu ---------- */
  var nav = document.getElementById("siteNav");
  var menuBtn = document.getElementById("menuToggle");
  function closeMenu() {
    nav.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
  }
  menuBtn.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });
  nav.addEventListener("click", function (e) { if (e.target.tagName === "A") closeMenu(); });

  /* ---------- Search ---------- */
  var overlay = document.getElementById("searchOverlay");
  var input = document.getElementById("searchInput");
  var list = document.getElementById("searchResults");
  var openBtn = document.getElementById("searchOpen");
  var results = [];
  var active = 0;

  function clean(t) { return (t || "").replace(/\s+/g, " ").trim(); }
  function esc(t) {
    return t.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Build the index from what is on the page, so new content is searchable automatically.
  var index = [];
  var n = 0;
  function add(el, title, section) {
    if (!el.id) el.id = "s-item-" + n++;
    title = clean(title);
    var text = clean(el.innerText || el.textContent);
    if (title && text.indexOf(title) === 0) text = clean(text.slice(title.length));
    index.push({ id: el.id, title: title || text.slice(0, 80), text: text, section: section });
  }
  document.querySelectorAll("main section").forEach(function (sec) {
    var h2 = sec.querySelector("h2");
    var label = h2 ? clean(h2.textContent) : "About";
    sec.querySelectorAll(".card, .pub-list li, .timeline li, .simple-list li, .write-link").forEach(function (el) {
      var t = el.querySelector("h3, .pub-title, .write-link-name, strong");
      add(el, t ? t.textContent : "", label);
    });
    if (sec.classList.contains("hero")) {
      sec.querySelectorAll(".hero-text p:not(.eyebrow)").forEach(function (p) { add(p, "About Margi", "About"); });
    }
  });

  var quickLinks = [
    { id: "about", title: "About", section: "Jump to" },
    { id: "experience", title: "Experience", section: "Jump to" },
    { id: "education", title: "Education", section: "Jump to" },
    { id: "skills", title: "Skills", section: "Jump to" },
    { id: "writing", title: "Writing", section: "Jump to" },
    { id: "contact", title: "Contact", section: "Jump to" }
  ];

  function snippet(text, terms) {
    var lower = text.toLowerCase();
    var at = lower.indexOf(terms[0]);
    var start = Math.max(0, at - 50);
    var piece = (start > 0 ? "…" : "") + text.slice(start, start + 150) + (start + 150 < text.length ? "…" : "");
    var html = esc(piece);
    terms.forEach(function (term) {
      var re = new RegExp("(" + esc(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
      html = html.replace(re, "<mark>$1</mark>");
    });
    return html;
  }

  function render() {
    var q = input.value.toLowerCase().trim();
    var terms = q.split(/\s+/).filter(Boolean);
    if (!terms.length) {
      results = quickLinks;
    } else {
      results = index
        .filter(function (it) {
          var hay = (it.title + " " + it.text).toLowerCase();
          return terms.every(function (t) { return hay.indexOf(t) !== -1; });
        })
        .map(function (it) {
          var score = terms.reduce(function (s, t) { return s + (it.title.toLowerCase().indexOf(t) !== -1 ? 2 : 0); }, 0);
          return { item: it, score: score };
        })
        .sort(function (a, b) { return b.score - a.score; })
        .slice(0, 8)
        .map(function (r) { return r.item; });
    }
    active = 0;
    if (!results.length) {
      list.innerHTML = '<li class="search-empty">No results for “' + esc(input.value) + '”</li>';
      return;
    }
    list.innerHTML = results.map(function (r, i) {
      return '<li role="option" data-i="' + i + '" aria-selected="' + (i === 0) + '">' +
        '<span class="sr-section">' + esc(r.section) + "</span>" +
        '<span class="sr-title">' + esc(r.title) + "</span>" +
        (r.text && terms.length ? '<span class="sr-snippet">' + snippet(r.text, terms) + "</span>" : "") +
        "</li>";
    }).join("");
  }

  function highlightActive() {
    list.querySelectorAll("li[role=option]").forEach(function (li, i) {
      li.setAttribute("aria-selected", i === active ? "true" : "false");
      if (i === active) li.scrollIntoView({ block: "nearest" });
    });
  }

  function go(i) {
    var r = results[i];
    if (!r) return;
    closeSearch();
    var el = document.getElementById(r.id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: r.section === "Jump to" ? "start" : "center" });
    if (r.section !== "Jump to") {
      el.classList.remove("flash");
      void el.offsetWidth;
      el.classList.add("flash");
      setTimeout(function () { el.classList.remove("flash"); }, 1900);
    }
  }

  function openSearch() {
    closeMenu();
    overlay.hidden = false;
    input.value = "";
    render();
    input.focus();
  }
  function closeSearch() {
    overlay.hidden = true;
    openBtn.focus({ preventScroll: true });
  }

  openBtn.addEventListener("click", openSearch);
  input.addEventListener("input", render);
  list.addEventListener("click", function (e) {
    var li = e.target.closest("li[role=option]");
    if (li) go(+li.dataset.i);
  });
  overlay.addEventListener("click", function (e) { if (e.target === overlay) closeSearch(); });

  document.addEventListener("keydown", function (e) {
    var typing = /INPUT|TEXTAREA/.test(document.activeElement.tagName);
    if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      overlay.hidden ? openSearch() : closeSearch();
    } else if (e.key === "/" && !typing && overlay.hidden) {
      e.preventDefault();
      openSearch();
    } else if (!overlay.hidden) {
      if (e.key === "Escape") closeSearch();
      else if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(active + 1, results.length - 1); highlightActive(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(active - 1, 0); highlightActive(); }
      else if (e.key === "Enter") { e.preventDefault(); go(active); }
    }
  });
})();

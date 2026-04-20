(function () {
  const data = window.PROMPT_LIBRARY_DATA;
  const categories = data.categories;
  const items = data.items;

  const LABELS = {
    all: { name: "All Sectors" },
    thinking: {
      name: "Thinking Models",
      description: "Frameworks for sharper questions, contradiction spotting, and reasoning discipline.",
    },
    research: {
      name: "Research Ops",
      description: "Deep research, forecasting, issue mapping, and long-form analysis prompts.",
    },
    writing: {
      name: "Writing Engine",
      description: "Prompts for titles, long-form writing, social posts, rewriting, and tone control.",
    },
    learning: {
      name: "Learning Flow",
      description: "Reading, explanation, simplification, and study-oriented prompt patterns.",
    },
    visual: {
      name: "Visual Output",
      description: "Image direction, slide prompts, visual style boards, and presentation assets.",
    },
    workflow: {
      name: "System Stack",
      description: "System prompts, AI workflows, skills, prompt curation, and operator playbooks.",
    },
  };

  const STORAGE_KEY = "jackywine-prompt-scene-mode";

  const promptCount = document.getElementById("promptCount");
  const activeCategoryName = document.getElementById("activeCategoryName");
  const resultMeta = document.getElementById("resultMeta");
  const cardList = document.getElementById("cardList");
  const categoryFilters = document.getElementById("categoryFilters");
  const categorySummary = document.getElementById("categorySummary");
  const searchInput = document.getElementById("searchInput");
  const detailEmpty = document.getElementById("detailEmpty");
  const detailContent = document.getElementById("detailContent");
  const detailCategory = document.getElementById("detailCategory");
  const detailTitle = document.getElementById("detailTitle");
  const detailSummary = document.getElementById("detailSummary");
  const detailTags = document.getElementById("detailTags");
  const detailBody = document.getElementById("detailBody");
  const copyButton = document.getElementById("copyButton");
  const detailDrawer = document.getElementById("detailDrawer");
  const drawerBackdrop = document.getElementById("drawerBackdrop");
  const drawerCloseButton = document.getElementById("drawerCloseButton");
  const drawerDismissButton = document.getElementById("drawerDismissButton");
  const mode2dButton = document.getElementById("mode2dButton");
  const mode3dButton = document.getElementById("mode3dButton");

  let activeCategory = "all";
  let activeItemId = null;
  let query = "";
  let sceneMode = localStorage.getItem(STORAGE_KEY) === "3d" ? "3d" : "2d";

  function getCategoryMeta(categoryId) {
    const raw = categories.find((category) => category.id === categoryId) || { id: categoryId };
    const label = LABELS[categoryId] || {};
    return {
      ...raw,
      name: label.name || raw.name || "Unknown Sector",
      description: label.description || raw.description || "",
    };
  }

  function escapeHtml(text) {
    return text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function renderInline(text) {
    return escapeHtml(text)
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
      .replace(/\[\[([^\]]+)\]\]/g, "$1")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">Image Link</a>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  }

  function renderMarkdown(markdown) {
    const lines = markdown.split("\n");
    const html = [];
    let inCodeBlock = false;
    let codeLines = [];
    let listType = null;

    function closeList() {
      if (listType) {
        html.push(`</${listType}>`);
        listType = null;
      }
    }

    function closeCodeBlock() {
      if (!inCodeBlock) return;
      html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      inCodeBlock = false;
      codeLines = [];
    }

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith("```")) {
        closeList();
        if (inCodeBlock) {
          closeCodeBlock();
        } else {
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }

      if (!trimmed) {
        closeList();
        continue;
      }

      const heading = trimmed.match(/^(#{1,4})\s+(.*)$/);
      if (heading) {
        closeList();
        const level = heading[1].length;
        html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
        continue;
      }

      const ordered = trimmed.match(/^\d+\.\s+(.*)$/);
      if (ordered) {
        if (listType !== "ol") {
          closeList();
          listType = "ol";
          html.push("<ol>");
        }
        html.push(`<li>${renderInline(ordered[1])}</li>`);
        continue;
      }

      const unordered = trimmed.match(/^[-*]\s+(.*)$/);
      if (unordered) {
        if (listType !== "ul") {
          closeList();
          listType = "ul";
          html.push("<ul>");
        }
        html.push(`<li>${renderInline(unordered[1])}</li>`);
        continue;
      }

      if (trimmed.startsWith(">")) {
        closeList();
        html.push(`<blockquote>${renderInline(trimmed.replace(/^>\s?/, ""))}</blockquote>`);
        continue;
      }

      closeList();
      html.push(`<p>${renderInline(trimmed)}</p>`);
    }

    closeList();
    closeCodeBlock();
    return html.join("");
  }

  function getFilteredItems() {
    const normalized = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchCategory = activeCategory === "all" || item.category === activeCategory;
      const matchQuery =
        !normalized ||
        [item.title, item.summary, item.content, item.filename, ...(item.tags || [])]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      return matchCategory && matchQuery;
    });
  }

  function applySceneMode() {
    document.body.classList.toggle("scene-2d", sceneMode === "2d");
    document.body.classList.toggle("scene-3d", sceneMode === "3d");
    mode2dButton.classList.toggle("is-active", sceneMode === "2d");
    mode3dButton.classList.toggle("is-active", sceneMode === "3d");
    localStorage.setItem(STORAGE_KEY, sceneMode);
    window.dispatchEvent(new CustomEvent("prompt-scene-mode-change", { detail: { mode: sceneMode } }));
  }

  function openDrawer() {
    detailDrawer.classList.remove("is-hidden");
    drawerBackdrop.classList.remove("is-hidden");
    drawerDismissButton.classList.remove("is-hidden");
    if (window.promptMotion && typeof window.promptMotion.openDrawer === "function") {
      window.promptMotion.openDrawer(detailDrawer, drawerBackdrop, drawerDismissButton);
    }
  }

  async function closeDrawer() {
    if (window.promptMotion && typeof window.promptMotion.closeDrawer === "function") {
      await window.promptMotion.closeDrawer(detailDrawer, drawerBackdrop, drawerDismissButton);
    }
    detailDrawer.classList.add("is-hidden");
    drawerBackdrop.classList.add("is-hidden");
    drawerDismissButton.classList.add("is-hidden");
  }

  function renderCategoryFilters() {
    const counts = items.reduce((accumulator, item) => {
      accumulator[item.category] = (accumulator[item.category] || 0) + 1;
      return accumulator;
    }, {});

    const entries = [
      { id: "all", name: LABELS.all.name, count: items.length },
      ...categories.map((category) => ({
        id: category.id,
        name: getCategoryMeta(category.id).name,
        count: counts[category.id] || 0,
      })),
    ];

    categoryFilters.innerHTML = entries
      .map(
        (entry) => `
          <button
            type="button"
            class="filter-chip ${entry.id === activeCategory ? "is-active" : ""}"
            data-category="${entry.id}"
          >
            ${entry.name} · ${entry.count}
          </button>
        `
      )
      .join("");

    [...categoryFilters.querySelectorAll("[data-category]")].forEach((button) => {
      button.addEventListener("click", () => {
        activeCategory = button.dataset.category;
        render();
      });
    });
  }

  function renderCategorySummary() {
    categorySummary.innerHTML = categories
      .map((category) => {
        const meta = getCategoryMeta(category.id);
        const count = items.filter((item) => item.category === category.id).length;
        return `
          <div class="summary-item">
            <h3>${meta.name}</h3>
            <p>${meta.description}</p>
            <p>${count} prompt records</p>
          </div>
        `;
      })
      .join("");
  }

  function renderCards(filteredItems) {
    if (!filteredItems.length) {
      cardList.innerHTML = '<div class="empty-state">No records matched the current query.</div>';
      return;
    }

    if (!filteredItems.some((item) => item.id === activeItemId)) {
      activeItemId = filteredItems[0].id;
    }

    cardList.innerHTML = filteredItems
      .map((item, index) => {
        const categoryMeta = getCategoryMeta(item.category);
        const tags = (item.tags || []).map((tag) => `<span class="tag-chip">${tag}</span>`).join("");
        return `
          <button
            type="button"
            class="prompt-card ${item.id === activeItemId ? "is-active" : ""}"
            data-id="${item.id}"
            style="--depth-index:${index % 9}"
          >
            <div class="prompt-card-inner">
              <div class="card-headline">
                <h3>${item.title}</h3>
                <span class="card-ghost">${String(index + 1).padStart(2, "0")}</span>
              </div>
              <p>${item.summary}</p>
              <div class="card-meta">
                <span>${categoryMeta.name}</span>
                <span>${item.filename}</span>
              </div>
              <div class="tag-row">${tags}</div>
            </div>
          </button>
        `;
      })
      .join("");

    [...cardList.querySelectorAll("[data-id]")].forEach((button) => {
      button.addEventListener("click", () => {
        activeItemId = button.dataset.id;
        render();
        openDrawer();
      });
    });
  }

  function renderDetail(filteredItems) {
    const activeItem = filteredItems.find((item) => item.id === activeItemId);
    if (!activeItem) {
      detailEmpty.classList.remove("is-hidden");
      detailContent.classList.add("is-hidden");
      return;
    }

    const categoryMeta = getCategoryMeta(activeItem.category);
    detailCategory.textContent = categoryMeta.name;
    detailTitle.textContent = activeItem.title;
    detailSummary.textContent = activeItem.summary;
    detailTags.innerHTML = (activeItem.tags || [])
      .map((tag) => `<span class="tag-chip">${tag}</span>`)
      .join("");
    detailBody.innerHTML = renderMarkdown(activeItem.content);
    detailEmpty.classList.add("is-hidden");
    detailContent.classList.remove("is-hidden");

    copyButton.onclick = async function () {
      await navigator.clipboard.writeText(activeItem.content);
      copyButton.textContent = "Copied";
      window.setTimeout(() => {
        copyButton.textContent = "Copy Prompt";
      }, 1200);
    };
  }

  function render() {
    const filteredItems = getFilteredItems();
    const categoryMeta = getCategoryMeta(activeCategory);
    promptCount.textContent = String(items.length).padStart(2, "0");
    activeCategoryName.textContent = categoryMeta.name;
    resultMeta.textContent = `Showing ${filteredItems.length} of ${items.length} prompt records`;
    renderCategoryFilters();
    renderCategorySummary();
    renderCards(filteredItems);
    renderDetail(filteredItems);
    applySceneMode();
    if (window.promptMotion && typeof window.promptMotion.animateWall === "function") {
      window.promptMotion.animateWall(cardList, document.querySelectorAll(".prompt-card"));
    }
  }

  searchInput.addEventListener("input", (event) => {
    query = event.target.value;
    render();
  });

  mode2dButton.addEventListener("click", () => {
    sceneMode = "2d";
    render();
  });

  mode3dButton.addEventListener("click", () => {
    sceneMode = "3d";
    render();
  });

  drawerCloseButton.addEventListener("click", closeDrawer);
  drawerDismissButton.addEventListener("click", closeDrawer);
  drawerBackdrop.addEventListener("click", closeDrawer);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDrawer();
    }
  });

  render();
})();

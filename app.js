(function () {
  const data = window.PROMPT_LIBRARY_DATA;
  const categories = data.categories;
  const items = data.items;

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

  let activeCategory = "all";
  let activeItemId = null;
  let query = "";

  function getCategoryMeta(categoryId) {
    return categories.find((category) => category.id === categoryId);
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
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">图片链接</a>')
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

  function renderCategoryFilters() {
    const counts = items.reduce((accumulator, item) => {
      accumulator[item.category] = (accumulator[item.category] || 0) + 1;
      return accumulator;
    }, {});

    const entries = [
      { id: "all", name: "全部", count: items.length },
      ...categories.map((category) => ({
        id: category.id,
        name: category.name,
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
        const count = items.filter((item) => item.category === category.id).length;
        return `
          <div class="summary-item">
            <h3>${category.name}</h3>
            <p>${category.description}</p>
            <p>${count} 条提示词</p>
          </div>
        `;
      })
      .join("");
  }

  function renderCards(filteredItems) {
    if (!filteredItems.length) {
      cardList.innerHTML = '<div class="empty-state">没有匹配结果，换个关键词试试。</div>';
      return;
    }

    if (!filteredItems.some((item) => item.id === activeItemId)) {
      activeItemId = filteredItems[0].id;
    }

    cardList.innerHTML = filteredItems
      .map((item) => {
        const categoryMeta = getCategoryMeta(item.category);
        const tags = (item.tags || []).map((tag) => `<span class="tag-chip">${tag}</span>`).join("");
        return `
          <button type="button" class="prompt-card ${item.id === activeItemId ? "is-active" : ""}" data-id="${item.id}">
            <h3>${item.title}</h3>
            <p>${item.summary}</p>
            <div class="card-meta">
              <span>${categoryMeta ? categoryMeta.name : "未分类"}</span>
              <span>${item.filename}</span>
            </div>
            <div class="tag-row">${tags}</div>
          </button>
        `;
      })
      .join("");

    [...cardList.querySelectorAll("[data-id]")].forEach((button) => {
      button.addEventListener("click", () => {
        activeItemId = button.dataset.id;
        render();
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
    detailCategory.textContent = categoryMeta ? categoryMeta.name : "未分类";
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
      copyButton.textContent = "已复制";
      window.setTimeout(() => {
        copyButton.textContent = "复制提示词";
      }, 1200);
    };
  }

  function render() {
    const filteredItems = getFilteredItems();
    const categoryMeta = getCategoryMeta(activeCategory);
    promptCount.textContent = String(items.length);
    activeCategoryName.textContent = categoryMeta ? categoryMeta.name : "全部";
    resultMeta.textContent = `当前显示 ${filteredItems.length} / ${items.length} 条提示词`;
    renderCategoryFilters();
    renderCategorySummary();
    renderCards(filteredItems);
    renderDetail(filteredItems);
  }

  searchInput.addEventListener("input", (event) => {
    query = event.target.value;
    render();
  });

  render();
})();

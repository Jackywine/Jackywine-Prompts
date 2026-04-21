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
  const THEME_STORAGE_KEY = "jackywine-prompt-theme";

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
  const themeMatrixButton = document.getElementById("themeMatrixButton");
  const themeKamiButton = document.getElementById("themeKamiButton");
  const themeStatusLabel = document.getElementById("themeStatusLabel");
  const sceneShell = document.getElementById("sceneShell");
  const sceneRecordCount = document.getElementById("sceneRecordCount");
  const sceneHint = document.getElementById("sceneHint");
  const sceneConnections = document.getElementById("sceneConnections");
  const sceneDomFallback = document.getElementById("sceneDomFallback");

  let activeCategory = "all";
  let activeItemId = null;
  let query = "";
  let sceneMode = localStorage.getItem(STORAGE_KEY) === "3d" ? "3d" : "2d";
  let themeMode = localStorage.getItem(THEME_STORAGE_KEY) === "kami" ? "kami" : "matrix";
  let sceneFallbackAnimationId = 0;
  let sceneFallbackState = {
    nodes: [],
    edges: [],
    startedAt: 0,
    pointer: { x: 0.5, y: 0.5, active: false },
  };

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
    sceneShell.classList.toggle("is-hidden", sceneMode !== "3d");
    cardList.closest(".wall-shell").classList.toggle("is-hidden", sceneMode === "3d");
    localStorage.setItem(STORAGE_KEY, sceneMode);
    window.dispatchEvent(new CustomEvent("prompt-scene-mode-change", { detail: { mode: sceneMode } }));
  }

  function applyThemeMode() {
    document.body.classList.toggle("theme-matrix", themeMode === "matrix");
    document.body.classList.toggle("theme-kami", themeMode === "kami");
    themeMatrixButton.classList.toggle("is-active", themeMode === "matrix");
    themeKamiButton.classList.toggle("is-active", themeMode === "kami");
    themeStatusLabel.textContent = themeMode === "kami" ? "Kami reading theme online" : "Matrix scene online";
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
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
      sceneHint.textContent = "Select a prompt node to inspect the full record.";
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
    sceneHint.textContent = `${activeItem.title} loaded. Open the drawer for the full prompt body.`;

    copyButton.onclick = async function () {
      await navigator.clipboard.writeText(activeItem.content);
      copyButton.textContent = "Copied";
      window.setTimeout(() => {
        copyButton.textContent = "Copy Prompt";
      }, 1200);
    };
  }

  function renderSceneFallback(sceneItems) {
    if (!sceneDomFallback || !sceneConnections) return;

    if (!sceneItems.length) {
      sceneDomFallback.innerHTML = "";
      sceneConnections.innerHTML = "";
      sceneFallbackState = {
        nodes: [],
        edges: [],
        startedAt: 0,
        pointer: sceneFallbackState.pointer,
      };
      return;
    }

    const nodes = sceneItems.slice(0, 12).map((item, index) => {
      const angle = index * 2.399963229728653;
      const band = Math.floor(index / 4);
      return {
        item,
        angleOffset: angle,
        orbitRadius: 18 + (index % 4) * 4.2 + band * 2.4,
        orbitTilt: -16 + band * 12,
        orbitSpeed: 0.11 + (index % 5) * 0.019,
        depthAmp: 82 + (index % 4) * 22,
        bobAmp: 1.4 + (index % 3) * 0.4,
        tiltBias: ((index % 5) - 2) * 2.8,
        phaseJitter: (index % 7) * 0.23,
      };
    });

    sceneDomFallback.innerHTML = nodes
      .map(
        (node, index) => `
          <button
            type="button"
            class="scene-node ${node.item.id === activeItemId ? "is-active" : ""}"
            data-scene-id="${node.item.id}"
            style="
              left:50%;
              top:50%;
              --node-z:0px;
              --node-rx:0deg;
              --node-ry:0deg;
              --node-scale:${node.item.id === activeItemId ? 1.08 : 0.92};
              --node-delay:${index * 0.18}s;
            "
          >
            <span class="scene-node-kicker">${getCategoryMeta(node.item.category).name}</span>
            <strong>${node.item.title}</strong>
            <span>${node.item.summary}</span>
          </button>
        `
      )
      .join("");

    const edges = [];
    for (let index = 0; index < nodes.length - 1; index += 1) {
      edges.push([nodes[index], nodes[index + 1]]);
      if (index + 2 < nodes.length && index % 2 === 0) {
        edges.push([nodes[index], nodes[index + 2]]);
      }
    }

    sceneConnections.setAttribute("viewBox", "0 0 100 100");
    sceneConnections.innerHTML = edges
      .map(
        ([,], index) => `
          <line
            class="scene-link"
            data-edge-index="${index}"
          />
        `
      )
      .join("");

    const buttonElements = [...sceneDomFallback.querySelectorAll("[data-scene-id]")];
    buttonElements.forEach((button, index) => {
      button.addEventListener("click", () => {
        activeItemId = button.dataset.sceneId;
        render();
        openDrawer();
      });
      nodes[index].element = button;
    });

    sceneFallbackState = {
      nodes,
      edges,
      startedAt: sceneFallbackState.startedAt || performance.now(),
      pointer: sceneFallbackState.pointer,
    };

    if (!sceneDomFallback.dataset.boundPointer) {
      sceneDomFallback.addEventListener("pointermove", (event) => {
        const bounds = sceneDomFallback.getBoundingClientRect();
        sceneFallbackState.pointer.x = (event.clientX - bounds.left) / bounds.width;
        sceneFallbackState.pointer.y = (event.clientY - bounds.top) / bounds.height;
        sceneFallbackState.pointer.active = true;
      });
      sceneDomFallback.addEventListener("pointerleave", () => {
        sceneFallbackState.pointer.active = false;
      });
      sceneDomFallback.dataset.boundPointer = "true";
    }

    if (!sceneFallbackAnimationId) {
      sceneFallbackAnimationId = window.requestAnimationFrame(animateSceneFallback);
    }
  }

  function animateSceneFallback(now) {
    sceneFallbackAnimationId = 0;

    if (!sceneDomFallback || !sceneConnections || !sceneFallbackState.nodes.length) {
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const elapsed = (now - sceneFallbackState.startedAt) * 0.001;
    const centerX = 50;
    const centerY = 50;
    const pointerOffsetX = (sceneFallbackState.pointer.x - 0.5) * 18;
    const pointerOffsetY = (sceneFallbackState.pointer.y - 0.5) * 14;
    const pointerWeight = sceneFallbackState.pointer.active ? 1 : 0;
    const positions = sceneFallbackState.nodes.map((node) => {
      const itemIsActive = node.item.id === activeItemId;
      const theta = node.angleOffset + elapsed * (reduced ? 0.015 : node.orbitSpeed);
      const phi = node.angleOffset * 0.6 + elapsed * (reduced ? 0.012 : node.orbitSpeed * 0.72);
      const orbitX = Math.cos(theta) * Math.cos(phi) * node.orbitRadius;
      const orbitY =
        Math.sin(phi) * (node.orbitRadius * 0.56) +
        Math.sin(theta * 1.6 + node.phaseJitter) * node.bobAmp;
      const orbitZ = Math.sin(theta) * Math.cos(phi) * node.depthAmp;
      const disturbedX = orbitX + pointerOffsetX * pointerWeight * (orbitZ / (node.depthAmp + 1)) * 0.35;
      const disturbedY =
        orbitY +
        pointerOffsetY * pointerWeight * (orbitZ / (node.depthAmp + 1)) * 0.26 +
        Math.sin(theta * 1.7) * node.bobAmp;
      const x = centerX + disturbedX;
      const y =
        centerY +
        disturbedY;
      const z = orbitZ + (itemIsActive ? 42 : 0);
      const rotateY = Math.cos(theta + Math.PI / 8) * 18 + node.tiltBias + pointerOffsetX * pointerWeight * 0.22;
      const rotateX = Math.sin(phi + theta * 0.42) * -12 + pointerOffsetY * pointerWeight * -0.16;
      const scale = itemIsActive ? 1.08 : 0.9 + ((z + node.depthAmp) / (node.depthAmp * 2)) * 0.08;

      node.element.classList.toggle("is-active", itemIsActive);
      node.element.style.left = `${x}%`;
      node.element.style.top = `${y}%`;
      node.element.style.setProperty("--node-z", `${z}px`);
      node.element.style.setProperty("--node-rx", `${rotateX}deg`);
      node.element.style.setProperty("--node-ry", `${rotateY}deg`);
      node.element.style.setProperty("--node-scale", String(scale));
      node.element.style.zIndex = String(1000 + Math.round(z));

      return { x, y };
    });

    const lineElements = [...sceneConnections.querySelectorAll("[data-edge-index]")];
    sceneFallbackState.edges.forEach((edge, index) => {
      const line = lineElements[index];
      if (!line) return;
      const from = positions[edge[0]];
      const to = positions[edge[1]];
      line.setAttribute("x1", String(from.x));
      line.setAttribute("y1", String(from.y));
      line.setAttribute("x2", String(to.x));
      line.setAttribute("y2", String(to.y));
    });

    sceneFallbackAnimationId = window.requestAnimationFrame(animateSceneFallback);
  }

  function render() {
    const filteredItems = getFilteredItems();
    const categoryMeta = getCategoryMeta(activeCategory);
    const sceneItems = filteredItems.slice(0, 24);
    promptCount.textContent = String(items.length).padStart(2, "0");
    activeCategoryName.textContent = categoryMeta.name;
    resultMeta.textContent = `Showing ${filteredItems.length} of ${items.length} prompt records`;
    sceneRecordCount.textContent = `${sceneItems.length} active nodes`;
    renderCategoryFilters();
    renderCategorySummary();
    renderCards(filteredItems);
    renderSceneFallback(sceneItems);
    renderDetail(filteredItems);
    applySceneMode();
    applyThemeMode();
    window.dispatchEvent(
      new CustomEvent("prompt-records-update", {
        detail: {
          items: sceneItems.map((item) => ({
            id: item.id,
            title: item.title,
            summary: item.summary,
            category: getCategoryMeta(item.category).name,
            tags: item.tags || [],
            filename: item.filename,
          })),
          activeItemId,
          mode: sceneMode,
        },
      })
    );
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

  themeMatrixButton.addEventListener("click", () => {
    themeMode = "matrix";
    render();
  });

  themeKamiButton.addEventListener("click", () => {
    themeMode = "kami";
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

  window.addEventListener("prompt-record-selected", (event) => {
    const nextId = event.detail && event.detail.id;
    if (!nextId || nextId === activeItemId) return;
    activeItemId = nextId;
    render();
    openDrawer();
  });

  render();
})();

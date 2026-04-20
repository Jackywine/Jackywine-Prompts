(function () {
  const webglCanvas = document.getElementById("matrixWebgl");
  const fallbackCanvas = document.getElementById("matrixFallback");
  const matrixThreeCanvas = document.getElementById("matrixThree");
  const promptSceneCanvas = document.getElementById("promptThreeScene");
  if (!webglCanvas || !fallbackCanvas || !matrixThreeCanvas || !promptSceneCanvas) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let webglActive = false;
  let sceneMode = document.body.classList.contains("scene-3d") ? "3d" : "2d";
  let twoDReady = false;
  let threeReady = false;
  let refreshThreeLayout = function () {};

  function sizeCanvas(canvas, contextScale) {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.floor(window.innerWidth * ratio);
    const height = Math.floor(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    if (contextScale) {
      contextScale.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
  }

  function startWebgl() {
    const gl = webglCanvas.getContext("webgl", { antialias: false, alpha: true });
    if (!gl) return false;

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(
      vertexShader,
      `
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
      `
    );
    gl.compileShader(vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(
      fragmentShader,
      `
      precision mediump float;
      varying vec2 vUv;
      uniform float uTime;
      uniform vec2 uResolution;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float rainColumn(vec2 uv, float columnCount) {
        float x = floor(uv.x * columnCount);
        float speed = mix(0.2, 1.2, hash(vec2(x, 4.0)));
        float head = fract(1.0 - uv.y + uTime * speed * 0.12 + hash(vec2(x, 8.0)));
        float streak = smoothstep(0.0, 0.22, head) * (1.0 - smoothstep(0.22, 0.95, head));
        return streak;
      }

      void main() {
        vec2 uv = vUv;
        float columns = max(30.0, uResolution.x / 18.0);
        float glow = rainColumn(uv, columns);
        float scan = 0.08 * sin((uv.y + uTime * 0.06) * 150.0);
        float vignette = smoothstep(1.18, 0.25, distance(uv, vec2(0.5)));
        float symbol = step(0.6, hash(vec2(floor(uv.x * columns), floor((uv.y + uTime * 0.2) * 54.0))));
        float depth = 0.5 + 0.5 * sin(uTime * 0.35 + uv.x * 8.0);
        vec3 color = vec3(0.01, 0.09, 0.03);
        color += vec3(0.12, 0.95, 0.38) * glow * (0.5 + 0.5 * symbol) * mix(0.85, 1.2, depth);
        color += vec3(0.02, 0.18, 0.07) * scan;
        color *= vignette;
        gl_FragColor = vec4(color, 0.88);
      }
      `
    );
    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS) || !gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      return false;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      return false;
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const position = gl.getAttribLocation(program, "position");
    const timeLocation = gl.getUniformLocation(program, "uTime");
    const resolutionLocation = gl.getUniformLocation(program, "uResolution");

    function resize() {
      sizeCanvas(webglCanvas);
      gl.viewport(0, 0, webglCanvas.width, webglCanvas.height);
    }

    resize();
    window.addEventListener("resize", resize);
    webglActive = true;
    fallbackCanvas.style.display = "none";

    function frame(now) {
      if (!webglActive) return;
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(timeLocation, prefersReducedMotion ? 0.0 : now * 0.001);
      gl.uniform2f(resolutionLocation, webglCanvas.width, webglCanvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
    twoDReady = true;
    return true;
  }

  function startFallback() {
    const context = fallbackCanvas.getContext("2d");
    if (!context) return;

    const glyphs = "01アイウエオカキクケコサシスセソABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let columns = [];
    let fontSize = 16;
    let last = 0;

    function setup() {
      sizeCanvas(fallbackCanvas, context);
      fontSize = window.innerWidth < 640 ? 14 : 16;
      const columnCount = Math.ceil(window.innerWidth / fontSize);
      columns = Array.from({ length: columnCount }, () => Math.random() * -40);
      context.font = `${fontSize}px monospace`;
    }

    function draw(timestamp) {
      const delta = timestamp - last;
      const cadence = prefersReducedMotion ? 140 : 60;
      if (delta < cadence) {
        requestAnimationFrame(draw);
        return;
      }
      last = timestamp;

      context.fillStyle = "rgba(2, 5, 3, 0.18)";
      context.fillRect(0, 0, window.innerWidth, window.innerHeight);

      for (let index = 0; index < columns.length; index += 1) {
        const y = columns[index] * fontSize;
        const x = index * fontSize;
        const char = Math.random() > 0.992 ? "JACKYWINE" : glyphs[Math.floor(Math.random() * glyphs.length)];
        context.fillStyle = Math.random() > 0.96 ? "#d7ffe4" : "#69ff9d";
        context.fillText(char, x, y);
        if (y > window.innerHeight + Math.random() * 200 && Math.random() > 0.98) {
          columns[index] = 0;
        } else {
          columns[index] += 1;
        }
      }

      requestAnimationFrame(draw);
    }

    setup();
    window.addEventListener("resize", setup);
    requestAnimationFrame(draw);
    twoDReady = true;
  }

  function updateVisibleMode() {
    const showThree = sceneMode === "3d" && threeReady;
    webglCanvas.classList.toggle("is-hidden", showThree || !twoDReady);
    fallbackCanvas.classList.toggle("is-hidden", showThree || !twoDReady);
    matrixThreeCanvas.classList.toggle("is-hidden", !showThree);
  }

  function makePanelTexture(THREE, record, isActive) {
    const width = 768;
    const height = 448;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    const border = isActive ? "rgba(164, 255, 207, 0.95)" : "rgba(92, 255, 150, 0.4)";
    const fillTop = isActive ? "#082817" : "#05150c";
    const fillBottom = isActive ? "#031109" : "#020a05";

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, fillTop);
    gradient.addColorStop(1, fillBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = border;
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    ctx.fillStyle = "rgba(92, 255, 150, 0.08)";
    for (let i = 0; i < 9; i += 1) {
      ctx.fillRect(24, 52 + i * 42, width - 48, 1);
    }

    ctx.fillStyle = "#7dd99a";
    ctx.font = "22px monospace";
    ctx.fillText(record.category.toUpperCase(), 34, 44);

    ctx.fillStyle = isActive ? "#f0fff6" : "#dcffe8";
    ctx.font = "bold 42px monospace";
    wrapCanvasText(ctx, record.title, 34, 98, width - 68, 48, 3);

    ctx.fillStyle = "#bdf6cf";
    ctx.font = "24px monospace";
    wrapCanvasText(ctx, record.summary, 34, 220, width - 68, 32, 5);

    ctx.fillStyle = "#76c58e";
    ctx.font = "18px monospace";
    ctx.fillText(record.filename.toUpperCase(), 34, height - 54);

    const tags = (record.tags || []).slice(0, 4);
    let cursorX = 34;
    const tagY = height - 104;
    for (const tag of tags) {
      const text = tag.toUpperCase();
      const textWidth = ctx.measureText(text).width;
      const pillWidth = textWidth + 24;
      ctx.fillStyle = "rgba(92, 255, 150, 0.12)";
      roundRect(ctx, cursorX, tagY - 18, pillWidth, 34, 16);
      ctx.fill();
      ctx.strokeStyle = "rgba(92, 255, 150, 0.28)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, cursorX, tagY - 18, pillWidth, 34, 16);
      ctx.stroke();
      ctx.fillStyle = "#d9ffea";
      ctx.fillText(text, cursorX + 12, tagY + 4);
      cursorX += pillWidth + 10;
      if (cursorX > width - 180) break;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    return texture;
  }

  function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    const words = text.split(/\s+/);
    let line = "";
    let lines = 0;

    for (let index = 0; index < words.length; index += 1) {
      const candidate = line ? `${line} ${words[index]}` : words[index];
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate;
        continue;
      }

      ctx.fillText(line, x, y + lines * lineHeight);
      lines += 1;
      if (lines === maxLines - 1) {
        const tail = words.slice(index).join(" ");
        let clipped = tail;
        while (ctx.measureText(`${clipped}...`).width > maxWidth && clipped.length > 0) {
          clipped = clipped.slice(0, -1);
        }
        ctx.fillText(`${clipped}...`, x, y + lines * lineHeight);
        return;
      }
      line = words[index];
    }

    if (line && lines < maxLines) {
      ctx.fillText(line, x, y + lines * lineHeight);
    }
  }

  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

  function startThreeScene() {
    if (!window.THREE) return false;

    const THREE = window.THREE;
    const ambientRenderer = new THREE.WebGLRenderer({
      canvas: matrixThreeCanvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    ambientRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const ambientScene = new THREE.Scene();
    ambientScene.fog = new THREE.FogExp2(0x041108, 0.05);
    const ambientCamera = new THREE.PerspectiveCamera(52, 1, 0.1, 90);
    ambientCamera.position.set(0, 0.7, 8.5);
    ambientScene.add(new THREE.AmbientLight(0x77ffaa, 0.7));
    const ambientLight = new THREE.PointLight(0x55ff99, 1.4, 20, 2);
    ambientLight.position.set(0, 4, 4);
    ambientScene.add(ambientLight);

    const rainGroup = new THREE.Group();
    ambientScene.add(rainGroup);

    const barGeometry = new THREE.BoxGeometry(0.08, 1, 0.08);
    const rainBars = [];
    for (let index = 0; index < 170; index += 1) {
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.35, 0.95, THREE.MathUtils.randFloat(0.38, 0.64)),
        transparent: true,
        opacity: THREE.MathUtils.randFloat(0.24, 0.82),
      });
      const mesh = new THREE.Mesh(barGeometry, material);
      mesh.scale.y = THREE.MathUtils.randFloat(0.5, 2.7);
      mesh.position.set(
        THREE.MathUtils.randFloatSpread(11),
        THREE.MathUtils.randFloat(-6, 8),
        THREE.MathUtils.randFloatSpread(14)
      );
      rainGroup.add(mesh);
      rainBars.push({
        mesh,
        speed: THREE.MathUtils.randFloat(0.012, 0.04),
        drift: THREE.MathUtils.randFloat(-0.003, 0.003),
      });
    }

    const promptRenderer = new THREE.WebGLRenderer({
      canvas: promptSceneCanvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    promptRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const promptScene = new THREE.Scene();
    promptScene.fog = new THREE.FogExp2(0x041108, 0.09);

    const promptCamera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
    promptCamera.position.set(0, 0, 7.8);
    promptScene.add(new THREE.AmbientLight(0xaaffcc, 0.8));
    const keyLight = new THREE.PointLight(0x8cffb8, 1.4, 18, 2);
    keyLight.position.set(2.5, 2.8, 4);
    promptScene.add(keyLight);

    const promptGroup = new THREE.Group();
    promptScene.add(promptGroup);

    const planeGeometry = new THREE.PlaneGeometry(3.1, 1.82, 1, 1);
    const panelMeshes = [];
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(2, 2);
    const targetRotation = { x: -0.18, y: 0.12 };
    let orbitOffset = 0;
    let activeItemId = null;
    let viewportBounds = promptSceneCanvas.getBoundingClientRect();

    const starGeometry = new THREE.BufferGeometry();
    const starCount = 240;
    const starPositions = new Float32Array(starCount * 3);
    for (let index = 0; index < starCount; index += 1) {
      starPositions[index * 3] = THREE.MathUtils.randFloatSpread(16);
      starPositions[index * 3 + 1] = THREE.MathUtils.randFloatSpread(10);
      starPositions[index * 3 + 2] = THREE.MathUtils.randFloat(-8, -1.5);
    }
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0x86ffbb,
      size: 0.045,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    promptScene.add(stars);

    const selectionRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.08, 0.025, 12, 80),
      new THREE.MeshBasicMaterial({
        color: 0x85ffb6,
        transparent: true,
        opacity: 0.35,
      })
    );
    selectionRing.rotation.x = Math.PI / 2;
    selectionRing.position.z = -2.2;
    promptScene.add(selectionRing);

    function resize() {
      ambientRenderer.setSize(window.innerWidth, window.innerHeight, false);
      ambientCamera.aspect = window.innerWidth / window.innerHeight;
      ambientCamera.updateProjectionMatrix();

      viewportBounds = promptSceneCanvas.getBoundingClientRect();
      const width = Math.max(viewportBounds.width, 1);
      const height = Math.max(viewportBounds.height, 1);
      promptRenderer.setSize(width, height, false);
      promptCamera.aspect = width / height;
      promptCamera.updateProjectionMatrix();
    }

    refreshThreeLayout = resize;

    function disposeMesh(mesh) {
      if (mesh.material.map) {
        mesh.material.map.dispose();
      }
      mesh.material.dispose();
      promptGroup.remove(mesh);
    }

    function syncPanels(records, nextActiveId) {
      while (panelMeshes.length) {
        disposeMesh(panelMeshes.pop());
      }

      activeItemId = nextActiveId;
      const count = records.length || 1;
      const spacingY = window.innerWidth < 720 ? 1.9 : 1.4;
      const depthWave = window.innerWidth < 720 ? 0.35 : 0.7;

      records.forEach((record, index) => {
        const texture = makePanelTexture(THREE, record, record.id === activeItemId);
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          opacity: 0.98,
        });
        const mesh = new THREE.Mesh(planeGeometry, material);
        mesh.userData.id = record.id;
        mesh.userData.baseY = (index - (count - 1) / 2) * -spacingY;
        mesh.userData.baseZ = Math.sin(index * 0.55) * depthWave;
        mesh.userData.baseX = Math.cos(index * 0.35) * 0.45;
        mesh.userData.order = index;
        promptGroup.add(mesh);
        panelMeshes.push(mesh);
      });
    }

    function updatePanelTransforms(force) {
      panelMeshes.forEach((mesh) => {
        const focus = mesh.userData.id === activeItemId ? 1 : 0;
        const y = mesh.userData.baseY + orbitOffset * 1.12;
        mesh.position.x = mesh.userData.baseX + focus * 0.22;
        mesh.position.y = y;
        mesh.position.z = mesh.userData.baseZ + focus * 0.8;
        mesh.rotation.y = THREE.MathUtils.degToRad(mesh.position.y * -2.8 + (focus ? 3 : 0));
        mesh.rotation.x = THREE.MathUtils.degToRad(mesh.position.y * -1.6);
        const scale = focus ? 1.08 : 0.93;
        mesh.scale.setScalar(scale);
        if (force) {
          mesh.material.opacity = focus ? 1 : 0.82;
        }
      });
    }

    function selectByOffset(direction) {
      if (!panelMeshes.length) return;
      const currentIndex = Math.max(
        panelMeshes.findIndex((mesh) => mesh.userData.id === activeItemId),
        0
      );
      const nextIndex = THREE.MathUtils.clamp(currentIndex + direction, 0, panelMeshes.length - 1);
      const nextMesh = panelMeshes[nextIndex];
      if (!nextMesh || nextMesh.userData.id === activeItemId) return;
      activeItemId = nextMesh.userData.id;
      orbitOffset = -nextMesh.userData.baseY / 1.12;
      window.dispatchEvent(new CustomEvent("prompt-record-selected", { detail: { id: activeItemId } }));
    }

    promptSceneCanvas.addEventListener("pointermove", (event) => {
      viewportBounds = promptSceneCanvas.getBoundingClientRect();
      pointer.x = ((event.clientX - viewportBounds.left) / viewportBounds.width) * 2 - 1;
      pointer.y = -((event.clientY - viewportBounds.top) / viewportBounds.height) * 2 + 1;
      targetRotation.y = pointer.x * 0.22;
      targetRotation.x = pointer.y * 0.08 - 0.16;
    });

    promptSceneCanvas.addEventListener("pointerleave", () => {
      pointer.x = 2;
      pointer.y = 2;
      targetRotation.x = -0.18;
      targetRotation.y = 0.12;
    });

    promptSceneCanvas.addEventListener("click", () => {
      raycaster.setFromCamera(pointer, promptCamera);
      const hits = raycaster.intersectObjects(panelMeshes);
      if (!hits.length) return;
      const hit = hits[0].object;
      activeItemId = hit.userData.id;
      orbitOffset = -hit.userData.baseY / 1.12;
      window.dispatchEvent(new CustomEvent("prompt-record-selected", { detail: { id: activeItemId } }));
    });

    promptSceneCanvas.addEventListener(
      "wheel",
      (event) => {
        if (sceneMode !== "3d") return;
        event.preventDefault();
        selectByOffset(event.deltaY > 0 ? 1 : -1);
      },
      { passive: false }
    );

    window.addEventListener("keydown", (event) => {
      if (sceneMode !== "3d") return;
      if (event.key === "ArrowDown" || event.key === "PageDown") {
        selectByOffset(1);
      }
      if (event.key === "ArrowUp" || event.key === "PageUp") {
        selectByOffset(-1);
      }
    });

    window.addEventListener("resize", resize);
    window.addEventListener("prompt-records-update", (event) => {
      const detail = event.detail || {};
      syncPanels(detail.items || [], detail.activeItemId || null);
      activeItemId = detail.activeItemId || null;
      const activeMesh = panelMeshes.find((mesh) => mesh.userData.id === activeItemId);
      orbitOffset = activeMesh ? -activeMesh.userData.baseY / 1.12 : 0;
      updatePanelTransforms(true);
    });

    resize();
    threeReady = true;

    function animate() {
      for (const bar of rainBars) {
        bar.mesh.position.y -= prefersReducedMotion ? 0.004 : bar.speed;
        bar.mesh.position.x += bar.drift;
        if (bar.mesh.position.y < -8) {
          bar.mesh.position.y = 8;
          bar.mesh.position.x = THREE.MathUtils.randFloatSpread(11);
          bar.mesh.position.z = THREE.MathUtils.randFloatSpread(14);
        }
        if (Math.abs(bar.mesh.position.x) > 6.5) {
          bar.drift *= -1;
        }
      }

      rainGroup.rotation.y *= 0.96;
      rainGroup.rotation.y += targetRotation.y * 0.04;
      ambientCamera.position.x += (targetRotation.y * 1.6 - ambientCamera.position.x) * 0.05;
      ambientCamera.position.y += (-targetRotation.x * 1.6 + 0.7 - ambientCamera.position.y) * 0.05;
      ambientCamera.lookAt(0, 0.2, 0);
      ambientRenderer.render(ambientScene, ambientCamera);

      if (sceneMode === "3d") {
        promptGroup.rotation.x += (targetRotation.x - promptGroup.rotation.x) * 0.06;
        promptGroup.rotation.y += (targetRotation.y - promptGroup.rotation.y) * 0.06;
        stars.rotation.y += prefersReducedMotion ? 0.0005 : 0.0014;
        selectionRing.rotation.z += prefersReducedMotion ? 0.0008 : 0.0022;

        panelMeshes.forEach((mesh) => {
          const focus = mesh.userData.id === activeItemId ? 1 : 0;
          const targetOpacity = focus ? 1 : 0.78;
          mesh.material.opacity += (targetOpacity - mesh.material.opacity) * 0.12;
        });

        updatePanelTransforms(false);
        promptRenderer.render(promptScene, promptCamera);
      } else {
        promptRenderer.clear();
      }

      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
    return true;
  }

  if (!startWebgl()) {
    webglCanvas.style.display = "none";
    fallbackCanvas.style.display = "block";
    startFallback();
  }

  startThreeScene();
  updateVisibleMode();

  window.addEventListener("prompt-scene-mode-change", (event) => {
    sceneMode = event.detail && event.detail.mode === "3d" ? "3d" : "2d";
    updateVisibleMode();
    requestAnimationFrame(refreshThreeLayout);
  });
})();

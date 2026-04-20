(function () {
  const webglCanvas = document.getElementById("matrixWebgl");
  const fallbackCanvas = document.getElementById("matrixFallback");
  const threeCanvas = document.getElementById("matrixThree");
  if (!webglCanvas || !fallbackCanvas || !threeCanvas) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let webglActive = false;
  let sceneMode = document.body.classList.contains("scene-3d") ? "3d" : "2d";
  let twoDReady = false;
  let threeReady = false;
  let threeState = null;

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
      const speed = sceneMode === "3d" ? 1.45 : 1.0;
      gl.uniform1f(timeLocation, prefersReducedMotion ? 0.0 : now * 0.001 * speed);
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
    let columnCount = 0;
    let fontSize = 16;
    let last = 0;

    function setup() {
      sizeCanvas(fallbackCanvas, context);
      fontSize = window.innerWidth < 640 ? 14 : 16;
      columnCount = Math.ceil(window.innerWidth / fontSize);
      columns = Array.from({ length: columnCount }, () => Math.random() * -40);
      context.font = `${fontSize}px monospace`;
    }

    function draw(timestamp) {
      const delta = timestamp - last;
      const cadence = sceneMode === "3d" ? 44 : 60;
      if (delta < (prefersReducedMotion ? 140 : cadence)) {
        requestAnimationFrame(draw);
        return;
      }
      last = timestamp;

      context.fillStyle = "rgba(2, 5, 3, 0.18)";
      context.fillRect(0, 0, window.innerWidth, window.innerHeight);
      context.fillStyle = "#69ff9d";

      for (let index = 0; index < columns.length; index += 1) {
        const y = columns[index] * fontSize;
        const x = index * fontSize;
        const burstChance = sceneMode === "3d" ? 0.985 : 0.992;
        const char = Math.random() > burstChance ? "JACKYWINE" : glyphs[Math.floor(Math.random() * glyphs.length)];
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
    threeCanvas.classList.toggle("is-hidden", !showThree);
  }

  function startThreeScene() {
    if (!window.THREE) return false;

    const THREE = window.THREE;
    const renderer = new THREE.WebGLRenderer({
      canvas: threeCanvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x041108, 0.045);

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 80);
    camera.position.set(0, 0.8, 7.2);

    const ambient = new THREE.AmbientLight(0x88ffbb, 0.65);
    const point = new THREE.PointLight(0x55ff99, 1.4, 18, 2);
    point.position.set(0, 4, 3);
    scene.add(ambient, point);

    const group = new THREE.Group();
    scene.add(group);

    const bars = [];
    const barGeometry = new THREE.BoxGeometry(0.08, 1, 0.08);
    for (let index = 0; index < 180; index += 1) {
      const height = THREE.MathUtils.randFloat(0.5, 2.8);
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.35, 0.95, THREE.MathUtils.randFloat(0.38, 0.62)),
        transparent: true,
        opacity: THREE.MathUtils.randFloat(0.28, 0.92),
      });
      const mesh = new THREE.Mesh(barGeometry, material);
      mesh.scale.y = height;
      mesh.position.set(
        THREE.MathUtils.randFloatSpread(11),
        THREE.MathUtils.randFloat(-6, 8),
        THREE.MathUtils.randFloatSpread(14)
      );
      group.add(mesh);
      bars.push({
        mesh,
        speed: THREE.MathUtils.randFloat(0.012, 0.045),
        drift: THREE.MathUtils.randFloat(-0.004, 0.004),
      });
    }

    const particleCount = 900;
    const positions = new Float32Array(particleCount * 3);
    const alphas = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i += 1) {
      positions[i * 3] = THREE.MathUtils.randFloatSpread(12);
      positions[i * 3 + 1] = THREE.MathUtils.randFloat(-7, 8);
      positions[i * 3 + 2] = THREE.MathUtils.randFloatSpread(16);
      alphas[i] = THREE.MathUtils.randFloat(0.25, 1);
    }

    const particles = new THREE.BufferGeometry();
    particles.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particles.setAttribute("alpha", new THREE.BufferAttribute(alphas, 1));

    const particleMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uSize: { value: prefersReducedMotion ? 2.2 : 3.4 },
      },
      vertexShader: `
        attribute float alpha;
        varying float vAlpha;
        uniform float uSize;
        void main() {
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uSize * (12.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float strength = smoothstep(0.25, 0.0, length(uv));
          vec3 color = mix(vec3(0.12, 0.95, 0.45), vec3(0.85, 1.0, 0.9), strength);
          gl_FragColor = vec4(color, strength * vAlpha);
        }
      `,
    });

    const pointCloud = new THREE.Points(particles, particleMaterial);
    scene.add(pointCloud);

    function resize() {
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    }

    resize();
    window.addEventListener("resize", resize);

    const mouse = { x: 0, y: 0 };
    window.addEventListener("pointermove", (event) => {
      mouse.x = event.clientX / window.innerWidth - 0.5;
      mouse.y = event.clientY / window.innerHeight - 0.5;
    });

    function animate() {
      if (!threeState || sceneMode !== "3d") {
        requestAnimationFrame(animate);
        return;
      }

      for (const bar of bars) {
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

      const particlePositions = particles.attributes.position.array;
      for (let i = 0; i < particleCount; i += 1) {
        particlePositions[i * 3 + 1] -= prefersReducedMotion ? 0.01 : 0.03;
        if (particlePositions[i * 3 + 1] < -7) {
          particlePositions[i * 3 + 1] = 8;
          particlePositions[i * 3] = THREE.MathUtils.randFloatSpread(12);
          particlePositions[i * 3 + 2] = THREE.MathUtils.randFloatSpread(16);
        }
      }
      particles.attributes.position.needsUpdate = true;

      group.rotation.y = mouse.x * 0.35;
      group.rotation.x = -mouse.y * 0.18;
      pointCloud.rotation.y += prefersReducedMotion ? 0.0008 : 0.0018;
      camera.position.x += (mouse.x * 1.3 - camera.position.x) * 0.04;
      camera.position.y += (mouse.y * -0.8 + 0.8 - camera.position.y) * 0.04;
      camera.lookAt(0, 0.2, 0);

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    threeState = { renderer };
    threeReady = true;
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
  });
})();

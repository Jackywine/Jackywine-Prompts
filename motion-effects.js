import { animate, stagger } from "https://cdn.jsdelivr.net/npm/motion@12.23.24/+esm";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function stopAnimations(target) {
  if (!target) return;
  target.getAnimations?.().forEach((animation) => animation.cancel());
}

function animateLanding() {
  const blocks = document.querySelectorAll(
    ".hero-block, .search-panel, .summary-panel, .toolbar, .wall-shell"
  );
  if (!blocks.length) return;
  if (prefersReducedMotion) {
    blocks.forEach((block) => {
      block.style.opacity = "1";
      block.style.transform = "none";
    });
    return;
  }
  animate(
    blocks,
    { opacity: [0, 1], transform: ["translateY(18px)", "translateY(0px)"] },
    { duration: 0.55, delay: stagger(0.05), easing: [0.22, 1, 0.36, 1] }
  );
}

function animateWall(_container, cards) {
  if (!cards || !cards.length) return;
  const items = Array.from(cards);
  items.forEach((card) => {
    stopAnimations(card);
    card.style.willChange = "transform, opacity";
  });

  if (prefersReducedMotion) {
    items.forEach((card) => {
      card.style.opacity = "1";
      card.style.transform = "none";
    });
    return;
  }

  animate(
    items,
    {
      opacity: [0, 1],
      transform: ["translateY(16px) scale(0.985)", "translateY(0px) scale(1)"],
      filter: ["blur(8px)", "blur(0px)"],
    },
    {
      duration: 0.42,
      delay: stagger(0.018, { from: "first" }),
      easing: [0.22, 1, 0.36, 1],
    }
  );
}

function openDrawer(drawer, backdrop, dismissButton) {
  [drawer, backdrop, dismissButton].forEach(stopAnimations);
  if (prefersReducedMotion) return;

  animate(backdrop, { opacity: [0, 1] }, { duration: 0.22, easing: "ease-out" });
  animate(
    drawer,
    {
      opacity: [0, 1],
      transform: ["translateX(28px) scale(0.985)", "translateX(0px) scale(1)"],
    },
    { duration: 0.34, easing: [0.22, 1, 0.36, 1] }
  );
  if (dismissButton && !dismissButton.classList.contains("is-hidden")) {
    animate(
      dismissButton,
      { opacity: [0, 1], transform: ["translateY(-6px)", "translateY(0px)"] },
      { duration: 0.22, easing: "ease-out" }
    );
  }
}

async function closeDrawer(drawer, backdrop, dismissButton) {
  [drawer, backdrop, dismissButton].forEach(stopAnimations);
  if (prefersReducedMotion) return;

  const animations = [
    animate(backdrop, { opacity: [1, 0] }, { duration: 0.18, easing: "ease-in" }).finished,
    animate(
      drawer,
      {
        opacity: [1, 0],
        transform: ["translateX(0px) scale(1)", "translateX(22px) scale(0.99)"],
      },
      { duration: 0.22, easing: "ease-in" }
    ).finished,
  ];

  if (dismissButton && !dismissButton.classList.contains("is-hidden")) {
    animations.push(
      animate(
        dismissButton,
        { opacity: [1, 0], transform: ["translateY(0px)", "translateY(-6px)"] },
        { duration: 0.14, easing: "ease-in" }
      ).finished
    );
  }

  await Promise.allSettled(animations);
}

function animateModeSwitch(button) {
  if (!button || prefersReducedMotion) return;
  stopAnimations(button);
  animate(
    button,
    { transform: ["scale(0.96)", "scale(1.05)", "scale(1)"] },
    { duration: 0.24, easing: [0.34, 1.56, 0.64, 1] }
  );
}

window.promptMotion = {
  animateWall,
  openDrawer,
  closeDrawer,
  animateModeSwitch,
};

window.addEventListener("DOMContentLoaded", () => {
  animateLanding();

  document.getElementById("mode2dButton")?.addEventListener("click", (event) => {
    animateModeSwitch(event.currentTarget);
  });

  document.getElementById("mode3dButton")?.addEventListener("click", (event) => {
    animateModeSwitch(event.currentTarget);
  });
});

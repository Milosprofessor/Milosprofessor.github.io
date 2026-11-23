/* Progressive enhancement only. Site remains fully usable without JS. */
(() => {
  "use strict";
  const root = document.documentElement;
  const revealItems = [...document.querySelectorAll(".reveal")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const header = document.querySelector(".site-header");

  const updateHeader = () => {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 18);
  };
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    revealItems.forEach(item => item.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -25px 0px", threshold: 0.07 });
    revealItems.forEach(item => observer.observe(item));
  }
  root.classList.add("js-ready");

  const illustration = document.querySelector(".hero-art");
  if (!illustration || reducedMotion.matches ||
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  let frame = 0;
  let targetX = 0;
  let targetY = 0;
  const applyMotion = () => {
    illustration.style.setProperty("--px", targetX.toFixed(1) + "px");
    illustration.style.setProperty("--py", targetY.toFixed(1) + "px");
    frame = 0;
  };
  illustration.addEventListener("pointermove", event => {
    const r = illustration.getBoundingClientRect();
    targetX = ((event.clientX - r.left) / r.width - .5) * 19;
    targetY = ((event.clientY - r.top) / r.height - .5) * 19;
    if (!frame) frame = requestAnimationFrame(applyMotion);
  }, { passive: true });
  illustration.addEventListener("pointerleave", () => {
    targetX = 0;
    targetY = 0;
    if (!frame) frame = requestAnimationFrame(applyMotion);
  });
  window.addEventListener("pagehide", () => {
    if (frame) cancelAnimationFrame(frame);
  }, { once: true });
})();

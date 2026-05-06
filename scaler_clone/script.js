// ── Sticky header shadow ───────────────────────────────────────────────────
const header = document.getElementById("header");
window.addEventListener("scroll", () => {
  header.classList.toggle("scrolled", window.scrollY > 10);
});

// ── Hamburger menu ─────────────────────────────────────────────────────────
const hamburger = document.getElementById("hamburger");
const nav = document.getElementById("nav");
hamburger.addEventListener("click", () => {
  hamburger.classList.toggle("open");
  nav.classList.toggle("open");
});

// ── Stat counter animation ─────────────────────────────────────────────────
function animateCounter(el) {
  const target = +el.dataset.target;
  const duration = 1800;
  const step = target / (duration / 16);
  let current = 0;
  const id = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = Math.floor(current).toLocaleString();
    if (current >= target) clearInterval(id);
  }, 16);
}

// ── IntersectionObserver for fade-up + counters ────────────────────────────
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.15 }
);

// Counter observer (fires once)
const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.5 }
);

document.querySelectorAll(".fade-up").forEach((el) => observer.observe(el));
document.querySelectorAll("[data-target]").forEach((el) => counterObserver.observe(el));

// ── Staggered card reveal ──────────────────────────────────────────────────
const cardObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const cards = entry.target.querySelectorAll(
        ".prog-card, .testimonial-card, .company-pill"
      );
      cards.forEach((card, i) => {
        card.style.transitionDelay = `${i * 80}ms`;
        card.classList.add("fade-up");
        setTimeout(() => card.classList.add("visible"), 50 + i * 80);
      });
      cardObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.1 }
);

document.querySelectorAll(".prog-grid, .testimonial-grid, .companies__logos").forEach((el) =>
  cardObserver.observe(el)
);

// ── Smooth scroll for nav links ────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const target = document.querySelector(a.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    nav.classList.remove("open");
    hamburger.classList.remove("open");
  });
});

// ── Fade-up hero content on load ───────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  const heroItems = document.querySelectorAll(
    ".hero__badge, .hero__title, .hero__sub, .hero__btns, .hero__stats"
  );
  heroItems.forEach((el, i) => {
    el.classList.add("fade-up");
    setTimeout(() => el.classList.add("visible"), 100 + i * 120);
  });

  // Also trigger counter for any stat already in view
  document.querySelectorAll("[data-target]").forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) animateCounter(el);
  });
});

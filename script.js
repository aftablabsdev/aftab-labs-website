const header = document.querySelector("[data-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const navMenu = document.querySelector("[data-nav-menu]");
const year = document.querySelector("[data-year]");
const productMenus = document.querySelectorAll("[data-product-menu]");

if (year) {
  year.textContent = new Date().getFullYear();
}

const closeMenu = () => {
  if (!navToggle || !navMenu) return;

  navToggle.setAttribute("aria-expanded", "false");
  navMenu.classList.remove("is-open");
  document.body.classList.remove("nav-open");
  productMenus.forEach((menu) => menu.removeAttribute("open"));
};

if (navToggle && navMenu) {
  navToggle.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";

    navToggle.setAttribute("aria-expanded", String(!isOpen));
    navMenu.classList.toggle("is-open", !isOpen);
    document.body.classList.toggle("nav-open", !isOpen);
  });

  navMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });
}

productMenus.forEach((menu) => {
  menu.addEventListener("toggle", () => {
    if (!menu.open) return;
    productMenus.forEach((otherMenu) => {
      if (otherMenu !== menu) otherMenu.removeAttribute("open");
    });
  });
});

document.addEventListener("click", (event) => {
  productMenus.forEach((menu) => {
    if (menu.open && !menu.contains(event.target)) menu.removeAttribute("open");
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  productMenus.forEach((menu) => menu.removeAttribute("open"));
  closeMenu();
});

const updateHeader = () => {
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 12);
};

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (event) => {
    const targetId = anchor.getAttribute("href");

    if (!targetId || targetId === "#") return;

    const target = document.querySelector(targetId);
    if (!target) return;

    event.preventDefault();
    closeMenu();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.16 }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const contactForm = document.querySelector("[data-contact-form]");
const formStatus = document.querySelector("[data-form-status]");

if (contactForm && formStatus) {
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    formStatus.textContent = "Sending your enquiry…";
    const submitButton = contactForm.querySelector("button[type=submit]");
    if (submitButton) submitButton.disabled = true;

    try {
      const response = await fetch(contactForm.action, {
        method: "POST",
        headers: { "Accept": "application/json" },
        body: new FormData(contactForm),
      });
      const result = await response.json();
      formStatus.textContent = response.ok ? result.message : (result.error || "We could not send your enquiry. Please email us directly.");
      if (response.ok) contactForm.reset();
    } catch {
      formStatus.textContent = "We could not send your enquiry. Please email info@aftablabs.com directly.";
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

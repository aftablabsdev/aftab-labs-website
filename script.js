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

const contactForm = document.querySelector("[data-contact-form]");
const formStatus = document.querySelector("[data-form-status]");

if (contactForm && formStatus) {
  const resetTurnstile = () => {
    const widget = contactForm.querySelector(".cf-turnstile");
    if (widget && window.turnstile && typeof window.turnstile.reset === "function") {
      window.turnstile.reset(widget);
    }
  };

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(contactForm);
    if (!formData.get("cf-turnstile-response")) {
      formStatus.dataset.state = "error";
      formStatus.textContent = "Please complete the security check before sending your enquiry.";
      return;
    }

    formStatus.dataset.state = "pending";
    formStatus.textContent = "Sending your enquiry…";
    const submitButton = contactForm.querySelector("button[type=submit]");
    if (submitButton) submitButton.disabled = true;

    try {
      const response = await fetch(contactForm.action, {
        method: "POST",
        headers: { "Accept": "application/json" },
        body: formData,
      });
      const result = await response.json().catch(() => ({}));
      formStatus.dataset.state = response.ok ? "success" : "error";
      formStatus.textContent = response.ok ? result.message : (result.error || "We could not send your enquiry. Please email us directly.");
      if (response.ok) contactForm.reset();
    } catch {
      formStatus.dataset.state = "error";
      formStatus.textContent = "We could not send your enquiry. Please email info@aftablabs.com directly.";
    } finally {
      resetTurnstile();
      if (submitButton) submitButton.disabled = false;
    }
  });
}

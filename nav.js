// Hamburger menu, shared by all pages.
(function () {
  // Only does anything below the 640px breakpoint where styles.css hides
  // .nav-links and shows .nav-toggle.
  const toggle = document.getElementById("navToggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    function setOpen(open) {
      links.classList.toggle("open", open);
      toggle.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }
    toggle.addEventListener("click", () => setOpen(!links.classList.contains("open")));
    // Close after picking a link, and on resize back up to desktop width.
    links.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setOpen(false)));
    window.addEventListener("resize", () => {
      if (window.innerWidth > 640) setOpen(false);
    });
  }
})();

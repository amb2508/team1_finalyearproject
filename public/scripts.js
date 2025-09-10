const sidebar = document.getElementById("SID");
const btnClose = document.getElementById("btn");
const btnOpen = document.getElementById("btn2");
const links = document.querySelectorAll(".sidebar a");
const placardContainer = document.getElementById("placard-container");

// Toggle sidebar
btnClose.addEventListener("click", () => {
  sidebar.classList.add("sidebar-hidden");
});
btnOpen.addEventListener("click", () => {
  sidebar.classList.remove("sidebar-hidden");
});

// Show batches for selected section
links.forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    const section = link.dataset.section;
    if (!section) return;

    // Clear old placards
    placardContainer.innerHTML = "";

    // Add 3 clickable placards linking to Documents.html
    for (let i = 1; i <= 3; i++) {
      const anchor = document.createElement("a");
      anchor.href = "Documents.html"; // ✅ Always goes to this page
      anchor.style.textDecoration = "none";
      anchor.style.color = "inherit";

      const placard = document.createElement("div");
      placard.classList.add("placard");
      placard.textContent = `${section.toUpperCase()} - Batch ${i}`;

      anchor.appendChild(placard);
      placardContainer.appendChild(anchor);
    }
  });
});

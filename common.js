/* =====================================================================
   common.js  -  small helpers used by BOTH pages
   ===================================================================== */

// THEME BUTTON (black <-> white). We add/remove the word "light" on <body>.
// style.css changes the colors when it sees that word. The choice is saved
// in localStorage (the browser's small memory) so it stays after refresh.
function setupTheme() {
  const button = document.getElementById("themeBtn");
  const refresh = () => {
    button.textContent = document.body.classList.contains("light") ? "🌙 Black" : "☀️ White";
  };
  if (localStorage.getItem("theme") === "light") document.body.classList.add("light");
  refresh();
  button.onclick = function () {
    document.body.classList.toggle("light");
    localStorage.setItem("theme", document.body.classList.contains("light") ? "light" : "dark");
    refresh();
  };
}

// Get the list of chapters from the Oracle database, sorted by title.
// "numeric: true" makes "Chapter 2" come before "Chapter 10".
async function getChapters() {
  const response = await fetch(API_BASE + "posts/");
  if (!response.ok) throw new Error("The database answered with error " + response.status);
  const data = await response.json();
  return (data.items || []).sort((a, b) =>
    (a.post_title || "").localeCompare(b.post_title || "", undefined, { numeric: true }));
}

// The web address of the PDF for one chapter.
function pdfUrl(chapter) {
  return chapter.download_url || API_BASE + "download/" + chapter.post_id;
}

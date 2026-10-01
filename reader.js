/* =====================================================================
   reader.js  -  makes the READER PAGE work
   Each chapter is a PDF in Oracle. We open it with PDF.js and draw every
   page on a <canvas> (a drawing board). Pages are only drawn when you
   scroll near them, so big PDFs stay fast.
   ===================================================================== */

setupTheme();
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const reader = document.getElementById("reader");
const select = document.getElementById("chapterSelect");
let chapters = [];   // chapter info from the database
let sections = [];   // one <section> per chapter (same order)
const pageInfo = new Map();   // remembers which PDF page belongs to which canvas

// ---- 1) WATCHERS ("observers") that tell us when something is near the screen ----
// Chapter watcher: when a chapter comes near, open its PDF.
const chapterWatcher = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      chapterWatcher.unobserve(entry.target);   // only once
      openChapter(entry.target);
    }
  });
}, { rootMargin: "100% 0px" });                 // "near" = within one screen height

// Page watcher: when a page canvas comes near, draw it.
const pageWatcher = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      pageWatcher.unobserve(entry.target);
      drawPage(entry.target);
    }
  });
}, { rootMargin: "150% 0px" });

// ---- 2) BUILD THE PAGE ----------------------------------------------
async function buildReader() {
  try { chapters = await getChapters(); }
  catch (err) { reader.textContent = "Could not load chapters: " + err.message; return; }

  if (chapters.length === 0) { reader.textContent = "No chapters uploaded yet."; return; }

  chapters.forEach((chapter, index) => {
    const title = chapter.post_title || "Untitled";

    const section = document.createElement("section");
    section.className = "chapter";                 // has a tall empty height until loaded
    section.dataset.url = pdfUrl(chapter);

    const pages = document.createElement("div");   // the pages will be put here
    pages.className = "pages";
    pages.textContent = "Loading " + title + "...";
    section.appendChild(pages);

    // Chapter name shown at the END of the chapter.
    const end = document.createElement("div");
    end.className = "chapter-end";
    end.textContent = "— End of " + title + " —";
    section.appendChild(end);

    reader.appendChild(section);
    sections.push(section);
    chapterWatcher.observe(section);

    // Add the chapter to the dropdown list.
    const option = document.createElement("option");
    option.value = index;
    option.textContent = title;
    select.appendChild(option);
  });

  // If we came from the home page, jump to the chosen chapter.
  const wanted = new URLSearchParams(location.search).get("id");
  const index = chapters.findIndex(c => String(c.post_id) === wanted);
  if (index > -1) goToChapter(index, false);
}

// ---- 3) OPEN ONE CHAPTER (read its PDF) -----------------------------
async function openChapter(section) {
  const holder = section.querySelector(".pages");
  try {
    const pdf = await pdfjsLib.getDocument({ url: section.dataset.url, disableRange: true }).promise;
    holder.textContent = "";

    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const size = page.getViewport({ scale: 1 });

      // Make an empty canvas with the right shape, so the page does not jump later.
      const canvas = document.createElement("canvas");
      canvas.style.aspectRatio = size.width + " / " + size.height;
      pageInfo.set(canvas, { page: page });
      holder.appendChild(canvas);
      pageWatcher.observe(canvas);
    }
    section.classList.add("loaded");   // remove the tall empty height
  } catch (err) {
    holder.textContent = "Could not open this PDF: " + err.message;
  }
}

// ---- 4) DRAW ONE PAGE -----------------------------------------------
async function drawPage(canvas) {
  const page = pageInfo.get(canvas).page;
  const base = page.getViewport({ scale: 1 });
  // Scale so the picture is sharp on this screen (but not too heavy: max 3x).
  const scale = Math.min(3, (canvas.clientWidth || 800) * (window.devicePixelRatio || 1) / base.width);
  const viewport = page.getViewport({ scale: scale });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext("2d"), viewport: viewport }).promise;
}

// ---- 5) JUMP TO A CHAPTER -------------------------------------------
function goToChapter(index, smooth = true) {
  if (index < 0 || index >= sections.length) return;   // out of range, do nothing
  sections[index].scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
}

// Which chapter is on screen now? The last one whose top has passed the top edge.
function currentChapter() {
  let current = 0;
  sections.forEach((s, i) => { if (s.getBoundingClientRect().top <= 80) current = i; });
  return current;
}

// ---- 6) CONTROLS ----------------------------------------------------
select.onchange = () => goToChapter(Number(select.value));

// Keep the dropdown showing the chapter you are reading.
let waiting = false;
window.addEventListener("scroll", () => {
  if (waiting) return;                 // at most once per screen frame (keeps it smooth)
  waiting = true;
  requestAnimationFrame(() => { select.value = currentChapter(); waiting = false; });
});

// Left / Right arrow keys = previous / next chapter.
document.addEventListener("keydown", e => {
  if (e.key === "ArrowRight") goToChapter(currentChapter() + 1);
  if (e.key === "ArrowLeft")  goToChapter(currentChapter() - 1);
});

// Tap/click on the manga = scroll down a little (80% of the screen).
reader.addEventListener("click", () => {
  window.scrollBy({ top: window.innerHeight * 0.8, behavior: "smooth" });
});

// Bottom right arrows: very top / very bottom.
document.getElementById("toTop").onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
document.getElementById("toEnd").onclick = () =>
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });

buildReader();

/* HOW TO IMPROVE: remember the last page you read (localStorage),
   add a "next chapter" button at each chapter end, or add zoom. */

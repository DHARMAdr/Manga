/* =====================================================================
   home.js  -  makes the HOME PAGE work
   1) shows the chapter list from Oracle   2) uploads PDFs to Oracle
   ===================================================================== */

setupTheme();

const listBox  = document.getElementById("chapterList");
const statusEl = document.getElementById("status");

// ---- 1) SHOW CHAPTERS ------------------------------------------------
async function showChapters() {
  listBox.textContent = "Loading...";
  try {
    const chapters = await getChapters();   // already sorted by title
    listBox.textContent = chapters.length ? "" : "No chapters yet. Upload a PDF above!";

    chapters.forEach(chapter => {
      const link = document.createElement("a");
      link.className = "chapter-card";
      link.textContent = chapter.post_title || "Untitled";   // textContent is safe (no HTML tricks)
      link.href = "reader.html?id=" + encodeURIComponent(chapter.post_id);
      listBox.appendChild(link);
    });
  } catch (err) {
    listBox.textContent = "Could not load chapters: " + err.message +
      ". Open the browser console (F12) to see more.";
  }
}

// ---- 2) UPLOAD -------------------------------------------------------
// This runs when the Upload button is clicked.
// (The old file had no click handler, so the button did nothing.)
document.getElementById("uploadBtn").onclick = async function () {
  const typedTitle = document.getElementById("title").value.trim();
  const files = [...document.getElementById("files").files];

  if (files.length === 0) { statusEl.textContent = "Please choose a PDF first."; return; }

  let done = 0;
  for (const file of files) {
    if (!/\.pdf$/i.test(file.name)) {
      statusEl.textContent = "Skipped " + file.name + " (only PDF files work).";
      continue;
    }

    // Title: what you typed (only if ONE file), else the file name without ".pdf".
    const title = (files.length === 1 && typedTitle) ? typedTitle : file.name.replace(/\.pdf$/i, "");

    // The name and title travel in the web address (after the "?").
    // encodeURIComponent makes spaces and symbols safe. Oracle decodes them for us.
    const url = API_BASE + "upload/?title=" + encodeURIComponent(title) +
                "&file_name=" + encodeURIComponent(file.name);

    statusEl.textContent = "Uploading " + file.name + " (" + (done + 1) + " of " + files.length + ")...";
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" }, // "raw file data"
        body: file
      });
      if (!response.ok) {
        statusEl.textContent = "Upload failed (error " + response.status + "). See the steps in oracle-setup.sql.";
        return;
      }
      done++;
    } catch (err) {
      // A network error here is almost always CORS (see step 3 in oracle-setup.sql).
      statusEl.textContent = "Network/CORS error: " + err.message;
      return;
    }
  }

  statusEl.textContent = "Done! Uploaded " + done + " file(s) ✅";
  showChapters();   // refresh the list
};

showChapters();

/* HOW TO IMPROVE: add a delete endpoint in Oracle + a delete button here,
   a progress bar, a secret upload password, or ZIP/CBZ/image support. */

/* =====================================================================
   home.js  -  makes the HOME PAGE work
   1) chapter list   2) upload PDFs   3) delete one / delete all
   RULE WE FOLLOW: the list is ALWAYS reloaded from Oracle after a change.
   We never just "clear" the list on screen, so what you see is what is
   really in the database.
   ===================================================================== */

setupTheme();

const listBox  = document.getElementById("chapterList");
const statusEl = document.getElementById("status");

// ---- 1) SHOW CHAPTERS ------------------------------------------------
async function showChapters() {
  listBox.textContent = "Loading...";
  try {
    const chapters = await getChapters();   // sorted by title (see common.js)
    listBox.textContent = chapters.length ? "" : "No chapters yet. Upload a PDF above!";

    chapters.forEach(chapter => {
      const title = chapter.post_title || chapter.file_name || "Untitled";

      const card = document.createElement("div");
      card.className = "chapter-card";

      // Link that opens the reader at this chapter.
      const link = document.createElement("a");
      link.textContent = title;               // textContent is safe (no HTML tricks)
      link.href = "reader.html?id=" + encodeURIComponent(chapter.post_id);

      // Small delete button for this chapter only.
      const del = document.createElement("button");
      del.textContent = "✕";
      del.title = "Delete this chapter";
      del.onclick = () => deleteOne(chapter.post_id, title);

      card.append(link, del);
      listBox.appendChild(card);
    });
  } catch (err) {
    listBox.textContent = "Could not load chapters: " + err.message +
      ". Press F12 and read the Console to see why.";
  }
}

// ---- 2) UPLOAD (same working code as before) ------------------------
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

    // The title and file name travel in the web address (after the "?").
    const url = API_BASE + "upload/?title=" + encodeURIComponent(title) +
                "&file_name=" + encodeURIComponent(file.name);

    statusEl.textContent = "Uploading " + file.name + " (" + (done + 1) + " of " + files.length + ")...";
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },   // "raw file data"
        body: file
      });
      if (!response.ok) {
        statusEl.textContent = "Upload failed (error " + response.status + ").";
        return;
      }
      done++;
    } catch (err) {
      // A network error here is almost always CORS (see Origins Allowed in Oracle).
      statusEl.textContent = "Network/CORS error: " + err.message;
      return;
    }
  }

  statusEl.textContent = "Done! Uploaded " + done + " file(s) ✅";
  showChapters();
};

// ---- 3) DELETE -------------------------------------------------------
// Sends a POST to Oracle with your admin password in the web address.
// We send NO custom headers, so the browser does not need extra CORS checks.
async function callDelete(path, label) {
  const key = prompt("Admin password:");
  if (!key) { statusEl.textContent = "Delete cancelled."; return; }

  statusEl.textContent = "Deleting " + label + "...";
  try {
    const response = await fetch(API_BASE + path + "?key=" + encodeURIComponent(key), { method: "POST" });
    if (response.status === 403) { statusEl.textContent = "Wrong password. Nothing was deleted."; return; }
    if (!response.ok)            { statusEl.textContent = "Delete failed (error " + response.status + ")."; return; }
    statusEl.textContent = "Deleted ✅";
  } catch (err) {
    statusEl.textContent = "Network/CORS error: " + err.message;
    return;
  }
  showChapters();   // reload the REAL list from Oracle
}

function deleteOne(id, title) {
  if (confirm('Delete "' + title + '"?')) callDelete("delete/" + encodeURIComponent(id), title);
}

document.getElementById("deleteAllBtn").onclick = function () {
  if (confirm("Delete ALL chapters?") && confirm("Really? This cannot be undone.")) {
    callDelete("deleteall/", "all chapters");
  }
};

showChapters();

/* HOW TO IMPROVE: add a progress bar, stop duplicate uploads, or ask for the
   password once and remember it until the tab is closed (sessionStorage). */

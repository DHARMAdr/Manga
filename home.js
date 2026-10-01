/* home.js - chapter list, upload, delete, delete all */

setupTheme();

const listBox  = document.getElementById("chapterList");
const statusEl = document.getElementById("status");

// ---- 1) SHOW CHAPTERS ------------------------------------------------
async function showChapters() {
  listBox.textContent = "Loading...";
  try {
    const chapters = await getChapters();
    listBox.textContent = chapters.length ? "" : "No chapters yet. Upload a PDF above!";

    chapters.forEach(chapter => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.gap = "8px";
      row.style.alignItems = "center";

      const link = document.createElement("a");
      link.className = "chapter-card";
      link.style.flex = "1";
      link.textContent = chapter.post_title || "Untitled";
      link.href = "reader.html?id=" + encodeURIComponent(chapter.post_id);

      const del = document.createElement("button");
      del.textContent = "Delete";
      del.onclick = () => deleteChapter(chapter.post_id, chapter.post_title);

      row.appendChild(link);
      row.appendChild(del);
      listBox.appendChild(row);
    });
  } catch (err) {
    listBox.textContent = "Could not load chapters: " + err.message;
  }
}

// ---- 2) UPLOAD -------------------------------------------------------
const uploadBtn = document.getElementById("uploadBtn");
if (uploadBtn) {
  uploadBtn.onclick = async function () {
    const typedTitle = document.getElementById("title").value.trim();
    const files = [...document.getElementById("files").files];

    if (files.length === 0) { statusEl.textContent = "Please choose a PDF first."; return; }

    let done = 0;
    for (const file of files) {
      if (!/\.pdf$/i.test(file.name)) {
        statusEl.textContent = "Skipped " + file.name + " (only PDF files work).";
        continue;
      }
      const title = (files.length === 1 && typedTitle) ? typedTitle : file.name.replace(/\.pdf$/i, "");
      const url = API_BASE + "upload/?title=" + encodeURIComponent(title) +
                  "&file_name=" + encodeURIComponent(file.name);

      statusEl.textContent = "Uploading " + file.name + " (" + (done + 1) + " of " + files.length + ")...";
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: file
        });
        if (!response.ok) {
          statusEl.textContent = "Upload failed (error " + response.status + ").";
          return;
        }
        done++;
      } catch (err) {
        statusEl.textContent = "Network/CORS error: " + err.message;
        return;
      }
    }
    statusEl.textContent = "Done! Uploaded " + done + " file(s) ✅";
    showChapters();
  };
}

// ---- 3) DELETE ONE ---------------------------------------------------
async function deleteChapter(id, title) {
  if (!confirm('Delete "' + (title || "Untitled") + '" from the cloud?')) return;
  const key = prompt("Admin password:");
  if (!key) return;

  statusEl.textContent = "Deleting...";
  try {
    const res = await fetch(API_BASE + "delete/" + encodeURIComponent(id) +
                            "?key=" + encodeURIComponent(key), { method: "POST" });
    statusEl.textContent = res.ok ? "Deleted ✅" : "Delete failed (wrong password or error " + res.status + ").";
  } catch (err) {
    statusEl.textContent = "Network/CORS error: " + err.message;
  }
  showChapters();
}

// ---- 4) DELETE ALL ---------------------------------------------------
const deleteAllBtn = document.getElementById("deleteAllBtn");
if (deleteAllBtn) {
  deleteAllBtn.onclick = async function () {
    if (!confirm("Delete ALL chapters from the cloud? This cannot be undone.")) return;
    const key = prompt("Admin password:");
    if (!key) return;

    statusEl.textContent = "Deleting everything...";
    try {
      const res = await fetch(API_BASE + "deleteall/?key=" + encodeURIComponent(key), { method: "POST" });
      statusEl.textContent = res.ok ? "All chapters deleted ✅" : "Delete failed (wrong password or error " + res.status + ").";
    } catch (err) {
      statusEl.textContent = "Network/CORS error: " + err.message;
    }
    showChapters();
  };
}

showChapters();

# Jira Clone — README

A lightweight, front‑end **Jira‑style ticket board** (Kanban) built with **HTML + CSS + JavaScript**. Data is stored in **LocalStorage**; you can **export/import JSON**, open a **details modal** with **subtasks, comments, and attachments**, and use **keyboard shortcuts**.

---
## ✨ Features
- Kanban board: **To Do / In Progress / Done**
- Create/Edit tickets (title, description, assignee, priority, status)
- Drag & drop between columns
- **Details modal**: subtasks ✅, comments 💬, attachments 📎 (data URLs)
- Search + filters (priority, assignee)
- **Export/Import JSON**
- Keyboard shortcuts: `/` focus search, `N` new ticket, `Esc` closes modals
- Works as a static site – no backend required

---
## 🗂 File Structure
```
jira-clone/
  index.html     # markup and two <dialog> modals
  styles.css     # layout, theme, details modal classes
  app.js         # data model, rendering, events, storage, import/export
```

---
## ▶️ Run Locally
1. Download the three files into one folder.
2. Double‑click `index.html` (or right‑click → Open With → your browser).
3. Click **Seed Demo** to load sample tickets.

> Tip: If the OS blocks the dialogs, allow pop‑ups for the file URL.

---
## 🧠 Data Model (stored in LocalStorage)
Each **ticket** has:
```json
{
  "id": "abc123",
  "title": "Set up VPN for remote user",
  "description": "Create user, MFA, test split-tunnel",
  "assignee": "Marissa",
  "priority": "High",
  "status": "todo|inprogress|done",
  "createdAt": 1712345678901,
  "subtasks": [{"id":"s1","title":"Check cable","done":true}],
  "comments": [{"id":"c1","author":"Alyssa","text":"Rebooted printer.","createdAt":1712345678901}],
  "attachments": [{"id":"a1","name":"screenshot.png","mime":"image/png","size":12345,"dataUrl":"data:image/png;base64,..."}]
}
```

---
## ⌨️ Keyboard Shortcuts
- `/` → focus search bar
- `N` → open **New Ticket** modal
- `Esc` → close any open modal

---
# Dev Cheat Sheet

## HTML (index.html)
- `.board` → wrapper grid for three columns.
- `.column[data-status]` → each status list (todo/inprogress/done).
- `.dropzone[data-status]` → drop target where cards render.
- `#ticket-modal` → create/edit ticket `<dialog>`.
- `#details-modal` → details `<dialog>` (subtasks, comments, attachments).
- Controls: `#search`, `#filter-priority`, `#filter-assignee`, `#new-ticket`, `#seed`, `#clear`, `#export`, `#import`.
- Details IDs used by JS: `#d-title`, `#d-description`, `#d-meta`, `#d-subtasks`, `#d-new-subtask`, `#d-add-subtask`, `#d-comments`, `#d-new-comment`, `#d-add-comment`, `#d-file`, `#d-attachments`, `#d-delete`, `#d-close`, `#close-details`.

## CSS (styles.css)
- **Layout/theme**: variables in `:root`, dark background.
- Cards/board: `.board`, `.column`, `.dropzone`, `.card`, `.tag`, `.toolbar`.
- Modals: `dialog`, `.modal-*`, `.row`.
- **Details modal (NEW)**:
  - `.detail-text` → bordered blocks for read‑only text.
  - `.detail-block` → vertical list grid.
  - `.detail-inline` → input + button row.
  - `.detail-chip` → pill row for subtasks/attachments.

## JavaScript (app.js)
- **Storage**: `STORAGE_KEY`, `loadTickets()`, `saveTickets()`.
- **Normalization**: `normalize(t)` ensures `subtasks/comments/attachments` exist.
- **Rendering**: `render()` builds the board, `cardEl(t)` creates a card DOM node.
- **Filters**: `applyFilters(list)` handles search/priority/assignee.
- **Status helpers**: `prettyStatus(s)`, `nextStatus(s)`.
- **Drag and drop**: listeners on `.dropzone` + `dragstart` on cards.
- **CRUD**: `openModal(existing)`, form `submit` handler, `updateTicket(id, patch)`, `clearTickets()`, `seedTickets()`.
- **Details modal**: `openDetails(id)`, `renderSubtasks(t)`, `renderComments(t)`, `renderAttachments(t)`; add/remove/toggle via event handlers.
- **Attachments**: `toDataUrl(file)` converts the uploaded file to a base64 data URL.
- **Import/Export**: `exportTickets()`, `importTickets(e)`.
- **Shortcuts**: global `keydown` handler for `/`, `N`, `Esc`.
- **Utils**: `escapeHtml(str)`, `toast(msg)`.

---
## Common Edits
- **Rename columns**: change the three `<section class="column" ...>` labels and adjust `status` values in JS if you add more.
- **Add new priority**: update `<select id="priority">` in HTML and the filter options + CSS tags.
- **Change theme**: tweak `:root` color variables.

---
## Troubleshooting
- **Dialogs don’t open** → Some browsers require user interaction first; click anywhere, then try again.
- **Weird characters (`â€¢`, `â†’`)** → See *Encoding Fix* above; or replace with `&bull;` and `&rarr;`.
- **Nothing persists** → Ensure your browser allows LocalStorage for `file://` URLs.

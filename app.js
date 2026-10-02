import {
  $,
  escapeHTML as e,
  readStore,
  writeStore,
  toast,
  uid,
  download,
} from "./lib.js";
import { seedState, validateBackup, dueCards, scheduleReview } from "./core.js";
const KEY = "recall-garden-v1";
let state;
try {
  state = validateBackup(readStore(KEY, seedState()));
} catch {
  state = seedState();
}
let selected = state.decks[0]?.id,
  editing = null,
  query = "",
  session = [],
  reviewed = 0,
  flipped = false;
const deck = () => state.decks.find((d) => d.id === selected);
const save = () => writeStore(KEY, state);
function render() {
  const all = state.decks.flatMap((d) => d.cards);
  $("#decks").innerHTML = state.decks
    .map(
      (d) =>
        `<button data-deck="${e(d.id)}" class="deck-link" aria-current="${d.id === selected ? "page" : "false"}"><span>▱ ${e(d.name)}</span><small>${d.cards.length}</small></button>`,
    )
    .join("");
  $("#stats").innerHTML =
    `<div><span>READY TO REVIEW</span><strong>${dueCards(all).length}</strong><small>A fresh chance to remember</small></div><div><span>CARDS IN YOUR GARDEN</span><strong>${all.length}</strong><small>Across ${state.decks.length} study decks</small></div><div><span>REVIEWS COMPLETED</span><strong>${all.reduce((n, c) => n + c.reviews, 0)}</strong><small>Every return makes a difference</small></div>`;
  const d = deck();
  if (!d) {
    $("#workspace").innerHTML =
      '<div class="panel empty"><h2>Your garden is ready to grow.</h2><p>Create your first deck with the + button.</p></div>';
    return;
  }
  $("#workspace").innerHTML =
    `<div class="deck-heading"><div><p class="eyebrow">CURRENT DECK</p><h2>${e(d.name)}</h2></div><div class="row wrap"><button id="rename-deck" class="ghost">Rename</button><button id="delete-deck" class="ghost">Delete deck</button><button id="study" class="primary" ${dueCards(d.cards).length ? "" : "disabled"}>Review ${dueCards(d.cards).length} cards →</button></div></div><div class="study-layout"><section class="panel notes-panel"><div class="row spread"><h3>Your source notes</h3><span class="pill">Plain text / Markdown</span></div><p class="muted">Keep the original ideas close to the cards you create.</p><label><span class="sr-only">Source notes</span><textarea id="notes" maxlength="100000" spellcheck="true">${e(d.notes)}</textarea></label><div class="row spread"><span id="save-status" class="muted">Saved in this browser</span><button id="save-notes">Save notes</button></div></section><section class="panel library"><div class="row spread"><h3>Card library</h3><button id="new-card" class="primary">+ Add card</button></div><label><span class="sr-only">Search cards</span><input id="card-search" type="search" placeholder="Find a question or answer…" value="${e(query)}"></label><div id="cards"></div></section></div>`;
  renderCards();
  $("#notes").addEventListener("input", () => {
    d.notes = $("#notes").value;
    $("#save-status").textContent = save()
      ? "Notes saved"
      : "Could not save. Export a backup.";
  });
  $("#rename-deck").onclick = () => {
    const name = prompt("New deck name", d.name);
    if (name?.trim()) {
      d.name = name.trim().slice(0, 120);
      save();
      render();
    }
  };
  $("#save-notes").onclick = () => {
    d.notes = $("#notes").value;
    if (save()) {
      $("#save-status").textContent = "Notes saved";
      toast("Your notes are saved.");
    }
  };
  $("#card-search").oninput = (ev) => {
    query = ev.target.value;
    renderCards();
  };
  $("#new-card").onclick = () => openCard();
  $("#study").onclick = () => {
    session = dueCards(d.cards).map((c) => c.id);
    reviewed = 0;
    flipped = false;
    renderReview();
    $("#review-dialog").showModal();
  };
  $("#delete-deck").onclick = () => {
    if (
      confirm(
        `Delete “${d.name}” and its ${d.cards.length} cards? Export a backup first if you need them.`,
      )
    ) {
      state.decks = state.decks.filter((x) => x.id !== d.id);
      selected = state.decks[0]?.id;
      save();
      render();
    }
  };
}
function renderCards() {
  const cards = deck().cards.filter((c) =>
    (c.front + " " + c.back + " " + c.source)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  $("#cards").innerHTML =
    cards
      .map(
        (c) =>
          `<article class="flashcard"><div class="row spread"><span class="card-dot">${c.due <= Date.now() ? "● Ready to review" : `Next: ${new Date(c.due).toLocaleDateString()}`}</span><div class="row"><button data-edit="${e(c.id)}" aria-label="Edit ${e(c.front)}">Edit</button><button data-delete="${e(c.id)}" aria-label="Delete ${e(c.front)}">×</button></div></div><h4>${e(c.front)}</h4><p>${e(c.back)}</p>${c.source ? `<details><summary>View source excerpt</summary><blockquote>${e(c.source)}</blockquote></details>` : ""}</article>`,
      )
      .join("") ||
    '<p class="empty">No cards here yet. Add a question worth remembering.</p>';
  $("#cards").onclick = (ev) => {
    const edit = ev.target.closest("[data-edit]"),
      del = ev.target.closest("[data-delete]");
    if (edit) openCard(edit.dataset.edit);
    if (del && confirm("Delete this flashcard?")) {
      deck().cards = deck().cards.filter((c) => c.id !== del.dataset.delete);
      save();
      render();
    }
  };
}
function openCard(id) {
  editing = id || null;
  const c = deck().cards.find((c) => c.id === id);
  $("#card-form").reset();
  $("#card-heading").textContent = c ? "Edit flashcard" : "Create a flashcard";
  for (const key of ["front", "back", "source"])
    $("#card-form").elements[key].value = c?.[key] || "";
  $("#card-dialog").showModal();
}
$("#decks").onclick = (ev) => {
  const b = ev.target.closest("[data-deck]");
  if (b) {
    const n = $("#notes");
    if (n && deck() && n.value !== deck().notes) {
      deck().notes = n.value;
      save();
    }
    selected = b.dataset.deck;
    query = "";
    render();
  }
};
$("#new-deck").onclick = () => {
  $("#deck-form").reset();
  $("#deck-dialog").showModal();
};
$("#deck-form").onsubmit = (ev) => {
  ev.preventDefault();
  const name = new FormData(ev.target).get("name").trim();
  if (!name) return;
  const d = { id: uid(), name, notes: "", cards: [] };
  state.decks.push(d);
  selected = d.id;
  save();
  $("#deck-dialog").close();
  render();
};
$("#card-form").onsubmit = (ev) => {
  ev.preventDefault();
  const f = new FormData(ev.target),
    front = f.get("front").trim(),
    back = f.get("back").trim(),
    source = f.get("source").trim();
  if (!front || !back) {
    toast("Add a question and answer.");
    return;
  }
  let c = deck().cards.find((c) => c.id === editing);
  if (c) Object.assign(c, { front, back, source });
  else
    deck().cards.push({
      id: uid(),
      front,
      back,
      source,
      due: 0,
      interval: 0,
      reviews: 0,
    });
  save();
  $("#card-dialog").close();
  render();
};
document
  .querySelectorAll("[data-close]")
  .forEach((b) => (b.onclick = () => b.closest("dialog").close()));
function renderReview() {
  const id = session[0],
    c = deck()?.cards.find((c) => c.id === id);
  $("#review-progress").textContent =
    `${reviewed} reviewed · ${session.length} remaining`;
  if (!c) {
    $("#review-card").innerHTML =
      '<div class="review-done">✳<h3>A little stronger than before.</h3><p>You finished this round. Your next reviews are scheduled.</p></div>';
    $("#review-controls").innerHTML =
      '<button id="finish-review" class="primary">Back to my garden</button>';
    $("#finish-review").onclick = () => $("#review-dialog").close();
    return;
  }
  $("#review-card").innerHTML =
    `<div class="review-face"><p class="eyebrow">${flipped ? "THE ANSWER" : "TRY TO RECALL"}</p><p>${e(flipped ? c.back : c.front)}</p>${flipped && c.source ? `<blockquote>${e(c.source)}</blockquote>` : ""}</div>`;
  $("#review-controls").innerHTML = flipped
    ? '<p class="muted">How well did you remember?</p><div class="grades"><button data-grade="again">Again<small>10 minutes</small></button><button data-grade="hard">Hard<small>Slow growth</small></button><button data-grade="good">Good<small>Steady growth</small></button><button data-grade="easy">Easy<small>Longer break</small></button></div>'
    : '<button id="flip" class="primary">Reveal answer</button>';
  if (!flipped)
    $("#flip").onclick = () => {
      flipped = true;
      renderReview();
    };
  else
    $("#review-controls").onclick = (ev) => {
      const b = ev.target.closest("[data-grade]");
      if (!b) return;
      const idx = deck().cards.findIndex((x) => x.id === id);
      deck().cards[idx] = scheduleReview(c, b.dataset.grade);
      save();
      session.shift();
      reviewed++;
      flipped = false;
      renderReview();
      render();
    };
}
$("#end-review").onclick = () => $("#review-dialog").close();
$("#export").onclick = () => {
  if ($("#notes") && deck()) {
    deck().notes = $("#notes").value;
    save();
  }
  download("recall-garden-backup.json", state);
};
$("#import-button").onclick = () => $("#import").click();
$("#import").onchange = async (ev) => {
  const f = ev.target.files[0];
  if (!f) return;
  try {
    if (f.size > 10000000)
      throw new Error("Backup is too large (10 MB maximum).");
    const incoming = validateBackup(JSON.parse(await f.text()));
    if (
      confirm(
        `Replace current decks with ${incoming.decks.length} imported decks? Export your current data first if needed.`,
      )
    ) {
      state = incoming;
      selected = state.decks[0]?.id;
      save();
      render();
      toast("Backup restored.");
    }
  } catch (err) {
    toast("Import failed: " + err.message);
  }
  ev.target.value = "";
};
window.addEventListener("beforeunload", () => {
  if ($("#notes") && deck()) {
    deck().notes = $("#notes").value;
    save();
  }
});
render();

import * as store from "./store.js";
import { parseOptions } from "./util.js";
import * as dice from "./modes/dice.js";
import * as wheel from "./modes/wheel.js";
import * as plinko from "./modes/plinko.js";
import * as choosr from "./modes/choosr.js";

const MODES = [
  { id: "dice", label: "Dice", icon: "🎲", mod: dice },
  { id: "wheel", label: "Wheel", icon: "🎡", mod: wheel },
  { id: "plinko", label: "Plinko", icon: "🔻", mod: plinko },
  { id: "choosr", label: "Choosr", icon: "👆", mod: choosr },
  { id: "lists", label: "Lists", icon: "📋" },
];

const main = document.getElementById("main");
const tabs = document.getElementById("tabs");
let current = null; // { destroy() }
let sourceOpen = false;

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

tabs.innerHTML = MODES.map(
  (m) => `<a href="#${m.id}" data-id="${m.id}"><span>${m.icon}</span>${m.label}</a>`
).join("");

function route() {
  const id = location.hash.slice(1);
  const mode = MODES.find((m) => m.id === id) || MODES[0];
  if (current) current.destroy();
  main.innerHTML = "";
  tabs.querySelectorAll("a").forEach((a) => a.classList.toggle("active", a.dataset.id === mode.id));
  current = mode.mod ? mountMode(mode) : mountLists();
}

function mountMode(mode) {
  const panel = document.createElement("section");
  const stage = document.createElement("section");
  stage.className = "mode";
  main.append(panel, stage);

  const api = { options: store.getOptions };
  const instance = mode.mod.mount(stage, api);
  const sourcePanel = renderSource(panel, () => instance.update());
  return { destroy: () => { instance.destroy(); sourcePanel(); } };
}

// Options picker shared by every mode: quick entry or a saved list.
function renderSource(host, onChange) {
  const lists = store.getLists();
  const sel = store.getSourceId();
  host.innerHTML = `
    <details class="source" ${sourceOpen ? "open" : ""}>
      <summary><span class="src-name"></span><span class="src-count"></span></summary>
      <div class="src-body">
        <select aria-label="Options source">
          <option value="quick">✏️ Quick entry</option>
          ${lists.map((l) => `<option value="${l.id}">📋 ${esc(l.name)}</option>`).join("")}
        </select>
        <textarea rows="5" placeholder="One option per line"></textarea>
        <div class="row"><button class="save">Save as list…</button></div>
      </div>
    </details>`;
  const details = host.querySelector("details");
  const select = host.querySelector("select");
  const area = host.querySelector("textarea");
  select.value = sel;
  area.value = store.getQuick();

  const refresh = () => {
    const isQuick = store.getSourceId() === "quick";
    area.hidden = !isQuick;
    host.querySelector(".save").hidden = !isQuick;
    const opts = store.getOptions();
    const list = store.getList(store.getSourceId());
    host.querySelector(".src-name").textContent = list ? list.name : "Quick entry";
    host.querySelector(".src-count").textContent = `${opts.length} option${opts.length === 1 ? "" : "s"}`;
  };
  refresh();

  details.addEventListener("toggle", () => { sourceOpen = details.open; });
  select.addEventListener("change", () => { store.setSource(select.value); refresh(); onChange(); });
  area.addEventListener("input", () => { store.setQuick(area.value); refresh(); onChange(); });
  host.querySelector(".save").addEventListener("click", () => {
    const items = parseOptions(area.value);
    if (!items.length) return alert("Enter some options first.");
    const name = prompt("Name this list:", "");
    if (name === null) return;
    const id = store.saveList({ name, items });
    store.setSource(id);
    route();
  });
  return () => { host.innerHTML = ""; };
}

function mountLists() {
  const view = document.createElement("section");
  view.className = "lists";
  main.append(view);

  const showAll = () => {
    const lists = store.getLists();
    view.innerHTML = `
      <div class="row between"><h2>Your lists</h2><button class="primary" id="new">+ New list</button></div>
      ${lists.length ? "" : `<p class="muted">No lists yet. Create one, e.g. your local pubs, then use it in any mode.</p>`}
      ${lists.map((l) => `
        <article class="card" data-id="${l.id}">
          <div><strong>${esc(l.name)}</strong>
          <div class="muted">${l.items.length} item${l.items.length === 1 ? "" : "s"}: ${esc(l.items.slice(0, 4).join(", "))}${l.items.length > 4 ? "…" : ""}</div></div>
          <div class="row"><button data-act="edit">Edit</button><button data-act="del" class="danger">Delete</button></div>
        </article>`).join("")}`;
    view.querySelector("#new").onclick = () => edit();
    view.querySelectorAll("article").forEach((card) => {
      const id = card.dataset.id;
      card.querySelector('[data-act="edit"]').onclick = () => edit(store.getList(id));
      card.querySelector('[data-act="del"]').onclick = () => {
        if (confirm(`Delete "${store.getList(id).name}"?`)) { store.deleteList(id); showAll(); }
      };
    });
  };

  const edit = (list) => {
    view.innerHTML = `
      <h2>${list ? "Edit list" : "New list"}</h2>
      <label>Name<input id="name" type="text" maxlength="60" placeholder="e.g. Pubs near me" value="${list ? esc(list.name) : ""}"></label>
      <label>Items (one per line)<textarea id="items" rows="12">${list ? esc(list.items.join("\n")) : ""}</textarea></label>
      <div class="row"><button class="primary" id="ok">Save</button><button id="cancel">Cancel</button></div>`;
    view.querySelector("#cancel").onclick = showAll;
    view.querySelector("#ok").onclick = () => {
      const items = parseOptions(view.querySelector("#items").value);
      if (!items.length) return alert("Add at least one item.");
      store.saveList({ id: list && list.id, name: view.querySelector("#name").value, items });
      showAll();
    };
  };

  showAll();
  return { destroy() {} };
}

window.addEventListener("hashchange", route);
route();

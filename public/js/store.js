import { parseOptions } from "./util.js";

const KEY = "randomiser.v1";

const defaults = () => ({
  quick: "",
  sourceId: "quick",
  lists: [
    { id: "seed-lunch", name: "Lunch ideas", items: ["Pizza", "Burgers", "Sushi", "Curry", "Tacos", "Salad"] },
  ],
});

let state = load();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && Array.isArray(saved.lists)) return { ...defaults(), ...saved };
  } catch { /* corrupt or unavailable storage: start fresh */ }
  return defaults();
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

export const getLists = () => state.lists;
export const getList = (id) => state.lists.find((l) => l.id === id);
export const getSourceId = () => state.sourceId;
export const getQuick = () => state.quick;

export function setSource(id) {
  state.sourceId = id === "quick" || getList(id) ? id : "quick";
  persist();
}

export function setQuick(text) {
  state.quick = text;
  persist();
}

export function getOptions() {
  const list = getList(state.sourceId);
  return list ? [...list.items] : parseOptions(state.quick);
}

export function saveList({ id, name, items }) {
  const clean = { name: name.trim() || "Untitled list", items };
  if (id && getList(id)) {
    Object.assign(getList(id), clean);
  } else {
    id = "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    state.lists.push({ id, ...clean });
  }
  persist();
  return id;
}

export function deleteList(id) {
  state.lists = state.lists.filter((l) => l.id !== id);
  if (state.sourceId === id) state.sourceId = "quick";
  persist();
}

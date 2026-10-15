import { randInt, buzz } from "../util.js";

const DEFAULT_FACES = ["1", "2", "3", "4", "5", "6"];
const ROLL_MS = 900;

export function mount(root, api) {
  let count = 2;
  let timer = null;

  root.innerHTML = `
    <div class="row count" role="group" aria-label="Number of dice"></div>
    <div class="dice-area" aria-live="polite"></div>
    <div class="result"></div>
    <button class="primary roll">Roll</button>
    <p class="hint faces-hint"></p>`;
  const countRow = root.querySelector(".count");
  const area = root.querySelector(".dice-area");
  const result = root.querySelector(".result");
  const rollBtn = root.querySelector(".roll");
  const hint = root.querySelector(".faces-hint");

  countRow.innerHTML = [1, 2, 3, 4, 5, 6].map((n) => `<button data-n="${n}">${n}</button>`).join("");
  countRow.addEventListener("click", (e) => {
    const n = Number(e.target.dataset.n);
    if (n) { count = n; clear(); }
  });

  const faces = () => {
    const opts = api.options();
    return opts.length ? opts : DEFAULT_FACES;
  };

  function showDice(values, rolling) {
    area.innerHTML = values.map((v) => `<div class="die ${rolling ? "rolling" : ""}"></div>`).join("");
    [...area.children].forEach((el, i) => { el.textContent = values[i]; });
  }

  function clear() {
    clearInterval(timer);
    rollBtn.disabled = false;
    countRow.querySelectorAll("button").forEach((b) => b.classList.toggle("on", Number(b.dataset.n) === count));
    const f = faces();
    hint.textContent = api.options().length
      ? `Each die has ${f.length} face${f.length === 1 ? "" : "s"} from your list.`
      : "Standard six-sided dice. Add options to make custom dice.";
    showDice(Array.from({ length: count }, () => "?"), false);
    result.textContent = "";
  }

  function roll() {
    const f = faces();
    const finals = Array.from({ length: count }, () => f[randInt(f.length)]);
    rollBtn.disabled = true;
    result.textContent = "";
    const start = Date.now();
    timer = setInterval(() => {
      if (Date.now() - start < ROLL_MS) {
        showDice(finals.map(() => f[randInt(f.length)]), true);
        return;
      }
      clearInterval(timer);
      showDice(finals, false);
      const numeric = finals.every((v) => v !== "" && !isNaN(Number(v)));
      result.textContent = count === 1 ? finals[0] : numeric ? `Total: ${finals.reduce((s, v) => s + Number(v), 0)}` : "";
      rollBtn.disabled = false;
      buzz();
    }, 80);
  }

  rollBtn.addEventListener("click", roll);
  clear();
  return { update: clear, destroy: () => clearInterval(timer) };
}

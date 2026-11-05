const LIMIT = 6;
const $ = id => document.getElementById(id);

/* Cards come from the HTML, not from JavaScript */
const cards = [...document.querySelectorAll("#cardsDeck .healer-card")];
const byId = id => cards.find(c => c.dataset.id === id);
const inner = id => byId(id).innerHTML;

/* Name from index.html form (pick-cards.html?userName=...) */
const userName = (new URLSearchParams(location.search).get("userName") || "").trim();

let picked = [], pairs = [], idx = 0, wins = {}, h2h = {};

function show(id) {
  document.querySelectorAll(".stage").forEach(s => s.classList.toggle("active", s.id === id));
  window.scrollTo({ top: 0 });
}

/* ---------- Stage 1: pick cards ---------- */
$("selectionHeading").textContent = userName
  ? `${userName}, pick 6 values that matter most to you`
  : "Pick 6 values that matter most to you";

function toggle(id) {
  const i = picked.indexOf(id);
  if (i > -1) picked.splice(i, 1);
  else if (picked.length < LIMIT) picked.push(id);
  refresh();
}

function refresh() {
  const full = picked.length === LIMIT;
  cards.forEach(c => {
    const on = picked.includes(c.dataset.id);
    c.classList.toggle("selected", on);
    c.classList.toggle("locked", full && !on);
    c.setAttribute("aria-pressed", on);
  });
  const btn = $("startDuelBtn");
  btn.disabled = !full;
  btn.classList.toggle("ready", full);
  btn.textContent = full ? "Start duel →" : `Select ${LIMIT} values (${picked.length}/${LIMIT})`;
}

cards.forEach(c => {
  c.addEventListener("click", () => toggle(c.dataset.id));
  c.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(c.dataset.id); }
  });
});

$("startDuelBtn").onclick = startDuel;
refresh();

/* ---------- Stage 2: duel ---------- */
function startDuel() {
  wins = {}; h2h = {};
  picked.forEach(id => wins[id] = 0);
  pairs = [];
  for (let i = 0; i < picked.length; i++)
    for (let j = i + 1; j < picked.length; j++) pairs.push([picked[i], picked[j]]);
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  pairs = pairs.map(p => Math.random() < .5 ? p : [p[1], p[0]]);
  idx = 0;
  renderDuel();
  show("duel-stage");
}

function duelCard(id) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "healer-card";
  b.dataset.id = id;
  b.innerHTML = inner(id);
  b.onclick = () => choose(id);
  return b;
}

let hoverArmed = false;
function renderDuel() {
  const [a, b] = pairs[idx];
  const arena = document.querySelector(".duel-arena");
  /* no hover effect until the mouse moves, so new cards don't flash under the pointer */
  arena.classList.add("nohover");
  if (!hoverArmed) {
    hoverArmed = true;
    window.addEventListener("pointermove", () => {
      arena.classList.remove("nohover");
      hoverArmed = false;
    }, { once: true });
  }
  $("leftDuelCard").replaceChildren(duelCard(a));
  $("rightDuelCard").replaceChildren(duelCard(b));
  $("duelProgress").style.width = (idx / pairs.length * 100) + "%";
  $("duelCount").textContent = `Duel ${idx + 1} of ${pairs.length}`;
}

function choose(winner) {
  const [a, b] = pairs[idx], loser = winner === a ? b : a;
  wins[winner]++;
  h2h[winner + ">" + loser] = true;
  idx++;
  if (idx >= pairs.length) {
    $("duelProgress").style.width = "100%";
    showResults();
  } else renderDuel();
}

$("restartDuelBtn").onclick = startDuel;

/* ---------- Stage 3: results ---------- */
function rankValues() {
  return [...picked].sort((a, b) => {
    if (wins[b] !== wins[a]) return wins[b] - wins[a];
    /* tie: compare wins only against the others on the same score */
    const group = picked.filter(id => wins[id] === wins[a]);
    const mini = id => group.filter(o => o !== id && h2h[id + ">" + o]).length;
    return mini(b) - mini(a) || picked.indexOf(a) - picked.indexOf(b);
  });
}

function showResults() {
  const ranked = rankValues();
  const w = n => `${n} win${n === 1 ? "" : "s"}`;
  $("resultsHeading").textContent = userName
    ? `${userName}’s Core Values Hierarchy`
    : "Your Core Values Hierarchy";
  $("rankedCardsGrid").innerHTML = ranked.map((id, i) => `
    <article class="healer-card result-card${i === 0 ? " selected" : ""}">
      <div class="result-meta"><span class="rank-badge">#${i + 1}</span><span class="wins-badge">${w(wins[id])}</span></div>
      ${inner(id)}
    </article>`).join("");
  show("result-stage");
}

$("retakeBtn").onclick = () => { location.href = "index.html"; };
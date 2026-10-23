// Landing page script: server status check and the in-browser budget calculator.
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("calc-result");
const fields = ["c-income", "c-needs", "c-food", "c-fun"].map((id) => document.getElementById(id));
const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

async function checkHealth() {
  try {
    const res = await fetch("/api/health");
    if (!res.ok) throw new Error("down");
    statusEl.textContent = "Server is online";
    statusEl.className = "status ok";
  } catch (err) {
    statusEl.textContent = "Server is not reachable. Start the Node.js backend and refresh.";
    statusEl.className = "status down";
  }
}

function calculate() {
  const [income, needs, food, fun] = fields.map((f) => Math.max(0, Number(f.value) || 0));
  const spent = needs + food + fun;

  if (income === 0) {
    resultEl.className = "result";
    resultEl.textContent = "Enter your income and spending to see your savings.";
    return;
  }

  const left = income - spent;
  const rate = Math.round((left / income) * 100);
  let tone = "good";
  let advice = "You are saving a healthy share of your income.";
  if (left < 0) {
    tone = "bad";
    advice = "You are spending more than you earn. Start by trimming shopping and fun.";
  } else if (rate < 20) {
    tone = "warn";
    advice = "A common target is to save at least 20% of income.";
  }

  resultEl.className = "result " + tone;
  resultEl.innerHTML = "";
  const line = document.createElement("p");
  line.append("Left over each month: ");
  const big = document.createElement("strong");
  big.textContent = rupees.format(left) + " (" + rate + "%)";
  line.append(big);
  const tip = document.createElement("p");
  tip.textContent = advice;
  tip.style.margin = "0";
  line.style.margin = "0 0 .3rem";
  resultEl.append(line, tip);
}

fields.forEach((f) => f.addEventListener("input", calculate));
document.getElementById("calc").addEventListener("submit", (e) => e.preventDefault());

checkHealth();

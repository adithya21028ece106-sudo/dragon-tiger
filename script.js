const KEY = "dvt_history_v1";

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistory(arr) {
  localStorage.setItem(KEY, JSON.stringify(arr));
}

function addResult(x) {
  const h = loadHistory();
  h.push({ r: x, t: Date.now() });
  saveHistory(h);
  renderAll();
}

function clearAll() {
  if (confirm("Clear all history?")) {
    saveHistory([]);
    renderAll();
  }
}

function undoLast() {
  const h = loadHistory();
  h.pop();
  saveHistory(h);
  renderAll();
}

function countStats(h) {
  const total = h.length;
  const d = h.filter(x => x.r === "D").length;
  const t = h.filter(x => x.r === "T").length;
  const i = h.filter(x => x.r === "I").length;
  return { total, d, t, i };
}

function streakInfo(h) {
  if (h.length === 0) return { last: "-", streak: 0 };
  const last = h[h.length - 1].r;
  let s = 0;
  for (let k = h.length - 1; k >= 0; k--) {
    if (h[k].r === last) s++;
    else break;
  }
  return { last, streak: s };
}

function renderHistory() {
  const h = loadHistory();
  const el = document.getElementById("history");
  if (!el) return;

  el.innerHTML = "";
  if (h.length === 0) {
    el.innerHTML = "<div class='muted'>No history yet.</div>";
    return;
  }

  const last = h.slice(-60);
  last.forEach((x) => {
    const b = document.createElement("div");
    b.className = `badge ${x.r}`;
    b.textContent = `${x.r}`;
    el.appendChild(b);
  });
}

function renderStats() {
  const h = loadHistory();
  const el = document.getElementById("statsBox");
  if (!el) return;

  const { total, d, t, i } = countStats(h);
  const st = streakInfo(h);

  const dPct = total ? ((d / total) * 100).toFixed(1) : "0.0";
  const tPct = total ? ((t / total) * 100).toFixed(1) : "0.0";
  const iPct = total ? ((i / total) * 100).toFixed(1) : "0.0";

  el.innerHTML = `
    <b>Total:</b> ${total}<br/>
    🐉 Dragon: <b>${d}</b> (${dPct}%)<br/>
    🐯 Tiger: <b>${t}</b> (${tPct}%)<br/>
    🤝 Tie: <b>${i}</b> (${iPct}%)<br/>
    <hr style="border:0;border-top:1px solid rgba(255,255,255,0.12);margin:10px 0"/>
    <b>Current streak:</b> ${st.last} × ${st.streak}
  `;
}

function renderAll() {
  renderHistory();
  renderStats();
}

// ------------------- Prediction -------------------

function lastN(h, n) {
  return h.slice(-n).map(x => x.r);
}

function scorePrediction(h) {
  const reasons = [];
  if (h.length < 3) {
    return {
      guess: "Need more data (Add at least 3 rounds)",
      confidence: 0,
      reasons: ["Add results in Tracker page to generate prediction."]
    };
  }

  const L10 = lastN(h, 10);
  const L5 = lastN(h, 5);

  let scoreD = 0;
  let scoreT = 0;

  const d10 = L10.filter(x => x === "D").length;
  const t10 = L10.filter(x => x === "T").length;

  if (d10 > t10) { scoreD += 2; reasons.push("Last 10 rounds: Dragon more frequent"); }
  if (t10 > d10) { scoreT += 2; reasons.push("Last 10 rounds: Tiger more frequent"); }

  const d5 = L5.filter(x => x === "D").length;
  const t5 = L5.filter(x => x === "T").length;

  if (d5 > t5) { scoreD += 2; reasons.push("Last 5 rounds: Dragon stronger"); }
  if (t5 > d5) { scoreT += 2; reasons.push("Last 5 rounds: Tiger stronger"); }

  const st = streakInfo(h);
  if (st.last === "D" && st.streak >= 3) {
    scoreT += 2;
    reasons.push("Dragon streak is long → possible switch");
  }
  if (st.last === "T" && st.streak >= 3) {
    scoreD += 2;
    reasons.push("Tiger streak is long → possible switch");
  }

  const last4 = lastN(h, 4);
  const alt = (last4[0] !== last4[1] && last4[1] !== last4[2] && last4[2] !== last4[3]);
  if (alt) {
    const last = h[h.length - 1].r;
    if (last === "D") scoreT += 2;
    if (last === "T") scoreD += 2;
    reasons.push("Alternating pattern detected in last 4");
  }

  let guess = "T";
  if (scoreD > scoreT) guess = "D";
  if (scoreT > scoreD) guess = "T";

  const gap = Math.abs(scoreD - scoreT);
  let confidence = 50 + gap * 10;
  if (confidence > 85) confidence = 85;

  return { guess, confidence, reasons };
}

function renderPrediction() {
  const h = loadHistory();

  const box = document.getElementById("predictionBox");
  const reasonBox = document.getElementById("reasonBox");
  const last20Box = document.getElementById("last20");

  if (!box || !reasonBox || !last20Box) return;

  const p = scorePrediction(h);

  let label = p.guess;
  if (p.guess === "D") label = "🐉 Dragon";
  if (p.guess === "T") label = "🐯 Tiger";

  box.innerHTML = `
    <div><b>Guess:</b> ${label}</div>
    <div style="opacity:0.8;margin-top:6px">
      Confidence: <b>${p.confidence}%</b> (trend-based)
    </div>
  `;

  reasonBox.innerHTML = "";
  p.reasons.forEach(r => {
    const li = document.createElement("li");
    li.textContent = r;
    reasonBox.appendChild(li);
  });

  last20Box.innerHTML = "";
  const last = h.slice(-20);
  if (last.length === 0) {
    last20Box.innerHTML = "<div class='muted'>No history yet.</div>";
    return;
  }
  last.forEach(x => {
    const b = document.createElement("div");
    b.className = `badge ${x.r}`;
    b.textContent = x.r;
    last20Box.appendChild(b);
  });
}

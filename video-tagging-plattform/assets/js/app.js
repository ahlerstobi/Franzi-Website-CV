/* ------------------------------------------------------------------ *
 *  Prompt (identisch zum verwendeten Gemini-Prompt)
 * ------------------------------------------------------------------ */
const PROMPT = `Du bist ein erfahrener Video-Archivar und Dokumentar für Nachrichtenbeiträge.
Analysiere das bereitgestellte Videomaterial (sowohl Tonspur/Sprechertext als auch Bildelemente wie Bauchbinden, Titeleinblendungen, Uhren und Logos) und extrahiere alle relevanten Metadaten.
Regeln für die Extraktion:

1. Datum & Uhrzeit: Lies Zeitstempel vorrangig aus Bildelementen (Studio-Uhren, Bauchbinden, Newsticker) oder dem gesprochenen Kontext ab. Falls kein genaues Datum sichtbar/hörbar ist, kennzeichne das Feld mit "nicht ermittelbar" oder nutze das Veröffentlichungsdatum der Quelldatei.
2. Personen & Rollen: Gleiche Namen und Funktionen mit den eingeblendeten Bauchbinden (Lower Thirds) ab (z. B. "Moderator", "Reporter vor Ort", "Interviewpartner", "Politiker").
3. Faktentreue: Halluziniere keine Details. Wenn Angaben (z. B. Sender oder Autor) fehlen, setze den Wert auf null.
4. Format: Gib ausschließlich valides JSON ohne einleitenden oder abschließenden Fluff-Text aus.

Zielstruktur (JSON):
{
 "titel": "Prägnante Schlagzeile des Beitrags",
 "untertitel_thema": "Hauptthema / Ressort (z. B. Innenpolitik, Wirtschaft, Ausland, Katastrophenschutz)",
 "zusammenfassung": "2-3 Sätze zum Kerninhalt des Berichts",
 "sendedaten": {
  "sender_kanal": "Sender oder Plattform (aus Senderlogo/Cornerbug oder Audio)",
  "sendungsname": "Name der Sendung (z. B. Tagesschau, heute journal, RTL Aktuell)",
  "datum": "JJJJ-MM-TT (falls erkennbar)",
  "uhrzeit_sendezeit": "HH:MM (Studiozeit oder Einblendung)",
  "dauer_sekunden": 0
 },
 "beteiligte_personen": [
  { "name": "Vorname Nachname", "funktion_rolle": "z. B. Korrespondent, Augenzeuge, Minister", "organisation": "z. B. ZDF-Studio Washington, Bundeswehr" }
 ],
 "autor_reporter": "Name des Verfassers / Beitragsmachers (oft am Beitragsende genannt/eingeblendet)",
 "geografische_angaben": {
  "schauplatz_drehort": "Stadt / Region, an dem gedreht wurde",
  "bezugsland": "Land, um das es inhaltlich geht"
 },
 "schlagworte": ["Tag1", "Tag2", "Tag3", "Tag4"],
 "text_im_bild_ocr": ["Wortwörtlicher Text wichtiger Bauchbinden, Schlagzeilen oder Diagramme"],
 "wichtige_zitate": ["Prägnantes O-Ton-Zitat inklusive Namensnennung"],
 "stimmung_tonalitaet": "neutral / investigativ / dramatisch / sachlich"
}`;


/* ------------------------------------------------------------------ *
 *  Helpers
 * ------------------------------------------------------------------ */
const $ = (id) => document.getElementById(id);
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const val = (v) => (v === null || v === undefined || v === "") ? '<td class="null">keine Angabe</td>' : `<td>${esc(v)}</td>`;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} }
};
let currentResult = null;

function extractVideoId(url) {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host.endsWith("youtube.com") || host === "youtube-nocookie.com") {
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(shorts|embed|live|v)\/([\w-]{6,})/);
      if (m) return m[2];
    }
  } catch {}
  return null;
}

function formatDuration(sec) {
  if (sec === null || sec === undefined || isNaN(sec)) return null;
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  return `${sec} Sekunden (${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} Min.)`;
}

function setStatus(text, type) {
  const el = $("status");
  if (!text) { el.className = "status"; return; }
  el.className = "status show" + (type === "error" ? " error" : "");
  el.querySelector(".spinner").style.display = type === "error" ? "none" : "";
  $("statusText").textContent = text;
}

function updateModeBadge() {
  const live = $("apiKey").value.trim().length > 0;
  const b = $("modeBadge");
  b.textContent = live ? "LIVE-MODUS" : "DEMO-MODUS";
  b.className = "mode-badge " + (live ? "mode-live" : "mode-demo");
}

function loadPlayer(id) {
  $("player").innerHTML =
    `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}" title="YouTube Video"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
}

/* ------------------------------------------------------------------ *
 *  Rendering
 * ------------------------------------------------------------------ */
function render(data, isDemo) {
  currentResult = data;
  const sd = data.sendedaten || {};
  const geo = data.geografische_angaben || {};
  const tags = Array.isArray(data.schlagworte) ? data.schlagworte : [];

  $("overview").className = "";
  $("overview").innerHTML = `
    <p class="headline">${esc(data.titel || "Ohne Titel")}</p>
    <div class="topic">${esc(data.untertitel_thema || "")}</div>
    <p>${esc(data.zusammenfassung || "")}</p>
    <div class="tags">${tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join("")}</div>`;

  const rows = [
    ["Sender / Kanal", sd.sender_kanal],
    ["Sendungsname", sd.sendungsname],
    ["Datum", sd.datum],
    ["Uhrzeit / Sendezeit", sd.uhrzeit_sendezeit],
    ["Dauer", formatDuration(sd.dauer_sekunden)],
    ["Autor / Reporter", data.autor_reporter],
    ["Schauplatz / Drehort", geo.schauplatz_drehort],
    ["Bezugsland", geo.bezugsland],
    ["Stimmung / Tonalität", data.stimmung_tonalitaet],
    ["Schlagworte", tags.join(", ")]
  ];
  $("t-general").innerHTML = `<table><tbody>${rows.map(([k, v]) => `<tr><td class="key">${k}</td>${val(v)}</tr>`).join("")}</tbody></table>`;

  const persons = Array.isArray(data.beteiligte_personen) ? data.beteiligte_personen : [];
  $("t-persons").innerHTML = persons.length
    ? `<table><thead><tr><th>Name</th><th>Funktion / Rolle</th><th>Organisation</th></tr></thead><tbody>
        ${persons.map((p) => `<tr><td class="key">${esc(p.name || "–")}</td>${val(p.funktion_rolle)}${val(p.organisation)}</tr>`).join("")}
       </tbody></table>`
    : `<p class="hint">Keine Personen erkannt.</p>`;

  const quotes = Array.isArray(data.wichtige_zitate) ? data.wichtige_zitate : [];
  $("t-quotes").innerHTML = quotes.length
    ? `<table><thead><tr><th>Sprecher</th><th>Zitat</th></tr></thead><tbody>
        ${quotes.map((q) => {
          const s = typeof q === "string" ? q : (q.zitat || JSON.stringify(q));
          const m = s.match(/^([^:„"]{2,60}):\s*(.+)$/s);
          return m ? `<tr><td class="key">${esc(m[1])}</td><td><blockquote>${esc(m[2])}</blockquote></td></tr>`
                   : `<tr><td class="null">–</td><td><blockquote>${esc(s)}</blockquote></td></tr>`;
        }).join("")}
       </tbody></table>`
    : `<p class="hint">Keine Zitate erkannt.</p>`;

  const ocr = Array.isArray(data.text_im_bild_ocr) ? data.text_im_bild_ocr : [];
  $("t-ocr").innerHTML = ocr.length
    ? `<table><thead><tr><th style="width:60px">Nr.</th><th>Erkannter Text im Video</th></tr></thead><tbody>
        ${ocr.map((t, i) => `<tr><td class="key">${i + 1}</td><td><code class="ocr">${esc(t)}</code></td></tr>`).join("")}
       </tbody></table>`
    : `<p class="hint">Kein Text im Bild erkannt.</p>`;

  $("jsonOut").textContent = JSON.stringify(data, null, 2);
  $("demoNote").style.display = isDemo ? "block" : "none";
  $("results").classList.add("show");
}

/* ------------------------------------------------------------------ *
 *  Analyse
 * ------------------------------------------------------------------ */
async function analyzeLive(url, apiKey, model) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ fileData: { fileUri: url } }, { text: PROMPT }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
    })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error?.message || `HTTP ${res.status}`);
  const text = body?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  if (!text) throw new Error("Leere Antwort vom Modell erhalten.");
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(cleaned);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function analyzeDemo() {
  const steps = [
    "Video wird geladen …",
    "Tonspur wird transkribiert …",
    "Bauchbinden & Einblendungen werden gelesen (OCR) …",
    "Personen & Rollen werden abgeglichen …",
    "Metadaten werden strukturiert …"
  ];
  for (const s of steps) { setStatus(s); await sleep(650); }
  return SAMPLE;
}

async function run(url) {
  const id = extractVideoId(url);
  if (!id) { setStatus("Bitte einen gültigen YouTube-Link einfügen.", "error"); return; }
  loadPlayer(id);

  const apiKey = $("apiKey").value.trim();
  const model = $("model").value.trim() || "gemini-2.5-pro";
  $("analyzeBtn").disabled = true;
  try {
    if (apiKey) {
      setStatus(`Analyse mit ${model} läuft – das kann je nach Videolänge 30–90 Sekunden dauern …`);
      const data = await analyzeLive(`https://www.youtube.com/watch?v=${id}`, apiKey, model);
      render(data, false);
    } else {
      render(await analyzeDemo(), true);
    }
    setStatus("");
  } catch (e) {
    setStatus("Fehler bei der Analyse: " + e.message, "error");
  } finally {
    $("analyzeBtn").disabled = false;
  }
}

/* ------------------------------------------------------------------ *
 *  Export
 * ------------------------------------------------------------------ */
function download(name, content, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const slug = () => (currentResult?.titel || "video-metadaten").toLowerCase().replace(/[^a-z0-9äöüß]+/g, "-").slice(0, 60);

$("copyJson").onclick = async () => {
  if (!currentResult) return;
  try { await navigator.clipboard.writeText(JSON.stringify(currentResult, null, 2)); $("copyJson").textContent = "Kopiert ✓"; }
  catch { $("copyJson").textContent = "Kopieren nicht möglich"; }
  setTimeout(() => ($("copyJson").textContent = "JSON kopieren"), 1600);
};
$("downloadJson").onclick = () => currentResult && download(slug() + ".json", JSON.stringify(currentResult, null, 2), "application/json");
$("downloadCsv").onclick = () => {
  if (!currentResult) return;
  const q = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const lines = [["Name", "Funktion / Rolle", "Organisation"].map(q).join(";")]
    .concat((currentResult.beteiligte_personen || []).map((p) => [p.name, p.funktion_rolle, p.organisation].map(q).join(";")));
  download(slug() + "-personen.csv", "﻿" + lines.join("\r\n"), "text/csv");
};

/* ------------------------------------------------------------------ *
 *  UI wiring
 * ------------------------------------------------------------------ */
$("urlForm").addEventListener("submit", (e) => { e.preventDefault(); run($("url").value); });
$("sampleBtn").onclick = () => {
  const id = extractVideoId($("url").value);
  if (id) loadPlayer(id);
  setStatus("");
  render(SAMPLE, true);
};
$("toggleSettings").onclick = () => $("settings").classList.toggle("open");
$("tabs").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-tab]");
  if (!btn) return;
  document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("active", b === btn));
  document.querySelectorAll(".tabpane").forEach((p) => p.classList.toggle("active", p.id === btn.dataset.tab));
});

const persistKey = () => {
  if ($("remember").value === "yes") store.set("vtp_api_key", $("apiKey").value.trim());
  else store.del("vtp_api_key");
  store.set("vtp_model", $("model").value.trim());
  updateModeBadge();
};
$("apiKey").addEventListener("input", persistKey);
$("model").addEventListener("input", persistKey);
$("remember").addEventListener("change", persistKey);

(function init() {
  const cfg = window.VTP_CONFIG || {};
  if (cfg.GEMINI_API_KEY) $("apiKey").value = cfg.GEMINI_API_KEY;
  if (cfg.GEMINI_MODEL) $("model").value = cfg.GEMINI_MODEL;
  if (cfg.DEMO_VIDEO_URL) {
    $("url").value = cfg.DEMO_VIDEO_URL;
    const id = extractVideoId(cfg.DEMO_VIDEO_URL);
    if (id) loadPlayer(id);
  }
  const k = store.get("vtp_api_key");
  if (k) { $("apiKey").value = k; $("remember").value = "yes"; }
  const m = store.get("vtp_model");
  if (m) $("model").value = m;
  updateModeBadge();
})();

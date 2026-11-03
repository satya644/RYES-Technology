import * as A from "../api.js";

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// Strict HTML sanitizer
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}[c]));

const toInputDate = d => {
  if (!d) return "";
  const date = new Date(d);
  return isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const formatDate = d => {
  if (!d) return "N/A";
  const date = new Date(d);
  return isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// Toast notification
const resolveMedia = url => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = A.API_BASE.replace(/\/api\/?$/, "");
  return base + (url.startsWith("/") ? url : "/" + url);
};

const toast = (m, type = "info") => {
  const t = $("#toast");
  t.textContent = m;
  t.className = `on ${type}`;
  setTimeout(() => { t.className = ""; }, 3000);
};

// Safe wrapper with error state
const safe = async fn => {
  try {
    return await fn();
  } catch (e) {
    toast(e.message || "Request failed", "error");
    return null;
  }
};

const STATUS_LEADS = ["new", "contacted", "pilot", "client", "lost"];
const STATUS_CLIENTS = ["active", "paused", "ended"];
const TABS = ["leads", "clients", "pricing", "portfolio", "testimonials", "settings"];

// Field schemas: [key, type, options, label]
const FIELDS = {
  clients: [
    ["name", "text", null, "Client Name *"],
    ["phone", "text", null, "Phone Number (10 digits) *"],
    ["vertical", "select", ["education", "local", "bundle", "other"], "Category / Vertical"],
    ["plan", "text", null, "Subscribed Plan / Scope"],
    ["monthlyAmount", "number", null, "Monthly Amount (₹ INR) *"],
    ["startDate", "date", null, "Start Date"],
    ["renewalDate", "date", null, "Renewal Date *"],
    ["status", "select", ["active", "paused", "ended"], "Client Status"],
    ["notes", "area", null, "Client Notes / Deliverables"]
  ],
  pricing: [
    ["vertical", "select", ["local", "education", "bundle"], "Category / Vertical"],
    ["period", "select", ["month", "one-time"], "Billing Period"],
    ["name_en", "text", null, "Plan Name (English)"],
    ["name_hi", "text", null, "Plan Name (Hindi)"],
    ["price", "number", null, "Price (₹ INR)"],
    ["order", "number", null, "Display Order (1, 2, 3...)"],
    ["features_en", "lines", null, "Features List (English)"],
    ["features_hi", "lines", null, "Features List (Hindi)"],
    ["priceFrom", "check", null, "Starting from price? (e.g. ₹35,000+)"],
    ["popular", "check", null, "Mark as Popular / Recommended badge"],
    ["visible", "check", null, "Visible on Website"]
  ],
  portfolio: [
    ["title_en", "text", null, "Project Title (English)"],
    ["title_hi", "text", null, "Project Title (Hindi)"],
    ["category", "select", ["reels", "website", "social", "other"], "Category"],
    ["order", "number", null, "Display Order"],
    ["mediaUrl", "text", null, "Video / Media URL (YouTube/Insta/Drive)"],
    ["thumbUrl", "text", null, "Thumbnail Image URL"],
    ["visible", "check", null, "Visible on Website"]
  ],
  testimonials: [
    ["name", "text", null, "Client Name"],
    ["role", "text", null, "Client Role / Business Name"],
    ["rating", "number", null, "Rating (1 to 5)"],
    ["order", "number", null, "Display Order"],
    ["text_en", "area", null, "Review / Testimonial (English)"],
    ["text_hi", "area", null, "Review / Testimonial (Hindi)"],
    ["visible", "check", null, "Visible on Website"]
  ],
  settings: [
    ["whatsapp", "text", null, "WhatsApp Number (e.g. 919876543210)"],
    ["email", "email", null, "Public Contact Email"],
    ["instagram", "text", null, "Instagram Profile Link"],
    ["youtube", "text", null, "YouTube Channel Link"],
    ["heroTitle_en", "text", null, "Hero Title (English)"],
    ["heroTitle_hi", "text", null, "Hero Title (Hindi)"],
    ["heroSub_en", "area", null, "Hero Subtitle (English)"],
    ["heroSub_hi", "area", null, "Hero Subtitle (Hindi)"]
  ],
  manualLead: [
    ["name", "text", null, "Client / Lead Name *"],
    ["phone", "text", null, "Phone Number (10 digits) *"],
    ["businessType", "text", null, "Business / Coaching Type"],
    ["vertical", "select", ["local", "education", "other"], "Category / Vertical"],
    ["message", "area", null, "Requirement / Message"],
    ["status", "select", ["new", "contacted", "pilot", "client", "lost"], "Lead Status"],
    ["notes", "area", null, "Internal Notes"]
  ]
};

const TITLE = {
  pricing: i => `${esc(i.name_en || i.name_hi || "Plan")} · ₹${esc(i.price || 0)}${i.period === "month" ? "/mo" : ""}`,
  portfolio: i => esc(i.title_en || i.title_hi || i.category || "Project"),
  testimonials: i => `${esc(i.name || "Client")} (${esc(i.role || "Review")})`
};

function fieldHTML([k, t = "text", o, label], v) {
  const id = "f_" + k;
  const labelText = label || k;

  if (t === "check") {
    return `<div class="chk">
      <input type="checkbox" id="${id}" ${v ? "checked" : ""}>
      <label for="${id}" style="margin:0;cursor:pointer">${esc(labelText)}</label>
    </div>`;
  }

  let el = "";
  if (t === "select") {
    el = `<select id="${id}">${(o || []).map(x => `<option value="${esc(x)}" ${x === v ? "selected" : ""}>${esc(x)}</option>`).join("")}</select>`;
  } else if (t === "lines") {
    el = `<textarea id="${id}" rows="4" placeholder="Ek line me ek feature likhein...">${esc((Array.isArray(v) ? v : []).join("\n"))}</textarea>`;
  } else if (t === "area") {
    el = `<textarea id="${id}" rows="3">${esc(v)}</textarea>`;
  } else if (t === "date") {
    el = `<input id="${id}" type="date" value="${esc(toInputDate(v))}">`;
  } else {
    el = `<input id="${id}" type="${esc(t)}" value="${esc(v)}">`;
  }

  return `<div style="${t === "lines" || t === "area" ? "grid-column: 1 / -1" : ""}">
    <label for="${id}">${esc(labelText)}</label>
    ${el}
  </div>`;
}

function readForm(fields) {
  const out = {};
  for (const [k, t = "text"] of fields) {
    const e = $("#f_" + k);
    if (!e) continue;
    if (t === "check") out[k] = e.checked;
    else if (t === "number") out[k] = Number(e.value || 0);
    else if (t === "lines") out[k] = e.value.split("\n").map(s => s.trim()).filter(Boolean);
    else if (t === "date") out[k] = e.value ? new Date(e.value).toISOString() : null;
    else out[k] = e.value.trim();
  }
  return out;
}

function openForm(title, fields, item, onSave) {
  $("#dt").textContent = title;
  $("#fields").innerHTML = fields.map(f => fieldHTML(f, item ? item[f[0]] : "")).join("");
  $("#f").onsubmit = async e => {
    e.preventDefault();
    const data = readForm(fields);
    const ok = await safe(async () => {
      await onSave(data);
      return true;
    });
    if (ok) {
      $("#dlg").close();
      toast("Saved successfully", "success");
      show(cur);
    }
  };
  $("#dlg").showModal();
}

$("#cancel").onclick = () => $("#dlg").close();

/* ---------- LEADS VIEW (WITH DASHBOARD ON TOP) ---------- */
async function leadsView(m) {
  m.innerHTML = `<div class="loading-box"><div class="spinner"></div><p>Loading Leads & Dashboard...</p></div>`;

  const [leadsRes, clientsRes] = await Promise.all([
    safe(() => A.listLeads()),
    safe(() => A.listClients())
  ]);

  const L = leadsRes || [];
  const C = clientsRes || [];

  // Compute Dashboard Metrics
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const leadsThisWeek = L.filter(l => new Date(l.createdAt) >= weekAgo).length;
  const leadsThisMonth = L.filter(l => new Date(l.createdAt) >= monthStart).length;

  const convertedLeads = L.filter(l => l.status === "client").length;
  const conversionRate = L.length ? ((convertedLeads / L.length) * 100).toFixed(1) : "0";

  // Total MRR from Active Clients
  const activeClients = C.filter(c => c.status === "active");
  const totalMRR = activeClients.reduce((sum, c) => sum + (Number(c.monthlyAmount) || 0), 0);

  const cnt = s => L.filter(l => l.status === s).length;

  m.innerHTML = `
    <!-- Top KPI Dashboard Cards -->
    <div class="dashboard-kpis">
      <div class="kpi-card">
        <span class="kpi-label">Leads This Week</span>
        <span class="kpi-val">${leadsThisWeek}</span>
        <span class="kpi-sub">Last 7 days volume</span>
      </div>

      <div class="kpi-card kpi-month">
        <span class="kpi-label">Leads This Month</span>
        <span class="kpi-val">${leadsThisMonth}</span>
        <span class="kpi-sub">Total: ${L.length} all-time</span>
      </div>

      <div class="kpi-card kpi-conversion">
        <span class="kpi-label">Conversion Rate</span>
        <span class="kpi-val">${conversionRate}%</span>
        <span class="kpi-sub">${convertedLeads} converted to client</span>
      </div>

      <div class="kpi-card kpi-revenue">
        <span class="kpi-label">Active MRR</span>
        <span class="kpi-val">₹${totalMRR.toLocaleString("en-IN")}</span>
        <span class="kpi-sub">${activeClients.length} active paying clients</span>
      </div>
    </div>

    <!-- Leads Management Header -->
    <div class="row" style="margin-bottom:14px">
      <h2>Leads Pipeline</h2>
      <div style="display:flex;gap:8px">
        <button class="cta" id="addLeadBtn">+ Add Lead</button>
        <button class="sec" id="csvBtn">📥 CSV Export</button>
      </div>
    </div>

    <!-- Status Stats -->
    <div class="stats">
      <div class="stat"><b style="color:var(--tx)">${L.length}</b><span>Total</span></div>
      ${STATUS_LEADS.map(s => `
        <div class="stat"><b>${cnt(s)}</b><span>${s}</span></div>
      `).join("")}
    </div>

    <!-- Search, Filter & Sort Bar -->
    <div class="bar">
      <input id="leadSearch" type="text" placeholder="🔍 Search name or phone...">
      <select id="flt">
        <option value="">All Statuses</option>
        ${STATUS_LEADS.map(s => `<option value="${s}">${s.toUpperCase()}</option>`).join("")}
      </select>
      <select id="leadSort">
        <option value="desc">Sort: Newest First</option>
        <option value="asc">Sort: Oldest First</option>
      </select>
    </div>

    <div id="leadsList"></div>
  `;

  const draw = () => {
    const f = $("#flt").value;
    const q = ($("#leadSearch").value || "").toLowerCase().trim();
    const sortDir = $("#leadSort").value;

    let rows = L.filter(l => {
      const matchStatus = !f || l.status === f;
      const matchQuery = !q ||
        (l.name && l.name.toLowerCase().includes(q)) ||
        (l.phone && l.phone.includes(q)) ||
        (l.businessType && l.businessType.toLowerCase().includes(q));
      return matchStatus && matchQuery;
    });

    // Sort by date
    rows.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return sortDir === "asc" ? timeA - timeB : timeB - timeA;
    });

    const listEl = $("#leadsList");
    if (!rows.length) {
      listEl.innerHTML = `<div class="card" style="text-align:center;padding:32px"><p class="mut">Koi lead nahi mili.</p></div>`;
      return;
    }

    listEl.innerHTML = rows.map(l => {
      const rawPhone = String(l.phone || "").replace(/\D/g, "");
      const waPhone = rawPhone.length === 10 ? "91" + rawPhone : rawPhone;
      const dt = l.createdAt ? new Date(l.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "N/A";

      // Prefilled follow-up message
      const followUpMsg = `Hi ${l.name || ""}, this is from RYES regarding your inquiry about ${l.businessType || l.vertical || "our growth services"}. When would be a convenient time for a quick 5-min call to discuss?`;
      const waUrl = `https://wa.me/${esc(waPhone)}?text=${encodeURIComponent(followUpMsg)}`;

      return `
        <div class="card" data-id="${esc(l._id)}">
          <div class="row">
            <div>
              <b style="font-size:16px">${esc(l.name)}</b>
              <span class="tag">${esc(l.vertical || "other")}</span>
              <span class="tag">${esc(l.lang || "hi")}</span>
              <div class="mut" style="margin-top:4px">
                💼 ${esc(l.businessType || "Business")} · 📞 <a href="tel:${esc(rawPhone)}">${esc(l.phone)}</a> · 🕒 ${esc(dt)}
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:12px;color:var(--mut)">Status:</span>
              <select class="st" style="font-weight:600">
                ${STATUS_LEADS.map(s => `<option value="${esc(s)}" ${s === l.status ? "selected" : ""}>${esc(s.toUpperCase())}</option>`).join("")}
              </select>
            </div>
          </div>

          ${l.message ? `<div style="background:#090d16;padding:9px 12px;border-radius:8px;margin:10px 0;font-size:13.5px;border:1px solid #1a2238"><b>Message:</b> ${esc(l.message)}</div>` : ""}

          <div style="margin-top:8px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <label style="margin:0;font-size:12px">Notes:</label>
              <button type="button" class="sec save-note" style="padding:2px 8px;font-size:12px">Save Note</button>
            </div>
            <textarea class="nt" placeholder="Notes...">${esc(l.notes)}</textarea>
          </div>

          <div class="row" style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line)">
            <a class="btn-wa" href="${waUrl}" target="_blank" rel="noopener">
              💬 WhatsApp Follow-up
            </a>
            <button class="warn del" style="padding:6px 12px;font-size:13px">Delete</button>
          </div>
        </div>
      `;
    }).join("");
  };

  draw();
  $("#flt").onchange = draw;
  $("#leadSearch").oninput = draw;
  $("#leadSort").onchange = draw;

  // Manual Lead
  $("#addLeadBtn").onclick = () => {
    openForm("Add New Lead", FIELDS.manualLead, { vertical: "local", status: "new" }, async data => {
      await A.createLead(data);
    });
  };

  // CSV
  $("#csvBtn").onclick = () => {
    if (!L.length) return toast("No leads to export", "error");
    const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      "Name,Phone,BusinessType,Vertical,Status,Language,Message,Notes,CreatedAt",
      ...L.map(l => [l.name, l.phone, l.businessType, l.vertical, l.status, l.lang, l.message, l.notes, l.createdAt].map(q).join(","))
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `ryes-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // Lead Actions
  $("#leadsList").onclick = async e => {
    const c = e.target.closest(".card");
    if (!c) return;
    const id = c.dataset.id;
    const l = L.find(x => x._id === id);

    if (e.target.classList.contains("save-note")) {
      const notes = c.querySelector(".nt").value;
      await safe(async () => {
        await A.updateLead(id, { notes });
        if (l) l.notes = notes;
        toast("Note saved", "success");
      });
    }

    if (e.target.classList.contains("del")) {
      if (confirm(`Delete lead "${l ? l.name : ""}"?`)) {
        await safe(async () => {
          await A.deleteLead(id);
          toast("Lead deleted", "info");
          show("leads");
        });
      }
    }
  };

  $("#leadsList").onchange = async e => {
    const c = e.target.closest(".card");
    if (!c) return;
    const id = c.dataset.id;
    const l = L.find(x => x._id === id);

    if (e.target.classList.contains("st")) {
      const status = e.target.value;
      await safe(async () => {
        await A.updateLead(id, { status });
        if (l) l.status = status;
        toast(`Status updated to ${status.toUpperCase()}`, "success");
      });
    }
  };
}

/* ---------- CLIENTS VIEW (WITH 7-DAY RENEWAL WARNING) ---------- */
async function clientsView(m) {
  m.innerHTML = `<div class="loading-box"><div class="spinner"></div><p>Loading Clients...</p></div>`;

  const clients = (await safe(() => A.listClients())) || [];

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Check 7-day renewals
  const dueWithin7Days = clients.filter(c => {
    if (c.status !== "active" || !c.renewalDate) return false;
    const rDate = new Date(c.renewalDate);
    rDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((rDate - now) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  });

  const activeCnt = clients.filter(c => c.status === "active").length;
  const pausedCnt = clients.filter(c => c.status === "paused").length;
  const endedCnt = clients.filter(c => c.status === "ended").length;
  const activeMRR = clients.filter(c => c.status === "active").reduce((s, c) => s + (Number(c.monthlyAmount) || 0), 0);

  m.innerHTML = `
    <!-- Renewal Alert Banner -->
    ${dueWithin7Days.length ? `
      <div class="renewal-alert-banner">
        <div class="renewal-alert-text">
          <span class="badge">ACTION REQUIRED</span>
          <span>⚠️ <b>${dueWithin7Days.length} Client(s)</b> have renewal due in the next 7 days or overdue!</span>
        </div>
        <button class="sec" id="filterDueBtn" style="padding:4px 10px;font-size:12.5px">Show Due Clients</button>
      </div>
    ` : ""}

    <div class="row" style="margin-bottom:14px">
      <h2>Paying Clients</h2>
      <button class="cta" id="addClientBtn">+ Add Client</button>
    </div>

    <!-- Client Stats -->
    <div class="stats">
      <div class="stat"><b style="color:var(--tx)">${clients.length}</b><span>Total</span></div>
      <div class="stat"><b style="color:var(--grn)">${activeCnt}</b><span>Active</span></div>
      <div class="stat"><b style="color:var(--yellow)">${pausedCnt}</b><span>Paused</span></div>
      <div class="stat"><b style="color:var(--mut)">${endedCnt}</b><span>Ended</span></div>
      <div class="stat"><b style="color:var(--blue)">₹${activeMRR.toLocaleString("en-IN")}</b><span>Active MRR</span></div>
    </div>

    <!-- Filter & Search -->
    <div class="bar">
      <input id="clientSearch" type="text" placeholder="🔍 Search client or phone...">
      <select id="clientFlt">
        <option value="">All Statuses</option>
        ${STATUS_CLIENTS.map(s => `<option value="${s}">${s.toUpperCase()}</option>`).join("")}
      </select>
    </div>

    <div id="clientsList"></div>
  `;

  let filterDueOnly = false;

  const draw = () => {
    const f = $("#clientFlt").value;
    const q = ($("#clientSearch").value || "").toLowerCase().trim();

    const rows = clients.filter(c => {
      const matchStatus = !f || c.status === f;
      const matchQuery = !q ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.plan && c.plan.toLowerCase().includes(q));

      if (!matchStatus || !matchQuery) return false;

      if (filterDueOnly) {
        if (c.status !== "active" || !c.renewalDate) return false;
        const rDate = new Date(c.renewalDate);
        rDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((rDate - now) / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      }
      return true;
    });

    const listEl = $("#clientsList");
    if (!rows.length) {
      listEl.innerHTML = `<div class="card" style="text-align:center;padding:32px"><p class="mut">Koi client nahi mila.</p></div>`;
      return;
    }

    listEl.innerHTML = rows.map(c => {
      const rawPhone = String(c.phone || "").replace(/\D/g, "");
      const waPhone = rawPhone.length === 10 ? "91" + rawPhone : rawPhone;

      // Calculate Renewal Difference
      let dueBadge = "";
      let cardDueClass = "";

      if (c.renewalDate) {
        const rDate = new Date(c.renewalDate);
        rDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((rDate - now) / (1000 * 60 * 60 * 24));

        if (c.status === "active") {
          if (diffDays < 0) {
            dueBadge = `<span class="badge-due overdue">🚨 Overdue by ${Math.abs(diffDays)}d</span>`;
            cardDueClass = "due-overdue";
          } else if (diffDays <= 7) {
            dueBadge = `<span class="badge-due warn">⚠️ Renewal in ${diffDays === 0 ? "Today" : diffDays + "d"}</span>`;
            cardDueClass = "due-warning";
          } else {
            dueBadge = `<span class="badge-due ok">Renews in ${diffDays}d</span>`;
          }
        }
      }

      // WhatsApp Renewal / Follow-up Link
      const renewalMsg = `Hi ${c.name || ""}, this is from RYES. Friendly reminder regarding your subscription (${c.plan || "Monthly Plan"}) of ₹${(c.monthlyAmount || 0).toLocaleString("en-IN")}, due on ${formatDate(c.renewalDate)}. Please let us know if you need any assistance!`;
      const waUrl = `https://wa.me/${esc(waPhone)}?text=${encodeURIComponent(renewalMsg)}`;

      return `
        <div class="card ${cardDueClass} ${c.status === "ended" ? "off" : ""}" data-id="${esc(c._id)}">
          <div class="row">
            <div>
              <b style="font-size:16.5px">${esc(c.name)}</b>
              <span class="tag">${esc(c.vertical || "other")}</span>
              <span class="tag" style="color:${c.status === "active" ? "var(--grn)" : c.status === "paused" ? "var(--yellow)" : "var(--mut)"}">
                ${esc(c.status ? c.status.toUpperCase() : "ACTIVE")}
              </span>
              ${dueBadge}
              <div class="mut" style="margin-top:4px">
                📦 <b>${esc(c.plan || "Plan")}</b> · 💰 <b>₹${(c.monthlyAmount || 0).toLocaleString("en-IN")}/mo</b> · 📞 <a href="tel:${esc(rawPhone)}">${esc(c.phone)}</a>
              </div>
            </div>
            <div style="display:flex;gap:6px">
              <button class="sec ed" style="padding:6px 12px;font-size:13px">Edit</button>
              <button class="warn del" style="padding:6px 12px;font-size:13px">Delete</button>
            </div>
          </div>

          <div class="row" style="margin-top:10px;font-size:13px;color:var(--mut);background:#090d16;padding:8px 12px;border-radius:8px">
            <div>📅 Start: <b>${formatDate(c.startDate)}</b></div>
            <div>🔄 Renewal Date: <b style="color:#fff">${formatDate(c.renewalDate)}</b></div>
          </div>

          ${c.notes ? `<div style="margin-top:8px;font-size:13.5px;color:#D1D5DB"><b>Notes:</b> ${esc(c.notes)}</div>` : ""}

          <div class="row" style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line)">
            <a class="btn-wa" href="${waUrl}" target="_blank" rel="noopener">
              💬 WhatsApp Reminder
            </a>
            <span class="mut" style="font-size:12px">Last updated: ${formatDate(c.updatedAt || c.createdAt)}</span>
          </div>
        </div>
      `;
    }).join("");
  };

  draw();
  $("#clientFlt").onchange = draw;
  $("#clientSearch").oninput = draw;

  const dueBtn = $("#filterDueBtn");
  if (dueBtn) {
    dueBtn.onclick = () => {
      filterDueOnly = !filterDueOnly;
      dueBtn.textContent = filterDueOnly ? "Show All Clients" : "Show Due Clients";
      draw();
    };
  }

  // Add Client
  $("#addClientBtn").onclick = () => {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setDate(nextMonth.getDate() + 30);

    const defaults = {
      vertical: "education",
      status: "active",
      monthlyAmount: 10000,
      startDate: today.toISOString(),
      renewalDate: nextMonth.toISOString()
    };

    openForm("Add New Client", FIELDS.clients, defaults, async data => {
      await A.saveClient(null, data);
    });
  };

  // Edit / Delete delegation
  $("#clientsList").onclick = async e => {
    const c = e.target.closest(".card");
    if (!c) return;
    const id = c.dataset.id;
    const item = clients.find(x => x._id === id);
    if (!item) return;

    if (e.target.classList.contains("ed")) {
      openForm("Edit Client Details", FIELDS.clients, item, async data => {
        await A.saveClient(id, data);
      });
    }

    if (e.target.classList.contains("del")) {
      if (confirm(`Kya aap "${item.name}" ko delete karna chahte hain?`)) {
        await safe(async () => {
          await A.deleteClient(id);
          toast("Client deleted", "info");
          show("clients");
        });
      }
    }
  };
}

/* ---------- ITEMS VIEW (Pricing, Portfolio, Testimonials) ---------- */
function openPortfolioForm(title, item, onSave) {
  const dlg = $("#dlg");
  $("#dt").textContent = title;

  const currentMedia = item?.mediaUrl || "";
  const isVideoFile = currentMedia.startsWith("/uploads/") || /\.(mp4|webm|mov|mkv)$/i.test(currentMedia);
  const isWebsite = (item?.category || "").toLowerCase() === "website";

  $("#fields").innerHTML = `
    <!-- Work Type Switcher -->
    <div style="grid-column: 1 / -1; background:#0B0F1A; padding:12px 14px; border-radius:10px; border:1px solid #1F293D">
      <label style="font-weight:700; font-size:13.5px; color:#fff; display:block; margin-bottom:8px">
        Kaam Ka Type (Work Category) *
      </label>
      <div style="display:flex; gap:12px; flex-wrap:wrap">
        <label id="typeLabelWebsite" style="display:inline-flex; align-items:center; gap:8px; cursor:pointer; background:${isWebsite ? 'rgba(59,130,246,0.2)' : '#121829'}; padding:9px 16px; border-radius:8px; border:1px solid ${isWebsite ? 'var(--blue)' : '#1E2842'}; color:#fff; font-weight:600">
          <input type="radio" name="p_work_type" value="website" ${isWebsite ? "checked" : ""}> 🌐 Client Website Work
        </label>
        <label id="typeLabelVideo" style="display:inline-flex; align-items:center; gap:8px; cursor:pointer; background:${!isWebsite ? 'rgba(255,122,26,0.2)' : '#121829'}; padding:9px 16px; border-radius:8px; border:1px solid ${!isWebsite ? 'var(--orange)' : '#1E2842'}; color:#fff; font-weight:600">
          <input type="radio" name="p_work_type" value="video" ${!isWebsite ? "checked" : ""}> 🎬 Video / Reel Work
        </label>
      </div>
    </div>

    <!-- Common Title & Order Fields -->
    <div>
      <label for="p_title_en">Project Title (English) *</label>
      <input id="p_title_en" type="text" placeholder="e.g. Target Coaching Website / Physics Reel" value="${esc(item?.title_en || "")}" required>
    </div>
    <div>
      <label for="p_title_hi">Project Title (Hindi)</label>
      <input id="p_title_hi" type="text" placeholder="e.g. टारगेट कोचिंग वेबसाइट" value="${esc(item?.title_hi || "")}">
    </div>
    <div>
      <label for="p_order">Display Order</label>
      <input id="p_order" type="number" value="${esc(item?.order || 1)}">
    </div>
    <div class="chk">
      <input type="checkbox" id="p_visible" ${item?.visible !== false ? "checked" : ""}>
      <label for="p_visible" style="margin:0; cursor:pointer">Visible on Website</label>
    </div>

    <!-- 1. WEBSITE WORK FIELDS -->
    <div id="websiteFields" style="grid-column: 1 / -1; display: ${isWebsite ? 'grid' : 'none'}; gap: 14px; background:#0B132B; padding:14px; border-radius:10px; border:1px solid #1E3A8A">
      <div style="font-weight:700; color:#60A5FA; font-size:14px">🌐 Website Details</div>
      <div>
        <label for="p_web_url" style="color:#fff">Live Website Link (URL) *</label>
        <input id="p_web_url" type="text" placeholder="https://coaching.com ya https://mystore.in" value="${isWebsite ? esc(currentMedia) : ""}">
        <span class="mut" style="font-size:11.5px">Client ki live website ka link jise visitor click karke open kar sake.</span>
      </div>
      <div>
        <label for="p_web_thumb" style="color:#fff">Website Screenshot / Preview Image URL (Optional)</label>
        <input id="p_web_thumb" type="text" placeholder="https://.../screenshot.jpg" value="${isWebsite ? esc(item?.thumbUrl || "") : ""}">
        <span class="mut" style="font-size:11.5px">Website screenshot URL. Agar khali chhodenge to modern website mockup automatic lag jayega.</span>
      </div>
    </div>

    <!-- 2. VIDEO WORK FIELDS -->
    <div id="videoFields" style="grid-column: 1 / -1; display: ${!isWebsite ? 'grid' : 'none'}; gap: 14px; background:#181008; padding:14px; border-radius:10px; border:1px solid #7C2D12">
      <div style="font-weight:700; color:#FDBA74; font-size:14px">🎬 Video Details</div>

      <div>
        <label for="p_video_cat">Video Type</label>
        <select id="p_video_cat">
          <option value="reels" ${item?.category === "reels" ? "selected" : ""}>Lecture Reel / Short</option>
          <option value="video" ${item?.category === "video" ? "selected" : ""}>Full Video / Promo</option>
          <option value="social" ${item?.category === "social" ? "selected" : ""}>Social Media Edit</option>
        </select>
      </div>

      <!-- File upload -->
      <div style="background:#090d16; padding:12px; border-radius:8px; border:1px solid #1f293d">
        <label style="color:#fff; font-size:13.5px; margin-bottom:4px">
          📹 Direct Video File Upload (Up to 1GB - MP4, WebM, MOV)
        </label>
        <input type="file" id="p_video_file" accept="video/mp4,video/webm,video/quicktime,video/*">

        <div id="p_upload_progress" style="display:none; margin-top:10px">
          <div class="progress-bar-wrap">
            <div id="p_progress_fill" class="progress-bar-fill"></div>
          </div>
          <span id="p_progress_text" class="mut" style="font-size:12px">Uploading: 0%</span>
        </div>

        ${(!isWebsite && currentMedia) ? `
          <div style="margin-top:10px; padding-top:10px; border-top:1px solid var(--line)">
            <div class="mut" style="font-size:12px; margin-bottom:4px">Current: <b>${esc(currentMedia)}</b></div>
            ${isVideoFile ? `
              <video src="${esc(resolveMedia(currentMedia))}" controls preload="metadata" style="max-height:140px; max-width:100%; border-radius:6px; background:#000; display:block"></video>
            ` : `
              <a href="${esc(currentMedia)}" target="_blank" rel="noopener" style="font-size:13px">View Link ↗</a>
            `}
          </div>
        ` : ""}
      </div>

      <div>
        <label for="p_vid_url">Or YouTube / Instagram Reel Link (Optional)</label>
        <input id="p_vid_url" type="text" placeholder="https://youtube.com/watch?v=... ya https://instagram.com/reel/..." value="${!isWebsite ? esc(currentMedia) : ""}">
      </div>

      <div>
        <label for="p_vid_thumb">Custom Video Thumbnail URL (Optional)</label>
        <input id="p_vid_thumb" type="text" placeholder="https://.../thumb.jpg" value="${!isWebsite ? esc(item?.thumbUrl || "") : ""}">
      </div>
    </div>
  `;

  // Toggle switcher
  const updateTypeView = type => {
    const isW = type === "website";
    $("#websiteFields").style.display = isW ? "grid" : "none";
    $("#videoFields").style.display = !isW ? "grid" : "none";
    $("#typeLabelWebsite").style.borderColor = isW ? "var(--blue)" : "#1E2842";
    $("#typeLabelWebsite").style.background = isW ? "rgba(59,130,246,0.2)" : "#121829";
    $("#typeLabelVideo").style.borderColor = !isW ? "var(--orange)" : "#1E2842";
    $("#typeLabelVideo").style.background = !isW ? "rgba(255,122,26,0.2)" : "#121829";
  };

  $$('input[name="p_work_type"]').forEach(radio => {
    radio.addEventListener("change", e => updateTypeView(e.target.value));
  });

  const form = $("#f");
  const saveBtn = form.querySelector("button.cta");
  const origSaveText = saveBtn.textContent;

  form.onsubmit = async e => {
    e.preventDefault();

    const workType = $('input[name="p_work_type"]:checked')?.value || "website";
    const title_en = $("#p_title_en").value.trim();
    const title_hi = $("#p_title_hi").value.trim();
    const order = Number($("#p_order").value || 1);
    const visible = $("#p_visible").checked;

    if (!title_en) {
      return toast("Project Title (English) zaroori hai", "error");
    }

    let mediaUrl = "";
    let thumbUrl = "";
    let category = "website";

    if (workType === "website") {
      let webUrl = $("#p_web_url").value.trim();
      if (!webUrl) {
        return toast("Kripya Live Website ka URL daalein (e.g. https://...)", "error");
      }
      if (!/^https?:\/\//i.test(webUrl)) {
        webUrl = "https://" + webUrl;
      }
      mediaUrl = webUrl;
      thumbUrl = $("#p_web_thumb").value.trim();
      category = "website";
    } else {
      category = $("#p_video_cat").value || "video";
      thumbUrl = $("#p_vid_thumb").value.trim();
      mediaUrl = $("#p_vid_url").value.trim();

      const fileInput = $("#p_video_file");
      const file = fileInput && fileInput.files && fileInput.files[0];

      if (file) {
        if (file.size > 1024 * 1024 * 1024) {
          return toast("Video file ka size 1GB se zyada hai", "error");
        }

        const progressBox = $("#p_upload_progress");
        const progressFill = $("#p_progress_fill");
        const progressText = $("#p_progress_text");

        progressBox.style.display = "block";
        saveBtn.disabled = true;

        try {
          const uploadRes = await A.uploadVideo(file, (percent, loaded, total) => {
            progressFill.style.width = percent + "%";
            const loadedMB = (loaded / (1024 * 1024)).toFixed(1);
            const totalMB = (total / (1024 * 1024)).toFixed(1);
            progressText.textContent = `Uploading: ${percent}% (${loadedMB} MB / ${totalMB} MB)...`;
            saveBtn.textContent = `Uploading (${percent}%)...`;
          });
          mediaUrl = uploadRes.mediaUrl;
        } catch (uploadErr) {
          saveBtn.disabled = false;
          saveBtn.textContent = origSaveText;
          return toast("Video upload fail: " + uploadErr.message, "error");
        }
      }

      if (!mediaUrl) {
        return toast("Kripya ek video file upload karein ya YouTube/Reel link daalein", "error");
      }
    }

    const payload = {
      title_en,
      title_hi,
      category,
      order,
      mediaUrl,
      thumbUrl,
      visible
    };

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    const ok = await safe(async () => {
      await onSave(payload);
      return true;
    });

    saveBtn.disabled = false;
    saveBtn.textContent = origSaveText;

    if (ok) {
      dlg.close();
      toast("Portfolio successfully save ho gaya!", "success");
      show("portfolio");
    }
  };

  dlg.showModal();
}

async function itemsView(m, col) {
  m.innerHTML = `<div class="loading-box"><div class="spinner"></div><p>Loading ${esc(col)}...</p></div>`;

  const items = (await safe(() => A.listItems(col))) || [];
  let activePortFilter = "all";

  function renderList() {
    const isPort = col === "portfolio";
    const filtered = items.filter(i => {
      if (!isPort || activePortFilter === "all") return true;
      const isWeb = (i.category || "").toLowerCase() === "website";
      if (activePortFilter === "website") return isWeb;
      if (activePortFilter === "video") return !isWeb;
      return true;
    });

    const webCount = items.filter(i => (i.category || "").toLowerCase() === "website").length;
    const vidCount = items.filter(i => (i.category || "").toLowerCase() !== "website").length;

    m.innerHTML = `
      <div class="row" style="margin-bottom:14px">
        <h2 style="text-transform:capitalize">${esc(col)} Management</h2>
        <button class="cta" id="addItemBtn">+ Add New ${col === "portfolio" ? "Work / Project" : esc(col.slice(0, -1))}</button>
      </div>

      ${isPort ? `
        <div style="display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap">
          <button class="sec ${activePortFilter === 'all' ? 'active' : ''}" id="filterAll" style="font-size:13px; padding:6px 14px; ${activePortFilter === 'all' ? 'background:var(--blue);color:#fff;border-color:var(--blue)' : ''}">
            All Projects (${items.length})
          </button>
          <button class="sec ${activePortFilter === 'website' ? 'active' : ''}" id="filterWeb" style="font-size:13px; padding:6px 14px; ${activePortFilter === 'website' ? 'background:var(--blue);color:#fff;border-color:var(--blue)' : ''}">
            🌐 Websites (${webCount})
          </button>
          <button class="sec ${activePortFilter === 'video' ? 'active' : ''}" id="filterVid" style="font-size:13px; padding:6px 14px; ${activePortFilter === 'video' ? 'background:var(--orange);color:#fff;border-color:var(--orange)' : ''}">
            🎬 Videos & Reels (${vidCount})
          </button>
        </div>
      ` : ""}

      <div id="colList">
        ${filtered.map(i => {
          const isWeb = (i.category || "").toLowerCase() === "website";
          const isVideo = !isWeb && i.mediaUrl && (i.mediaUrl.startsWith('/uploads/') || /\.(mp4|webm|mov|mkv)$/i.test(i.mediaUrl));
          return `
          <div class="card ${i.visible === false ? "off" : ""}" data-id="${esc(i._id)}">
            <div class="row">
              <div>
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px">
                  ${isPort ? (isWeb
                    ? '<span class="tag" style="background:#1E3A8A;color:#93C5FD;font-weight:700">🌐 WEBSITE</span>'
                    : '<span class="tag" style="background:#7C2D12;color:#FDBA74;font-weight:700">🎬 VIDEO</span>') : ""}
                  <b style="font-size:16px">${TITLE[col](i)}</b>
                </div>
                <div class="mut" style="font-size:12.5px; margin-top:4px">
                  Order: ${esc(i.order || 0)}
                  ${i.visible === false ? ' · <span style="color:var(--red)">Hidden</span>' : ' · <span style="color:var(--grn)">Visible</span>'}
                  ${i.popular ? ' · <span style="color:var(--org)">⭐ Popular</span>' : ""}
                  ${!isPort && i.category ? ` · <span class="tag">${esc(i.category)}</span>` : ""}
                  ${isWeb ? ` · Live URL: <a href="${esc(i.mediaUrl)}" target="_blank" rel="noopener" style="color:#60A5FA;text-decoration:underline">${esc(i.mediaUrl)} ↗</a>` : ""}
                  ${!isPort && i.rating ? ` · Rating: ${"⭐".repeat(i.rating)}` : ""}
                </div>
                ${isVideo ? `
                  <div style="margin-top:8px">
                    <video src="${esc(resolveMedia(i.mediaUrl))}" controls preload="metadata" style="max-height:140px;max-width:280px;border-radius:8px;background:#000;display:block"></video>
                  </div>
                ` : (isWeb && i.thumbUrl ? `
                  <div style="margin-top:8px">
                    <img src="${esc(i.thumbUrl)}" style="max-height:90px;max-width:180px;border-radius:6px;object-fit:cover;border:1px solid #1f293d">
                  </div>
                ` : (!isWeb && i.mediaUrl ? `<div class="mut" style="margin-top:2px">Video Link: <a href="${esc(i.mediaUrl)}" target="_blank" rel="noopener">${esc(i.mediaUrl)}</a></div>` : ""))}
              </div>
              <div style="display:flex;gap:6px">
                <button class="sec ed">Edit</button>
                <button class="warn del">Delete</button>
              </div>
            </div>
          </div>
        `;
        }).join("") || `<div class="card" style="text-align:center;padding:32px"><p class="mut">Kuch nahi hai. Naya work add karein.</p></div>`}
      </div>
    `;

    // Filter button actions
    if (isPort) {
      $("#filterAll").onclick = () => { activePortFilter = "all"; renderList(); };
      $("#filterWeb").onclick = () => { activePortFilter = "website"; renderList(); };
      $("#filterVid").onclick = () => { activePortFilter = "video"; renderList(); };
    }

    $("#addItemBtn").onclick = () => {
      if (col === "portfolio") {
        openPortfolioForm("Add Portfolio Project", defaults, d => A.saveItem(col, null, d));
      } else {
        openForm(`Add New ${col}`, FIELDS[col], defaults, d => A.saveItem(col, null, d));
      }
    };
  }

  const defaults = {
    visible: true,
    order: items.length + 1,
    rating: 5,
    vertical: "local",
    period: "month",
    price: 0,
    category: "website"
  };

  renderList();

  m.onclick = async e => {
    const c = e.target.closest(".card");
    if (!c) return;
    const it = items.find(x => x._id === c.dataset.id);
    if (!it) return;

    if (e.target.classList.contains("ed")) {
      if (col === "portfolio") {
        openPortfolioForm((it.category || "").toLowerCase() === "website" ? "Edit Website Project" : "Edit Video / Reel Project", it, d => A.saveItem(col, it._id, d));
      } else {
        openForm(`Edit ${col}`, FIELDS[col], it, d => A.saveItem(col, it._id, d));
      }
    }

    if (e.target.classList.contains("del")) {
      if (confirm(`Delete karna hai?`)) {
        await safe(async () => {
          await A.deleteItem(col, it._id);
          toast("Item deleted", "info");
          show(col);
        });
      }
    }
  };
}

/* ---------- TESTIMONIALS / RATINGS VIEW WITH APPROVAL SYSTEM ---------- */
async function testimonialsView(m) {
  m.innerHTML = `<div class="loading-box"><div class="spinner"></div><p>Loading Reviews & Ratings...</p></div>`;

  const items = (await safe(() => A.listItems("testimonials"))) || [];

  const pending = items.filter(i => i.visible === false);
  const approved = items.filter(i => i.visible !== false);

  m.innerHTML = `
    <!-- Pending Approval Banner Alert -->
    ${pending.length ? `
      <div class="renewal-alert-banner" style="background:rgba(245, 158, 11, 0.15);border-color:rgba(245, 158, 11, 0.4)">
        <div class="renewal-alert-text">
          <span class="badge">NEW REVIEWS</span>
          <span>🔔 <b>${pending.length} New Review(s)</b> website se submit hue hain jo aapke approval ke intezaar me hain!</span>
        </div>
        <button class="sec" id="filterPendingOnlyBtn" style="padding:4px 10px;font-size:12.5px">Show Pending Reviews</button>
      </div>
    ` : ""}

    <div class="row" style="margin-bottom:14px">
      <h2>Client Reviews & Ratings</h2>
      <button class="cta" id="addTestimonialBtn">+ Add New Review</button>
    </div>

    <!-- Review Stats -->
    <div class="stats">
      <div class="stat"><b style="color:var(--tx)">${items.length}</b><span>Total Reviews</span></div>
      <div class="stat"><b style="color:var(--yellow)">${pending.length}</b><span>Pending Approval</span></div>
      <div class="stat"><b style="color:var(--grn)">${approved.length}</b><span>Approved (Live)</span></div>
    </div>

    <!-- Filter Bar -->
    <div class="bar">
      <input id="reviewSearch" type="text" placeholder="🔍 Search by client name or feedback...">
      <select id="reviewFlt">
        <option value="">All Reviews (${items.length})</option>
        <option value="pending">Pending Approval (${pending.length})</option>
        <option value="approved">Approved & Live (${approved.length})</option>
      </select>
    </div>

    <div id="reviewsList"></div>
  `;

  let pendingOnly = false;

  const draw = () => {
    const f = $("#reviewFlt").value;
    const q = ($("#reviewSearch").value || "").toLowerCase().trim();

    const rows = items.filter(i => {
      const isPending = i.visible === false;
      const matchFilter = !f || (f === "pending" ? isPending : !isPending);
      const matchQuery = !q ||
        (i.name && i.name.toLowerCase().includes(q)) ||
        (i.role && i.role.toLowerCase().includes(q)) ||
        (i.text_hi && i.text_hi.toLowerCase().includes(q)) ||
        (i.text_en && i.text_en.toLowerCase().includes(q));

      if (!matchFilter || !matchQuery) return false;
      if (pendingOnly && !isPending) return false;
      return true;
    });

    const listEl = $("#reviewsList");
    if (!rows.length) {
      listEl.innerHTML = `<div class="card" style="text-align:center;padding:32px"><p class="mut">Koi review nahi mila.</p></div>`;
      return;
    }

    listEl.innerHTML = rows.map(i => {
      const isPending = i.visible === false;
      const reviewText = i.text_hi || i.text_en || "";

      return `
        <div class="card ${isPending ? "due-warning" : ""}" data-id="${esc(i._id)}">
          <div class="row">
            <div>
              <div style="display:flex;align-items:center;gap:8px">
                <b style="font-size:16px">${esc(i.name)}</b>
                ${i.role ? `<span class="mut">(${esc(i.role)})</span>` : ""}
                ${isPending
                  ? `<span class="badge-due warn">🟡 Pending Approval</span>`
                  : `<span class="badge-due ok">🟢 Live on Site</span>`
                }
              </div>
              <div style="color:#FBBF24;margin-top:4px;font-size:14px">
                ${"⭐".repeat(i.rating || 5)} <span class="mut" style="font-size:12px">(${i.rating || 5} Stars)</span>
              </div>
            </div>

            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${isPending ? `
                <button class="cta app-btn" style="background:#065F46;border:1px solid #10B981;color:#fff;padding:6px 14px;font-size:13px">
                  ✓ Approve & Publish
                </button>
              ` : `
                <button class="sec unapp-btn" style="padding:6px 12px;font-size:13px">
                  Hide from Site
                </button>
              `}
              <button class="sec ed" style="padding:6px 12px;font-size:13px">Edit</button>
              <button class="warn del" style="padding:6px 12px;font-size:13px">Delete</button>
            </div>
          </div>

          <div style="background:#090d16;padding:10px 14px;border-radius:8px;margin-top:10px;font-size:14px;color:#E2E8F0;border:1px solid #1f293d">
            “${esc(reviewText)}”
          </div>
          ${(i.text_en && i.text_hi && i.text_en !== i.text_hi) ? `
            <div class="mut" style="margin-top:6px;font-size:12.5px">
              <b>English version:</b> “${esc(i.text_en)}”
            </div>
          ` : ""}
        </div>
      `;
    }).join("");
  };

  draw();
  $("#reviewFlt").onchange = draw;
  $("#reviewSearch").oninput = draw;

  const filterPendingBtn = $("#filterPendingOnlyBtn");
  if (filterPendingBtn) {
    filterPendingBtn.onclick = () => {
      pendingOnly = !pendingOnly;
      filterPendingBtn.textContent = pendingOnly ? "Show All Reviews" : "Show Pending Reviews";
      draw();
    };
  }

  // Add Manual Review
  $("#addTestimonialBtn").onclick = () => {
    openForm("Add Client Review", FIELDS.testimonials, { visible: true, rating: 5, order: items.length + 1 }, async d => {
      await A.saveItem("testimonials", null, d);
    });
  };

  // Actions delegation (Approve, Unpublish, Edit, Delete)
  $("#reviewsList").onclick = async e => {
    const c = e.target.closest(".card");
    if (!c) return;
    const id = c.dataset.id;
    const it = items.find(x => x._id === id);
    if (!it) return;

    // Approve
    if (e.target.classList.contains("app-btn")) {
      await safe(async () => {
        await A.saveItem("testimonials", id, { visible: true });
        it.visible = true;
        toast("Review approve ho gaya aur website par live hai!", "success");
        testimonialsView(m);
      });
    }

    // Unpublish / Hide
    if (e.target.classList.contains("unapp-btn")) {
      await safe(async () => {
        await A.saveItem("testimonials", id, { visible: false });
        it.visible = false;
        toast("Review ko website se hide kar diya gaya", "info");
        testimonialsView(m);
      });
    }

    // Edit
    if (e.target.classList.contains("ed")) {
      openForm("Edit Review Details", FIELDS.testimonials, it, async d => {
        await A.saveItem("testimonials", id, d);
      });
    }

    // Delete
    if (e.target.classList.contains("del")) {
      if (confirm(`Kya aap "${it.name}" ka review delete karna chahte hain?`)) {
        await safe(async () => {
          await A.deleteItem("testimonials", id);
          toast("Review deleted", "info");
          testimonialsView(m);
        });
      }
    }
  };
}

/* ---------- SETTINGS VIEW ---------- */
async function settingsView(m) {
  m.innerHTML = `<div class="loading-box"><div class="spinner"></div><p>Loading Settings...</p></div>`;

  const s = (await safe(() => A.getSettings())) || {};

  m.innerHTML = `
    <h2>Site Settings</h2>
    <form id="sf" class="card">
      <div class="grid">
        ${FIELDS.settings.map(f => fieldHTML(f, s[f[0]])).join("")}
      </div>
      <button class="cta" style="margin-top:16px;width:auto">💾 Save Settings</button>
    </form>

    <div class="card" style="margin-top:20px">
      <b>Default Data (Seed)</b>
      <p class="mut" style="margin:6px 0 12px">
        Database me pehli baar dummy pricing aur settings bharta hai.
      </p>
      <button class="sec" id="seedBtn">Seed Database Now</button>
    </div>
  `;

  $("#sf").onsubmit = async e => {
    e.preventDefault();
    await safe(async () => {
      await A.saveSettings(readForm(FIELDS.settings));
      toast("Settings saved", "success");
    });
  };

  $("#seedBtn").onclick = async () => {
    if (confirm("Default Pricing aur Settings database me seed karni hai?")) {
      await safe(async () => {
        await A.seedDefaults();
        toast("Seed complete!", "success");
        show("settings");
      });
    }
  };
}

/* ---------- APP NAVIGATION & AUTH ---------- */
let cur = "leads";

async function show(tab) {
  cur = tab;
  $$("#nav button").forEach(b => b.classList.toggle("on", b.dataset.t === tab));
  const m = $("#main");
  m.onclick = null;

  if (tab === "leads") await leadsView(m);
  else if (tab === "clients") await clientsView(m);
  else if (tab === "testimonials") await testimonialsView(m);
  else if (tab === "settings") await settingsView(m);
  else await itemsView(m, tab);

  if (!A.currentUser()) start();
}

function start() {
  const u = A.currentUser();
  $("#login").hidden = !!u;
  $("#app").hidden = !u;

  if (!u) return;

  const emailDisplay = $("#userEmail");
  if (emailDisplay) emailDisplay.textContent = u.email || "Admin";

  $("#nav").innerHTML = TABS.map(t => `<button data-t="${esc(t)}" style="text-transform:capitalize">${esc(t)}</button>`).join("");
  $("#nav").onclick = e => e.target.dataset.t && show(e.target.dataset.t);
  show(cur);
}

// Login Form
$("#login").onsubmit = async e => {
  e.preventDefault();
  const btn = $("#loginBtn");
  btn.textContent = "Logging in...";
  btn.disabled = true;

  const ok = await safe(async () => {
    await A.login($("#em").value, $("#pw").value);
    return true;
  });

  btn.textContent = "Login";
  btn.disabled = false;

  if (ok) {
    $("#pw").value = "";
    toast("Welcome back!", "success");
    start();
  }
};

// Logout
$("#out").onclick = () => {
  A.logout();
  toast("Logged out", "info");
  start();
};

start();

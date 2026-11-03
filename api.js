// Frontend se backend (MongoDB API) tak ka connection.
// Computer/Phone par port 5000, GitHub Pages par Render backend URL, aur Render par origin se connect hota hai.
export const RENDER_BACKEND_URL = "https://ryes-technology.onrender.com";

export const API_BASE = (typeof window !== "undefined")
  ? (window.RYES_API_BASE ||
     (window.location.hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname)
       ? `${window.location.protocol}//${window.location.hostname}:5000/api`
       : (window.location.hostname.endsWith("github.io")
           ? `${RENDER_BACKEND_URL}/api`
           : `${window.location.origin}/api`)))
  : "http://localhost:5000/api";

const TOKEN_KEY = "ryes_admin_token";
export const getToken = () => sessionStorage.getItem(TOKEN_KEY);

async function req(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = "Bearer " + token;
  }
  const res = await fetch(API_BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && auth) logout();
  if (!res.ok) throw new Error(data.error || "Request fail ho gayi");
  return data;
}

/* ---------- PUBLIC (website) ---------- */
export const getHealth       = () => req("/health");
export const getSettings     = () => req("/settings");
export const getPricing      = () => req("/pricing");
export const getPortfolio    = () => req("/portfolio");
export const getTestimonials = () => req("/testimonials");

// website = hidden honeypot field (form me khali rehna chahiye)
export const submitLead = ({ name, phone, businessType, vertical, message, lang, website }) =>
  req("/leads", { method: "POST", body: { name, phone, businessType, vertical, message, lang, website } });

// Public Testimonial / Review Submission
export const submitReview = ({ name, role, rating, text, lang, website }) =>
  req("/testimonials", { method: "POST", body: { name, role, rating, text, lang, website } });

/* ---------- ADMIN ---------- */
export async function login(email, password) {
  const { token } = await req("/auth/login", { method: "POST", body: { email, password } });
  sessionStorage.setItem(TOKEN_KEY, token);
  return token;
}
export const logout = () => sessionStorage.removeItem(TOKEN_KEY);

// Token valid hai to {email} milega, warna null
export function currentUser() {
  const t = getToken();
  if (!t) return null;
  try {
    const p = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return p.exp * 1000 > Date.now() ? { email: p.email } : null;
  } catch { return null; }
}

export const listLeads    = () => req("/admin/leads", { auth: true });
export const createLead   = data => req("/admin/leads", { method: "POST", body: data, auth: true });
export const updateLead   = (id, data) => req("/admin/leads/" + id, { method: "PATCH", body: data, auth: true });
export const deleteLead   = id => req("/admin/leads/" + id, { method: "DELETE", auth: true });

/* ---------- CLIENTS ---------- */
export const listClients  = () => req("/admin/clients", { auth: true });
export const saveClient   = (id, data) =>
  id ? req(`/admin/clients/${id}`, { method: "PUT", body: data, auth: true })
     : req("/admin/clients", { method: "POST", body: data, auth: true });
export const deleteClient = id => req(`/admin/clients/${id}`, { method: "DELETE", auth: true });

// col = "pricing" | "portfolio" | "testimonials"  (admin ko hidden items bhi dikhte hain)
export const listItems  = col => req("/admin/" + col, { auth: true });
export const saveItem   = (col, id, data) =>
  id ? req(`/admin/${col}/${id}`, { method: "PUT", body: data, auth: true })
     : req("/admin/" + col, { method: "POST", body: data, auth: true });
export const deleteItem = (col, id) => req(`/admin/${col}/${id}`, { method: "DELETE", auth: true });

// Video Upload Helper (Up to 1GB with real-time percentage progress)
export function uploadVideo(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("video", file);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent, e.loaded, e.total);
        }
      };
    }

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
        } else {
          reject(new Error(data.error || "Video upload failed"));
        }
      } catch {
        reject(new Error("Invalid response from server"));
      }
    };

    xhr.onerror = () => reject(new Error("Network connection error during upload"));
    xhr.open("POST", API_BASE + "/admin/upload");
    const token = getToken();
    if (token) xhr.setRequestHeader("Authorization", "Bearer " + token);
    xhr.send(formData);
  });
}

export const saveSettings = data => req("/admin/settings", { method: "PUT", body: data, auth: true });
export const seedDefaults = () => req("/admin/seed", { method: "POST", auth: true });

# RYES Technology 🚀

Official website and Admin Dashboard for **RYES Technology** (Founder: Satyam Maurya), a full-service digital growth agency catering to Education/Coaching institutes and Local Businesses pan-India.

---

## ✨ Features

- **Public Website (`index.html`)**:
  - Dark, premium, techy aesthetic.
  - Bilingual switcher: English & Romanized Hinglish (`js/i18n.js`).
  - Native HTML5 Video Player embedded directly on site (supports up to 1GB video uploads, playsinline, fullscreen).
  - Public Rating & Review submission modal (1-5 stars with honeypot anti-spam protection).
  - Interactive pricing tabs with WhatsApp lead capture CTAs.
  - Free audit / lead capture form with instant WhatsApp follow-up link.
  - Zero frameworks, pure Vanilla JS (ES Modules) and CSS3.

- **Admin Dashboard (`admin/index.html`)**:
  - Secure JWT authentication with bcrypt password hashing.
  - **Leads Tab**: Track incoming inquiries, search by name/phone, sort by date, 1-click WhatsApp customer reply.
  - **Clients CRM**: Track active/paused/ended retainers, monthly recurring revenue (MRR), and "Renewal due in 7 days" auto-alerts.
  - **Portfolio Manager**: Direct 1GB video uploader with real-time percentage progress bar and inline video preview.
  - **Reviews Management**: Pending / Approved review filter tabs with 1-click "Approve & Publish" or "Hide from site".
  - **Settings & Pricing Management**: Edit hero headlines, WhatsApp numbers, social handles, and service packages dynamically.

- **Backend (`server.js`)**:
  - Node.js & Express.js REST API.
  - MongoDB Atlas database integration.
  - Multer video upload storage with HTTP byte-range video streaming.
  - Helmet, CORS, and Express rate limiting protection.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Modern CSS3 (CSS Variables, Flexbox, Grid), Vanilla JavaScript (ES6 Modules).
- **Backend**: Node.js, Express.js, Multer.
- **Database**: MongoDB Atlas (Mongoose ODM).
- **Authentication**: JSON Web Tokens (JWT) + Bcrypt.js.

---

## 🚀 Quick Start (Local Setup)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/ryes.git
   cd ryes
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Update `.env` with your MongoDB Atlas URI and secrets.

4. **Start the Server:**
   ```bash
   npm start
   ```
   - Main Website: `http://localhost:5000`
   - Admin Panel: `http://localhost:5000/admin/index.html`

---

## 🌐 Free Cloud Deployment (e.g. Render.com)

1. Push this repository to GitHub.
2. Sign in to [Render.com](https://render.com) (Free tier) with GitHub.
3. Click **New +** -> **Web Service** -> select your `ryes` repository.
4. Settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Under **Environment Variables**, add the values from your `.env`:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD_HASH`
   - `CORS_ORIGIN`
   - `PORT`: `5000`
6. Click **Deploy Web Service**! Your website and admin panel will be live on a free `https://<your-app>.onrender.com` URL with SSL included.

---

## 👤 Author
- **Satyam Maurya** - Founder, RYES Technology

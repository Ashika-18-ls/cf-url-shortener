# 🔗 Cloud URL Shortener — 100% Free, No Credit Card Required

A production-quality, serverless URL shortener built entirely on **free-tier
cloud-native services that require no payment method to sign up.** Built as
a Cloud Computing / Serverless portfolio project.

---

## 📖 Project Overview

This application lets a user paste a long URL and receive a short, shareable
link that redirects to the original destination and tracks click counts.
Unlike the traditional AWS version of this project (Lambda + API Gateway +
DynamoDB + S3), everything here runs on **Cloudflare's free tier** and
**GitHub Pages** — no AWS account, no credit card, no risk of surprise
charges.

It is designed to demonstrate the same cloud engineering concepts as an
AWS-based serverless app: edge compute, a managed database, infrastructure
automation, CI/CD, and a decoupled frontend/backend architecture.

---

## 🏗️ Architecture Diagram

```
                         ┌─────────────────────────┐
                         │      GitHub Pages        │
                         │   (Static Frontend)       │
                         │  HTML + CSS + JavaScript  │
                         └────────────┬──────────────┘
                                      │  fetch() over HTTPS
                                      ▼
                         ┌─────────────────────────┐
                         │    Cloudflare Worker      │
                         │  (Edge compute — backend)  │
                         │                            │
                         │  POST /api/shorten         │
                         │  GET  /:code  (redirect)   │
                         │  GET  /api/stats/:code     │
                         └────────────┬──────────────┘
                                      │  SQL queries
                                      ▼
                         ┌─────────────────────────┐
                         │      Cloudflare D1         │
                         │   (SQLite at the edge)      │
                         │   links: short_code,        │
                         │   original_url, clicks       │
                         └─────────────────────────┘

                 CI/CD: GitHub Actions deploys the Worker
                 and publishes the frontend on every push to main.
```

---

## 🧰 Technologies Used

| Layer          | Technology                         | Purpose                                   |
|----------------|-------------------------------------|--------------------------------------------|
| Frontend       | HTML, CSS, vanilla JavaScript       | UI for creating and copying short links     |
| Frontend host  | GitHub Pages                        | Free static site hosting                   |
| Backend        | Cloudflare Workers (JavaScript)     | Serverless edge compute — API logic         |
| Database       | Cloudflare D1 (SQLite at the edge)  | Stores short_code → URL mappings + clicks   |
| CI/CD          | GitHub Actions                      | Auto-deploy Worker + Pages on every push    |
| Version control| Git + GitHub                        | Source control, collaboration               |
| Logging        | Cloudflare dashboard (Workers Logs) | Request/error visibility, no setup required |

**Why this replaces the AWS stack 1:1:**

| AWS (paid-tier risk)     | Free replacement       | Why it's equivalent                                  |
|----------------------------|--------------------------|--------------------------------------------------------|
| Lambda                     | Cloudflare Workers        | Both are serverless, pay-per-request compute            |
| API Gateway                | Worker Routes              | Workers natively handle HTTP routing — no separate gateway needed |
| DynamoDB                   | Cloudflare D1               | Both are managed, serverless databases                  |
| S3 static website           | GitHub Pages                | Both serve static files over HTTPS for free              |
| CloudWatch                  | Cloudflare dashboard logs   | Built-in request/error logs, zero configuration          |
| IAM                          | *(removed)*                 | Not needed — Workers/D1 access is scoped by the account itself |

---

## ✨ Features

- Shorten any valid `http://` or `https://` URL
- Cryptographically random, collision-safe 6-character short codes
- Redirect from short code to original URL (HTTP 302)
- Per-link click tracking, stored in D1
- Input validation on both frontend and backend
- Graceful error handling with clear messages and correct HTTP status codes
- REST API (JSON in/out)
- Copy-to-clipboard button with visual confirmation
- Loading spinner during requests
- Mobile-friendly, responsive single-page UI
- Zero-cost hosting for both frontend and backend

---

## 📁 Folder Structure

```
project-name/
├── frontend/
│   ├── index.html        # Page markup
│   ├── style.css         # Responsive styling
│   └── script.js         # Calls the Worker API, handles UI state
├── worker/
│   ├── index.js           # Worker backend — all API logic
│   ├── schema.sql          # D1 table definition
│   ├── wrangler.toml        # Worker + D1 binding configuration
│   └── package.json          # Worker dependencies/scripts
├── .github/
│   └── workflows/
│       └── deploy.yml         # CI/CD — deploys Worker + Pages on push
├── README.md
├── .gitignore
└── LICENSE
```

---

## 🔌 API Documentation

Base URL: your deployed Worker URL, e.g.
`https://url-shortener-worker.yourname.workers.dev`

### `POST /api/shorten`
Create a new short link.

**Request body:**
```json
{ "url": "https://example.com/some/very/long/path" }
```

**Success response — `201 Created`:**
```json
{
  "short_code": "aZ3kP9",
  "original_url": "https://example.com/some/very/long/path"
}
```

**Error response — `400 Bad Request`:**
```json
{ "error": "Please provide a valid URL starting with http:// or https://" }
```

---

### `GET /:code`
Redirects to the original URL and increments the click counter.

- **`302 Found`** — redirects via `Location` header
- **`404 Not Found`** — code doesn't exist:
  ```json
  { "error": "Short link not found." }
  ```

---

### `GET /api/stats/:code`
Returns metadata and click count for a short code.

**Success response — `200 OK`:**
```json
{
  "short_code": "aZ3kP9",
  "original_url": "https://example.com/some/very/long/path",
  "clicks": 12,
  "created_at": "2026-07-09 10:15:00"
}
```

**Error response — `404 Not Found`:**
```json
{ "error": "Short link not found." }
```

---

### `GET /health`
Simple health check.

**Response — `200 OK`:**
```json
{ "status": "ok", "timestamp": "2026-07-09T10:15:00.000Z" }
```

---

## 🚀 Installation & Deployment

Full, beginner-friendly step-by-step instructions are provided separately in
this conversation — we'll go through account creation, Wrangler CLI setup,
D1 database creation, local development, first deployment, GitHub Pages
setup, GitHub Actions secrets, and final testing, one step at a time.

Quick reference once everything is set up:

```bash
# Local development
cd worker
npm install
wrangler dev

# Deploy the Worker manually
wrangler deploy

# Apply the database schema (first time only)
wrangler d1 execute url-shortener-db --remote --file=./schema.sql
```

---

## 📸 Screenshots

_(Add screenshots here once deployed — e.g. the main form, a successful
short link result, and the mobile view.)_

```
frontend/screenshots/
├── desktop-home.png
├── mobile-home.png
└── result-state.png
```

---

## 🔮 Future Improvements

- Custom short codes (user-chosen aliases)
- QR code generation for each short link
- User accounts (Cloudflare Access or a lightweight auth layer) so people can manage their own links
- Link expiration dates
- Rate limiting per IP to prevent abuse (Cloudflare has a free rate-limiting rule tier)
- Analytics dashboard (clicks over time, referrers, geography using Cloudflare's request metadata)
- Custom domain instead of `*.workers.dev` / `*.github.io`

---

## 📄 License

MIT — see [LICENSE](./LICENSE).

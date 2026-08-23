# Aadhya : attendance tracker

Aadhya is a MERN (MongoDB, Express, React, Node.js) web application for teaching staff. It covers attendance, student records, tests and marks, reports, and attendance-sheet image import.

**JavaScript only. No TypeScript.**

Developed by **DHANUSH V C** and **DINESH DURGAPPA**.

---

## 1. Project overview

Staff can:

- Create an account with a Gmail address and a strong password
- Configure college name and logo on first login
- Create classes and students
- Take attendance with present/absent controls
- Review and edit attendance history
- Flag students below a configurable attendance threshold
- Create unlimited tests and enter marks from the class roster
- View dashboards, student profiles, and staff profiles
- Import an attendance sheet image, review OCR matches, then save
- Export attendance and marks as CSV (and attendance as PDF)
- Install the app on a phone via the browser (PWA / Add to Home Screen)

The older static dashboard in `/attendance` is a separate localStorage prototype. This folder is the full-stack rebuild.

---

## 2. Tech stack

| Layer | Technology |
| --- | --- |
| Database | MongoDB + Mongoose |
| API | Node.js, Express.js |
| Auth | bcrypt, JWT (httpOnly cookie + bearer token) |
| Client | React 18, Vite, React Router, Chart.js |
| Email | Nodemailer (optional, env-configured) |
| OCR | Sharp preprocess + Tesseract.js |
| Export | CSV + PDFKit |

---

## 3. Folder structure

```text
aadhya/
  .env.example
  client/                 React SPA
    public/assets/        Logo placeholders (YOUR LOGO)
    src/
      components/
      pages/
      layouts/
      hooks/
      services/
      utils/
      assets/
  server/
    config/
    controllers/
    middleware/
    models/
    routes/
    services/
    utils/
    tests/
    uploads/              created at runtime
```

---

## 4. Requirements

- Node.js 18+
- npm
- MongoDB 6+ running locally or a MongoDB Atlas URI

---

## 5. Installation

From this folder:

```bash
cd aadhya
cp .env.example .env
npm install
npm run install:all
```

Edit `.env` and set `MONGODB_URI` and a long `JWT_SECRET`.

---

## 6. Environment variables

See `.env.example`. Never commit real secrets.

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Signing key for login tokens |
| `CLIENT_URL` | Frontend origin (CORS + password reset links) |
| `SERVER_URL` | Backend public URL |
| `EMAIL_HOST` / `EMAIL_USER` / `EMAIL_PASSWORD` | Optional SMTP for forgot-password |
| `EMAIL_FROM` | From address |

If email is not configured, password reset still works in development: the API returns `devResetUrl` and the server logs the link.

---

## 7. MongoDB setup

Local:

```bash
# macOS
brew services start mongodb-community

# Ubuntu
sudo systemctl start mongod
```

Atlas: create a cluster, allow your IP, paste the URI into `MONGODB_URI`.

---

## 8. Running the frontend

```bash
npm run dev:client
```

Opens Vite at http://localhost:5173 (proxies `/api` to the backend).

---

## 9. Running the backend

```bash
npm run dev:server
```

API: http://localhost:5000/api/health

Both together:

```bash
npm run dev
```

---

## 10. Production build

```bash
npm run build
npm start
```

The Express server serves `client/dist` when it exists, so one process can host the app.

---

## 11. Deployment (Vercel)

This folder is ready for Vercel. Step-by-step checklist: **`DEPLOY-VERCEL.txt`** at the repository root (and the same steps below).

1. Create a free **MongoDB Atlas** cluster. Allow Network Access from `0.0.0.0/0`. Copy the `mongodb+srv://…` URI.
2. In Vercel: **Import** `vc-dhanush/InternshipProject`. Framework **Other**. Root Directory can stay empty (repo `vercel.json`) or be set to `aadhya`.
3. Environment variables (Production and Preview):

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | Atlas connection string (database name `aadhya`) |
| `JWT_SECRET` | Long random secret |
| `NODE_ENV` | `production` |
| `CLIENT_URL` | `https://YOUR-APP.vercel.app` |
| `SERVER_URL` | `https://YOUR-APP.vercel.app` |

4. Deploy. Check `https://YOUR-APP.vercel.app/api/health` — `mongodb` should be `connected`.
5. Open `/auth` and create a staff account.

Vercel serverless storage is ephemeral (`/tmp`). Logos/OCR files may disappear after a cold start; MongoDB data is durable. Large OCR jobs can exceed the free 10s limit — add students by hand if that happens.

Render / Railway / a VPS still work: set the same env vars, `npm run build`, `npm start`.

---

## 12. PWA installation

1. Open the site in Chrome or Safari.
2. Use **Add to Home Screen** / **Install app**.
3. The app opens standalone. Offline, cached static pages may load; API calls still need a network.

---

## 13. OCR / image attendance

Path: **Import Image** in the sidebar.

1. Select a class that already has students.
2. Upload a PNG/JPG of the sheet.
3. The server preprocesses the image and runs OCR.
4. Detected IDs/names are matched to the class roster.
5. You correct unmatched rows, then confirm.
6. Attendance is saved only after confirmation.

This pipeline is for attendance identification only. Test student lists always come from the class database.

If OCR cannot read a photo, the UI shows a clear error. Enter attendance manually in that case.

---

## 14. Future improvements

- Production SMTP templates and audit logs
- Object storage for logos and OCR uploads
- Role-based admin vs teacher accounts
- Deeper table detection for printed registers
- Dark theme tokens wired through the saved preference

---

## Download

Zip this `aadhya` folder (without `node_modules`) for a portable copy of the source.

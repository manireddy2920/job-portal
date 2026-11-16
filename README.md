# JobPortal 🚀

An open-source job portal connecting job seekers with employers. Built with Node.js, Express, SQLite (sql.js), and vanilla HTML/CSS/JavaScript.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Features

| Feature | Details |
|---|---|
| **Authentication** | JWT-based register & login for job seekers and employers |
| **Job Listings** | Employers post, edit, delete, and mark jobs as filled |
| **Job Search** | Full-text search by keyword, location, type, category, and salary |
| **Applications** | Seekers apply with cover letters; withdraw any time |
| **Seeker Dashboard** | Track application statuses (pending → shortlisted → hired) |
| **Employer Dashboard** | Manage listings, review applicants, update application status |
| **Profiles** | Detailed seeker and company profiles |
| **Responsive Design** | Works on desktop, tablet, and mobile |
| **Security** | bcrypt password hashing, JWT auth, input validation |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js, Express |
| **Database** | SQLite via [sql.js](https://github.com/sql-js/sql.js) (pure JS, no native build) |
| **Authentication** | JSON Web Tokens (JWT), bcryptjs |
| **Frontend** | Vanilla HTML5, CSS3, JavaScript (no framework) |
| **Validation** | express-validator |

---

## Project Structure

```
job-portal/
├── backend/
│   ├── db/
│   │   ├── database.js       # sql.js wrapper + schema
│   │   └── init.js           # DB initializer script
│   ├── middleware/
│   │   └── auth.js           # JWT middleware + role guard
│   ├── routes/
│   │   ├── auth.js           # Register, login, /me
│   │   ├── jobs.js           # Job CRUD + search
│   │   ├── applications.js   # Apply, manage applications
│   │   └── profiles.js       # Seeker & employer profiles
│   └── server.js             # Express entry point
├── frontend/
│   ├── css/
│   │   ├── main.css          # Global styles & design tokens
│   │   ├── home.css
│   │   ├── auth.css
│   │   ├── jobs.css
│   │   ├── job-detail.css
│   │   ├── dashboard.css
│   │   └── profile.css
│   ├── js/
│   │   ├── utils.js          # API helper, formatters
│   │   ├── auth.js           # Auth state, nav, guards
│   │   ├── home.js
│   │   ├── login.js
│   │   ├── register.js
│   │   ├── jobs.js
│   │   ├── job-detail.js
│   │   ├── seeker-dashboard.js
│   │   ├── employer-dashboard.js
│   │   └── profile.js
│   ├── pages/
│   │   ├── login.html
│   │   ├── register.html
│   │   ├── jobs.html
│   │   ├── job-detail.html
│   │   ├── seeker-dashboard.html
│   │   ├── employer-dashboard.html
│   │   └── profile.html
│   └── index.html
├── .gitignore
├── LICENSE
├── package.json
└── README.md
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm

### Installation

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/job-portal.git
cd job-portal

# Install dependencies
npm install
```

### Running the App

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

Open **http://localhost:3000** in your browser.

The SQLite database file (`backend/db/jobportal.db`) is created automatically on first run.

---

## API Reference

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register a new user |
| POST | `/api/auth/login` | — | Log in |
| GET  | `/api/auth/me` | ✓ | Get current user |
| PUT  | `/api/auth/change-password` | ✓ | Change password |

### Jobs
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET  | `/api/jobs` | — | Search & list jobs |
| GET  | `/api/jobs/:id` | — | Get single job |
| POST | `/api/jobs` | Employer | Create job |
| PUT  | `/api/jobs/:id` | Employer | Update job |
| DELETE | `/api/jobs/:id` | Employer | Delete job |
| GET  | `/api/jobs/employer/my-jobs` | Employer | List own jobs |

### Applications
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/applications` | Seeker | Apply to a job |
| GET  | `/api/applications/my` | Seeker | My applications |
| GET  | `/api/applications/job/:jobId` | Employer | Applicants for a job |
| PUT  | `/api/applications/:id/status` | Employer | Update status |
| DELETE | `/api/applications/:id` | Seeker | Withdraw application |

### Profiles
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET  | `/api/profiles/seeker/me` | Seeker | My seeker profile |
| PUT  | `/api/profiles/seeker` | Seeker | Update seeker profile |
| GET  | `/api/profiles/employer/me` | Employer | My employer profile |
| PUT  | `/api/profiles/employer` | Employer | Update employer profile |
| GET  | `/api/profiles/employer/stats` | Employer | Dashboard statistics |

---

## Environment Variables

Create a `.env` file (optional — defaults are used if not set):

```env
PORT=3000
JWT_SECRET=your_strong_secret_here
```

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a pull request

---

## License

This project is licensed under the [MIT License](LICENSE).

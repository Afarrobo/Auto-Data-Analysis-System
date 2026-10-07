# Auto Data Analyst

Upload a spreadsheet and get an instant analysis: data profile, quality checks, cleaning tools, charts, correlations, AI-written insights and a PDF report.

**Live demo:** https://auto-data-analysis-system-m963.vercel.app

> The backend runs on a free Render plan. If the site has been idle, the first request can take about a minute while the server wakes up.
> This is a demo project. Please use sample or anonymised data only. Uploaded files are temporary.
> If an error occurs, please reupload

## Features

- **Upload** CSV, Excel or JSON files
- **Overview**: rows, columns, missing values, duplicates, memory usage, column types
- **Data quality**: missing values, duplicate rows, outliers (IQR, Z-score, Isolation Forest)
- **Cleaning**: remove duplicates, fill missing values, drop rows or columns, remove outliers
- **EDA**: statistics (mean, median, std, skewness, kurtosis) and relationships between columns
- **Charts**: histogram, bar, line, scatter, box plot, heatmap, with automatic chart suggestions
- **Correlation**: correlation matrix and strongest pairs
- **AI insights**: short plain-language summary written by Gemini(this feature is not available on live host , it's workable on local host)
- **Reports**: download a PDF report

## How the AI part works

The AI does not calculate anything itself. The backend computes the numbers with Pandas and sends only a small summary (counts and statistics, not your raw rows) to Gemini, which explains them in simple words.

## Tech stack

| Part | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS, Plotly |
| Backend | FastAPI, Pydantic, SQLAlchemy (SQLite) |
| Data and analysis | Pandas, NumPy, SciPy, scikit-learn, DuckDB |
| AI | Google Gemini API |
| Reports | ReportLab |
| Hosting | Vercel (frontend), Render (backend) |

## Project structure

```
backend/
  app/
    api/         routes (upload, dataset, analysis, visualization, cleaning, ai, reports)
    services/    analysis logic (profiler, statistics, outliers, cleaning, charts, ai_analyzer...)
    models/      database tables
    schemas/     request and response models
    database/    connection and CRUD
    utils/       file validation and helpers
frontend/
  src/
    pages/       Upload, Overview, DataQuality, Cleaning, EDA, Visualization, Correlation, AIInsights, Reports
    components/  Navbar, Sidebar, StatCard, DataTable, ChartCard, UploadBox
    services/    api.ts (all backend calls)
    hooks/       useDataset.ts
```

## Run locally

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/Scripts/activate        # Windows (Git Bash). On Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```
GEMINI_API_KEY=my_api_secret_key_here
GEMINI_MODEL=gemini-3.8-flash
```

Get a free key at https://aistudio.google.com/apikey, then start the server:

```bash
python -m uvicorn app.main:app --reload
```

The API docs are at http://127.0.0.1:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Environment variables

**Backend (Render or `.env`)**

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Gemini API key |
| `GEMINI_MODEL` | Gemini model name |
| `GEMINI_FALLBACK_MODEL` | Backup model used if the main one is busy |
| `ALLOWED_ORIGINS` | Frontend URL allowed to call the API (CORS) |

**Frontend (Vercel)**

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend URL, for example `https://your-backend.onrender.com` |

## Main API endpoints

```
POST   /api/datasets/upload
GET    /api/datasets/{id}/profile
GET    /api/datasets/{id}/quality
GET    /api/datasets/{id}/statistics
GET    /api/datasets/{id}/eda
GET    /api/datasets/{id}/correlation
GET    /api/datasets/{id}/outliers
POST   /api/datasets/{id}/clean
POST   /api/datasets/{id}/visualize
GET    /api/datasets/{id}/charts/recommend
POST   /api/datasets/{id}/query
GET    /api/datasets/{id}/ai/insights
POST   /api/datasets/{id}/report
DELETE /api/datasets/{id}
```

## Limitations

- No login. Do not upload private or sensitive data.
- On the free hosting plan, uploaded files are deleted when the server restarts or sleeps.
- AI insights depend on the Gemini API and its free-tier limits.

## Author

Built by Afsin as a portfolio project.

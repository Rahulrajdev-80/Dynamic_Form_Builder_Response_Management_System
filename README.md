# Dynamic Form Builder & Response Management System

Create forms without touching application code: drag-and-drop builder, 9 field types, validations, conditional
visibility, public & authenticated submission, response management (search, edit, history), analytics,
Excel/PDF export and activity logs.

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2, Alembic, Pydantic v2, JWT (PyJWT), Celery + Redis |
| Frontend | React (Vite) + TypeScript, Material UI, Axios, React Router, React Hook Form, Chart.js |
| Database | MySQL 8.0 |
| Tooling | Docker & Docker Compose, Swagger/OpenAPI, Postman |

## Project layout

```
form-builder/
├── docker-compose.yml          # db + redis + backend + celery worker + frontend
├── .env.example                # copy to .env
├── backend/
│   ├── app/
│   │   ├── main.py             # app, CORS, startup seed (roles + first admin)
│   │   ├── core/               # settings, JWT + password hashing
│   │   ├── db/session.py       # engine, SessionLocal, Base
│   │   ├── models/models.py    # all tables
│   │   ├── schemas/            # Pydantic request/response models
│   │   ├── api/deps.py         # auth + permission dependencies
│   │   ├── api/v1/             # routers: auth, users, forms, public, responses, uploads, analytics, exports, activity
│   │   ├── services/           # validation (+conditional logic), responses/history, export, uploads, activity log
│   │   └── worker/             # Celery app + background export task
│   ├── alembic/                # migrations (0001_initial_schema)
│   ├── tests/                  # pytest suite (10 tests)
│   └── scripts/generate_docs.py# regenerates openapi.json, API_ENDPOINTS.md, Postman collection
├── frontend/                   # React + Vite + TS app (src/pages, src/components, src/api)
├── docs/
│   ├── API_ENDPOINTS.md        # every endpoint, access level, description
│   ├── openapi.json            # OpenAPI 3 spec (same as /openapi.json)
│   ├── schema.sql              # MySQL 8 schema
│   └── PLAN_AND_QUESTIONS.md   # 5-day plan, assumptions, questions
└── postman/FormBuilder.postman_collection.json
```

## Run with Docker (recommended)

```bash
cp .env.example .env          # Windows PowerShell: Copy-Item .env.example .env
docker compose up --build     # builds the images and starts all 5 containers
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Swagger UI | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |
| MySQL (host access, e.g. Workbench) | `localhost:3307`, user `formuser`, password `formpass` |

The backend container runs `alembic upgrade head` on start and seeds the roles and a first admin:
**admin@example.com / Admin@12345** (change it in `.env`).

## Run locally without Docker (Windows friendly)

Backend (needs a MySQL 8 database named `formbuilder`; Redis is only needed for background exports):

```powershell
cd backend
python -m venv .venv                 # creates an isolated Python environment
.venv\Scripts\activate               # activates it (Linux/Mac: source .venv/bin/activate)
pip install -r requirements.txt      # installs the backend dependencies
copy .env.example .env               # then edit DATABASE_URL if needed
alembic upgrade head                 # creates all tables in MySQL
uvicorn app.main:app --reload        # starts the API on http://localhost:8000
# optional, for background exports:
celery -A app.worker.celery_app.celery_app worker --loglevel=info --pool=solo
```

Frontend:

```powershell
cd frontend
npm install                          # installs the React dependencies
copy .env.example .env               # VITE_API_URL=http://localhost:8000/api/v1
npm run dev                          # starts Vite on http://localhost:5173
```

## Tests

```bash
cd backend
python -m pytest -q      # uses a throw-away SQLite database - no MySQL needed
```

Covers auth/JWT/refresh, RBAC, form ownership, field ordering, conditional logic (incl. circular-rule rejection),
all validation paths, public submission, enable/disable, response edit permissions, history, search/filter,
uploads, analytics, Excel/PDF export, activity logs, duplicate and cascade delete.

## Swagger, Postman

* Swagger UI: `/docs`. Click **Authorize** and log in with your **email** as the username.
* Full endpoint table: [`docs/API_ENDPOINTS.md`](docs/API_ENDPOINTS.md) (47 endpoints).
* Postman: import `postman/FormBuilder.postman_collection.json`. Run **Authentication > POST Login** first: it stores
  `access_token`; create requests store `form_id`, `field_id`, `response_id`, `slug`... automatically.
* After changing any endpoint run `python backend/scripts/generate_docs.py` to refresh all three artefacts.

## Roles and permissions

| Action | Admin | User |
|---|---|---|
| Manage users / roles | yes | no |
| See forms | all | own |
| Create forms | yes | yes |
| Edit / delete / enable-disable a form, build fields | all forms | own forms |
| See responses, analytics, exports of a form | all forms | own forms |
| Submit a response | yes | yes (enabled forms) |
| Edit a response | any | own submission **only if** the form has *allow_response_editing*; form owners can edit responses to their forms |
| Delete a response | any | responses of own forms |
| Activity logs | everyone's | own actions |

Public forms (`is_public = true`) are reachable without login at `/f/<slug>` in the UI and
`/api/v1/public/forms/<slug>` in the API. Disabled forms reject every submission (public and authenticated).

## How the important features work

* **Field types**: text, number, email, date, dropdown, checkbox (multi-option or single tick-box), radio, file, rating.
  `min_value` / `max_value` mean *length* for text, *value* for number and the *star scale* for rating (default 5).
* **Validation** is enforced on the server (and mirrored in the UI): required, type/format, option membership,
  length/range bounds, rating range, uploaded file exists. Errors return HTTP 422 with `{"detail": {"errors": {"<field_id>": "message"}}}`.
* **Conditional visibility**: a field can depend on one parent field (`cond_field_id`, `cond_operator`, `cond_value`;
  operators `equals, not_equals, contains, gt, lt, not_empty`). A hidden field is never required and its value is
  ignored/discarded; a field is hidden when its parent is hidden. Circular rules are rejected when saving.
* **Field ordering**: `PUT /forms/{id}/fields/reorder` (used by the drag-and-drop builder).
* **Response history**: every create/update stores a snapshot plus a per-field diff (`response_history` table -
  an extra table beyond the 8 in the brief, needed for the history feature).
* **Files**: `POST /uploads` (or `/public/forms/{slug}/uploads`) returns a `file_id`; send it as the value of the file field.
  Allowed: pdf, images, doc(x), xls(x), csv, txt up to 10 MB.
* **Exports**: direct `GET /forms/{id}/export/excel|pdf`, and `POST /forms/{id}/export-jobs` for large forms
  (Celery worker; poll `/export-jobs/{task_id}` then download).
* **Analytics**: dashboard totals + 30-day trend + top forms; per-form counts, rating averages/distributions,
  choice distributions, number min/avg/max, text samples.

## Git & GitHub

```bash
git init                                  # turns the folder into a Git repository
git add .                                 # stages every file (.gitignore keeps secrets and build output out)
git commit -m "feat: dynamic form builder - backend, frontend, docker, docs"
git branch -M main                        # names the default branch main
git remote add origin https://github.com/<your-user>/<repo>.git
git push -u origin main                   # uploads the code and links your local branch to GitHub
```

See `docs/PLAN_AND_QUESTIONS.md` for a suggested commit-per-day history.

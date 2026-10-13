# FormFlow — Frontend Redesign

Frontend-only redesign for the Dynamic Form Builder & Response Management System.

## What changed
- New dark navigation/sidebar and polished responsive shell.
- New analytics-focused dashboard with KPI cards, response trend, form health and top forms.
- New card-based Forms workspace with quick actions.
- Refreshed login/register experience.
- Existing routes, API client, authentication flow, form builder, renderer, responses, analytics, uploads and user management are preserved.
- No backend, database, Redis, Celery or API logic is included in this ZIP.

## Run

Set `VITE_API_URL` to your running backend API, for example:

`http://localhost:8000/api/v1`

Then:

```bash
npm install
npm run dev
```

Or use the existing Dockerfile in this frontend folder with the same backend API configuration used by the main project.

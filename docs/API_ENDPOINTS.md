# API Endpoints

Base URL: `http://localhost:8000` - Swagger UI: `/docs` - ReDoc: `/redoc` - OpenAPI: `/openapi.json`
**Total endpoints: 47**


Access: **Public** = no token, **Bearer JWT** = any logged-in user (ownership rules noted in the description), **Admin** = admin role only.

## Authentication
_Register, login (JWT), refresh, current user_

| Method | Path | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Register a new user (role: user) |
| `POST` | `/api/v1/auth/login` | Public | Login with email & password (JSON) and get JWT tokens |
| `POST` | `/api/v1/auth/token` | Public | OAuth2 password flow (used by the Swagger 'Authorize' button; username = email) |
| `POST` | `/api/v1/auth/refresh` | Public | Exchange a refresh token for new tokens |
| `GET` | `/api/v1/auth/me` | Bearer JWT | Current logged-in user |

## Users & Roles (Admin)
_Admin-only user management and role assignment_

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/roles` | Admin | List roles |
| `GET` | `/api/v1/users` | Admin | List / search users |
| `GET` | `/api/v1/users/{user_id}` | Admin | Get a user |
| `PATCH` | `/api/v1/users/{user_id}` | Admin | Update name / activate / deactivate a user |
| `DELETE` | `/api/v1/users/{user_id}` | Admin | Delete a user (only if they own no forms) |
| `PATCH` | `/api/v1/users/{user_id}/role` | Admin | Change a user's role |

## Forms & Builder
_Form CRUD, enable/disable, fields, options and drag-and-drop ordering_

| Method | Path | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/forms` | Bearer JWT | Create a form |
| `GET` | `/api/v1/forms` | Bearer JWT | List / search forms (admin: all, user: own) |
| `GET` | `/api/v1/forms/{form_id}` | Bearer JWT | Get a form with fields (owner/admin, or any user when the form is enabled - used to fill it) |
| `PUT` | `/api/v1/forms/{form_id}` | Bearer JWT | Edit form settings |
| `DELETE` | `/api/v1/forms/{form_id}` | Bearer JWT | Delete a form and all its responses |
| `PATCH` | `/api/v1/forms/{form_id}/status` | Bearer JWT | Enable / disable a form |
| `POST` | `/api/v1/forms/{form_id}/duplicate` | Bearer JWT | Duplicate a form with its fields |
| `GET` | `/api/v1/forms/{form_id}/fields` | Bearer JWT | List fields in display order |
| `POST` | `/api/v1/forms/{form_id}/fields` | Bearer JWT | Add a field (appended at the end) |
| `PUT` | `/api/v1/forms/{form_id}/fields/reorder` | Bearer JWT | Reorder fields (drag & drop) |
| `PUT` | `/api/v1/forms/{form_id}/fields/{field_id}` | Bearer JWT | Edit a field (type cannot change) |
| `DELETE` | `/api/v1/forms/{form_id}/fields/{field_id}` | Bearer JWT | Delete a field (and its collected answers) |
| `POST` | `/api/v1/forms/{form_id}/fields/{field_id}/options` | Bearer JWT | Add an option to a dropdown / radio / checkbox field |
| `PUT` | `/api/v1/forms/{form_id}/fields/{field_id}/options/{option_id}` | Bearer JWT | Edit an option |
| `DELETE` | `/api/v1/forms/{form_id}/fields/{field_id}/options/{option_id}` | Bearer JWT | Delete an option |

## Public Forms (no login required)
_Anonymous access via the public slug_

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/public/forms/{slug}` | Public | Fetch a public form definition by its slug |
| `POST` | `/api/v1/public/forms/{slug}/responses` | Public | Submit a public form (anonymous; attributed to the user if a valid token is sent) |
| `POST` | `/api/v1/public/forms/{slug}/uploads` | Public | Upload a file for a public form's file field |

## Responses
_Submit, search/filter, edit (permission based) and view history_

| Method | Path | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/forms/{form_id}/responses` | Bearer JWT | Submit a response as a logged-in user |
| `GET` | `/api/v1/forms/{form_id}/responses` | Bearer JWT | List responses of a form with search & filters (owner/admin) |
| `GET` | `/api/v1/responses/mine` | Bearer JWT | My own submissions across all forms |
| `GET` | `/api/v1/responses/{response_id}` | Bearer JWT | Get one response |
| `PUT` | `/api/v1/responses/{response_id}` | Bearer JWT | Edit a response (admin, form owner, or the submitter when the form allows editing) |
| `DELETE` | `/api/v1/responses/{response_id}` | Bearer JWT | Delete a response (admin / form owner) |
| `GET` | `/api/v1/responses/{response_id}/history` | Bearer JWT | Change history of a response |

## File Uploads
_File upload field support_

| Method | Path | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/uploads` | Bearer JWT | Upload a file for a 'file' field (logged-in users) |
| `GET` | `/api/v1/uploads/{file_id}` | Bearer JWT | Download an uploaded file (admin / form owner / submitter) |

## Dashboard & Analytics
_Overall and form-wise analytics_

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/analytics/dashboard` | Bearer JWT | Dashboard totals, 30-day trend and top forms |
| `GET` | `/api/v1/analytics/forms/{form_id}` | Bearer JWT | Form-wise analytics (owner/admin) |

## Exports (Excel & PDF)
_Direct and background (Celery) exports_

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/forms/{form_id}/export/excel` | Bearer JWT | Download all responses as Excel (.xlsx) |
| `GET` | `/api/v1/forms/{form_id}/export/pdf` | Bearer JWT | Download all responses as PDF |
| `POST` | `/api/v1/forms/{form_id}/export-jobs` | Bearer JWT | Start a background (Celery) export for large forms |
| `GET` | `/api/v1/export-jobs/{task_id}` | Bearer JWT | Poll a background export job |
| `GET` | `/api/v1/export-jobs/{task_id}/download` | Bearer JWT | Download the finished export file |

## Activity Logs
_Audit trail of user actions_

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/activity-logs` | Bearer JWT | Activity logs (admin: everyone, user: own actions) |

## System
_Health check_

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Health check |


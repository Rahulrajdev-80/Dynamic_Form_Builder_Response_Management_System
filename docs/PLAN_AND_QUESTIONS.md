# 5-Day Plan, Assumptions and Questions

## Plan (5 working days)

| Day | Scope | Suggested commits |
|---|---|---|
| 1 | Repo, Docker Compose, FastAPI skeleton, config, models + Alembic migration, JWT auth, RBAC, user/role endpoints | `chore: project setup`, `feat(auth): JWT login/register/refresh + RBAC`, `feat(db): models and initial migration` |
| 2 | Forms CRUD, fields, options, ordering, enable/disable, validation + conditional logic engine, public forms, uploads | `feat(forms): form and field management`, `feat(validation): validation and conditional visibility` |
| 3 | Responses (submit, list, search/filter, edit permissions, history), activity logs, analytics, Excel/PDF/Celery export, pytest suite | `feat(responses): ...`, `feat(analytics): ...`, `feat(export): ...`, `test: api test suite` |
| 4 | React app: auth, layout, forms list, drag-and-drop builder, form renderer with conditional logic, public page | `feat(ui): auth and layout`, `feat(ui): drag-and-drop builder`, `feat(ui): form renderer` |
| 5 | React: responses table + edit + history + export, dashboards/analytics charts, activity logs, users; Swagger/Postman/README polish, end-to-end check in Docker | `feat(ui): responses and analytics`, `docs: swagger, postman, readme` |

## Assumptions made (please confirm)

1. **Form ownership**: both `Admin` and `User` may create forms; users only manage their own, admins manage all.
2. **Response editing**: allowed for admins, form owners, and the original submitter only when the form's
   *Submitters can edit responses* setting is on. Anonymous submitters cannot edit afterwards.
3. **Public forms** are opt-in per form (`is_public`) and identified by an unguessable slug.
4. **Conditional logic** supports one rule per field (parent field + operator + value). Multiple/AND-OR rules can be added later.
5. **Response history** uses an extra table `response_history` (not in the 8 listed tables).
6. **Celery** is used for large background exports; small exports are served synchronously. It needs Redis (included in Compose).
7. Uploaded files are stored on disk (Docker volume). S3/Blob storage can replace this if required.
8. Changing a field's type after creation is not supported (delete and re-add) to protect collected data.

## Questions / dependencies for the requester

1. Should users be able to self-register as `User` (current behaviour), or should admins create accounts?
2. Is a single conditional rule per field enough, or are multi-condition (AND/OR) rules required?
3. Are file uploads limited to specific types/sizes (current: 10 MB, common document/image types)? Any virus-scan requirement?
4. Should public submissions be protected (CAPTCHA / rate limiting)?
5. Is Redis acceptable as the Celery broker? Any hosting/deployment target beyond Docker Compose?
6. Should PDF export be one table of all responses (current) or one PDF per response?
7. Do multi-page / sectioned forms or form templates need to be in scope?

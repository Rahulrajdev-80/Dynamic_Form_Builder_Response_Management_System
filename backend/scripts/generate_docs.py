"""Regenerates docs/openapi.json, docs/API_ENDPOINTS.md and postman/*.json from the running FastAPI app.

Usage (from the backend folder):   python scripts/generate_docs.py
"""
import json
import os
import re
import sys
from pathlib import Path

os.environ.setdefault("DATABASE_URL", "sqlite:///./docs_tmp.db")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
spec = app.openapi()
(ROOT / "docs").mkdir(exist_ok=True)
(ROOT / "postman").mkdir(exist_ok=True)
(ROOT / "docs" / "openapi.json").write_text(json.dumps(spec, indent=2))

TAG_ORDER = [t["name"] for t in spec["tags"]]
PUBLIC = re.compile(r"^(/health|/api/v1/public/|/api/v1/auth/(register|login|token|refresh)$)")


def access(method: str, path: str, summary: str) -> str:
    if PUBLIC.match(path):
        return "Public"
    if path.startswith("/api/v1/users") or path.startswith("/api/v1/roles"):
        return "Admin"
    return "Bearer JWT"


# ------------------------------------------------------------------ markdown
lines = ["# API Endpoints", "", f"Base URL: `http://localhost:8000` - Swagger UI: `/docs` - ReDoc: `/redoc` - OpenAPI: `/openapi.json`", "",
         "Access: **Public** = no token, **Bearer JWT** = any logged-in user (ownership rules noted in the description), **Admin** = admin role only.", ""]
by_tag: dict[str, list] = {}
for path, ops in spec["paths"].items():
    for method, op in ops.items():
        by_tag.setdefault(op["tags"][0], []).append((method.upper(), path, op))
total = 0
for tag in TAG_ORDER:
    if tag not in by_tag:
        continue
    desc = next(t["description"] for t in spec["tags"] if t["name"] == tag)
    lines += [f"## {tag}", f"_{desc}_", "", "| Method | Path | Access | Description |", "|---|---|---|---|"]
    for method, path, op in by_tag[tag]:
        lines.append(f"| `{method}` | `{path}` | {access(method, path, op['summary'])} | {op['summary']} |")
        total += 1
    lines.append("")
lines.insert(3, f"**Total endpoints: {total}**")
lines.insert(4, "")
(ROOT / "docs" / "API_ENDPOINTS.md").write_text("\n".join(lines) + "\n")

# ------------------------------------------------------------------ postman
SAMPLES = {
    ("POST", "/api/v1/auth/register"): {"full_name": "Sandhiya", "email": "sandhiya@example.com", "password": "StrongPass@123"},
    ("POST", "/api/v1/auth/login"): {"email": "admin@example.com", "password": "Admin@12345"},
    ("POST", "/api/v1/auth/refresh"): {"refresh_token": "{{refresh_token}}"},
    ("POST", "/api/v1/forms"): {"title": "Customer Feedback", "description": "Tell us what you think", "is_public": True, "allow_response_editing": True},
    ("PUT", "/api/v1/forms/{form_id}"): {"title": "Customer Feedback v2", "is_public": True},
    ("PATCH", "/api/v1/forms/{form_id}/status"): {"is_active": False},
    ("POST", "/api/v1/forms/{form_id}/fields"): {"label": "Full name", "field_type": "text", "is_required": True, "placeholder": "Your name", "min_value": 2, "max_value": 100},
    ("PUT", "/api/v1/forms/{form_id}/fields/reorder"): {"field_ids": [3, 2, 1]},
    ("PUT", "/api/v1/forms/{form_id}/fields/{field_id}"): {"label": "Your full name", "is_required": True,
        "cond_field_id": None},
    ("POST", "/api/v1/forms/{form_id}/fields/{field_id}/options"): {"label": "Chennai", "value": "chennai"},
    ("PUT", "/api/v1/forms/{form_id}/fields/{field_id}/options/{option_id}"): {"label": "Coimbatore", "value": "coimbatore"},
    ("PATCH", "/api/v1/users/{user_id}"): {"full_name": "New Name", "is_active": True},
    ("PATCH", "/api/v1/users/{user_id}/role"): {"role": "admin"},
}
SUBMIT = {"answers": [{"field_id": 1, "value": "Sandhiya"}, {"field_id": 2, "value": "sandhiya@example.com"}, {"field_id": 3, "value": 4}]}
for key in [("POST", "/api/v1/forms/{form_id}/responses"), ("PUT", "/api/v1/responses/{response_id}"), ("POST", "/api/v1/public/forms/{slug}/responses")]:
    SAMPLES[key] = SUBMIT

SCRIPTS = {
    ("POST", "/api/v1/auth/login"): ["const j = pm.response.json();", "pm.collectionVariables.set('access_token', j.access_token);", "pm.collectionVariables.set('refresh_token', j.refresh_token);"],
    ("POST", "/api/v1/auth/token"): ["const j = pm.response.json();", "pm.collectionVariables.set('access_token', j.access_token);", "pm.collectionVariables.set('refresh_token', j.refresh_token);"],
    ("POST", "/api/v1/auth/refresh"): ["const j = pm.response.json();", "pm.collectionVariables.set('access_token', j.access_token);", "pm.collectionVariables.set('refresh_token', j.refresh_token);"],
    ("POST", "/api/v1/forms"): ["const j = pm.response.json();", "pm.collectionVariables.set('form_id', j.id);", "pm.collectionVariables.set('slug', j.slug);"],
    ("POST", "/api/v1/forms/{form_id}/fields"): ["pm.collectionVariables.set('field_id', pm.response.json().id);"],
    ("POST", "/api/v1/forms/{form_id}/fields/{field_id}/options"): ["pm.collectionVariables.set('option_id', pm.response.json().id);"],
    ("POST", "/api/v1/forms/{form_id}/responses"): ["pm.collectionVariables.set('response_id', pm.response.json().id);"],
    ("POST", "/api/v1/public/forms/{slug}/responses"): ["pm.collectionVariables.set('response_id', pm.response.json().response_id);"],
    ("POST", "/api/v1/forms/{form_id}/export-jobs"): ["pm.collectionVariables.set('task_id', pm.response.json().task_id);"],
    ("POST", "/api/v1/uploads"): ["pm.collectionVariables.set('file_id', pm.response.json().file_id);"],
    ("POST", "/api/v1/public/forms/{slug}/uploads"): ["pm.collectionVariables.set('file_id', pm.response.json().file_id);"],
}
STATUS_TEST = "pm.test('Status code is 2xx', function () { pm.expect(pm.response.code).to.be.within(200, 299); });"


def to_pm_path(path: str) -> str:
    return re.sub(r"\{(\w+)\}", r"{{\1}}", path)


folders = []
for tag in TAG_ORDER:
    items = []
    for method, path, op in by_tag.get(tag, []):
        raw = to_pm_path(path)
        url_path = [p for p in raw.strip("/").split("/")]
        if path.startswith("/api/v1"):
            url_path = url_path[2:]
            host = "{{api}}"
        else:
            host = "{{base_url}}"
        query = []
        for prm in op.get("parameters", []):
            if prm["in"] == "query":
                example = prm["schema"].get("default", "")
                query.append({"key": prm["name"], "value": str(example) if example is not None else "", "disabled": True,
                              "description": prm.get("description", "")})
        req = {
            "method": method,
            "header": [],
            "url": {"raw": host + "/" + "/".join(url_path) + ("" if not query else "?" + "&".join(f"{q['key']}=" for q in query)),
                    "host": [host], "path": url_path, "query": query},
            "description": op.get("description") or op["summary"],
        }
        if PUBLIC.match(path):
            req["auth"] = {"type": "noauth"}
        body_schema = op.get("requestBody", {}).get("content", {})
        if "application/json" in body_schema:
            sample = SAMPLES.get((method, path), {})
            req["header"].append({"key": "Content-Type", "value": "application/json"})
            req["body"] = {"mode": "raw", "raw": json.dumps(sample, indent=2), "options": {"raw": {"language": "json"}}}
        elif "multipart/form-data" in body_schema:
            req["body"] = {"mode": "formdata", "formdata": [{"key": "file", "type": "file", "src": []}]}
        elif "application/x-www-form-urlencoded" in body_schema:
            req["body"] = {"mode": "urlencoded", "urlencoded": [
                {"key": "username", "value": "admin@example.com"}, {"key": "password", "value": "Admin@12345"}]}
        events = [{"listen": "test", "script": {"type": "text/javascript",
                   "exec": [STATUS_TEST] + SCRIPTS.get((method, path), [])}}]
        # downloads return binary - skip JSON checks (already none) ; keep status test
        items.append({"name": f"{method} {op['summary']}", "request": req, "event": events})
    folders.append({"name": tag, "item": items})

collection = {
    "info": {
        "name": "Dynamic Form Builder API",
        "description": "Run **Auth > Login** first - it stores `access_token` automatically. IDs (`form_id`, `field_id`, ...) are saved by the create requests.",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{access_token}}", "type": "string"}]},
    "variable": [{"key": k, "value": v} for k, v in {
        "base_url": "http://localhost:8000", "api": "{{base_url}}/api/v1", "access_token": "", "refresh_token": "",
        "form_id": "1", "field_id": "1", "option_id": "1", "response_id": "1", "slug": "", "user_id": "2",
        "task_id": "", "file_id": "",
    }.items()],
    "item": folders,
}
(ROOT / "postman" / "FormBuilder.postman_collection.json").write_text(json.dumps(collection, indent=2))
print(f"OK - {total} endpoints documented")

import os
import tempfile

_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["AUTO_CREATE_TABLES"] = "true"
os.environ["UPLOAD_DIR"] = f"{_tmp}/uploads"
os.environ["EXPORT_DIR"] = f"{_tmp}/exports"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


def _login(client, email, password):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="session")
def admin(client):
    return _login(client, "admin@example.com", "Admin@12345")


@pytest.fixture(scope="session")
def user1(client):
    client.post("/api/v1/auth/register", json={"full_name": "User One", "email": "u1@example.com", "password": "Password@1"})
    return _login(client, "u1@example.com", "Password@1")


@pytest.fixture(scope="session")
def user2(client):
    client.post("/api/v1/auth/register", json={"full_name": "User Two", "email": "u2@example.com", "password": "Password@1"})
    return _login(client, "u2@example.com", "Password@1")

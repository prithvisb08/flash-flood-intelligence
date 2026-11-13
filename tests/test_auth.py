import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import pytest
from fastapi.testclient import TestClient
from main import app
from settings import settings


@pytest.fixture
def client():
    return TestClient(app)


def test_login_success(client):
    response = client.post("/api/auth/login", json={
        "username": settings.admin_username,
        "password": settings.admin_password
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["username"] == settings.admin_username


def test_login_invalid_password(client):
    response = client.post("/api/auth/login", json={
        "username": settings.admin_username,
        "password": "wrong-password-xyz"
    })
    assert response.status_code == 401


def test_protected_state_endpoints_reject_unauthenticated(client):
    """All state-changing endpoints must reject requests without valid Bearer token."""
    endpoints = [
        ("POST", "/api/mode", {"live_mode": False}),
        ("POST", "/api/sync", {}),
        ("POST", "/api/reset", {}),
        ("POST", "/api/sih-demo/step", {}),
        ("POST", "/api/alerts/dispatch", {"location_id": "UK-001"}),
        ("POST", "/api/sensors/toggle?sensor_id=WATER-004", {}),
    ]

    for method, path, payload in endpoints:
        if method == "POST":
            res = client.post(path, json=payload)
        assert res.status_code == 401, f"Endpoint {path} did not reject unauthenticated access!"


def test_protected_state_endpoints_allow_authenticated(client):
    # 1. Login to get token
    login_res = client.post("/api/auth/login", json={
        "username": settings.admin_username,
        "password": settings.admin_password
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test authenticated access
    res = client.get("/api/auth/me", headers=headers)
    assert res.status_code == 200
    assert res.json()["user"]["username"] == settings.admin_username

    # 3. Test authenticated reset
    reset_res = client.post("/api/reset", headers=headers)
    assert reset_res.status_code == 200
    assert reset_res.json()["status"] == "reset_success"

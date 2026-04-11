import pytest
import respx
import httpx


@pytest.mark.asyncio
async def test_get_my_team_success(auth_client):
    ac, _ = auth_client
    team_payload = {
        "team": {
            "id": 1,
            "name": "Test Team",
            "invite_code": "ABC123",
            "league_type": "none",
            "created_at": "2026-01-01T00:00:00",
            "members": [
                {"id": 10, "name": "Alice", "email": "alice@example.com", "picture": None}
            ],
        }
    }
    with respx.mock:
        respx.get("https://api.1000.school/teams/me").mock(
            return_value=httpx.Response(200, json=team_payload)
        )
        r = await ac.get("/teams/me")

    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "Test Team"
    assert len(data["members"]) == 1
    assert data["members"][0]["email"] == "alice@example.com"


@pytest.mark.asyncio
async def test_get_my_team_no_team(auth_client):
    ac, _ = auth_client
    with respx.mock:
        respx.get("https://api.1000.school/teams/me").mock(
            return_value=httpx.Response(200, json={"team": None})
        )
        r = await ac.get("/teams/me")

    assert r.status_code == 404


@pytest.mark.asyncio
async def test_get_my_team_gcs_error(auth_client):
    ac, _ = auth_client
    with respx.mock:
        respx.get("https://api.1000.school/teams/me").mock(
            return_value=httpx.Response(500)
        )
        r = await ac.get("/teams/me")

    assert r.status_code == 502


@pytest.mark.asyncio
async def test_get_my_team_unauthenticated(client):
    r = await client.get("/teams/me")
    assert r.status_code == 401

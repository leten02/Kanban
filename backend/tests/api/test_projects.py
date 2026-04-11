import pytest


@pytest.mark.asyncio
async def test_list_projects_empty(auth_client):
    ac, user = auth_client
    response = await ac.get("/projects")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_create_project(auth_client):
    ac, user = auth_client
    response = await ac.post("/projects", json={"name": "My Project", "description": "A test project"})
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "My Project"
    assert data["description"] == "A test project"
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_get_project(auth_client):
    ac, user = auth_client
    create_resp = await ac.post("/projects", json={"name": "GetMe"})
    project_id = create_resp.json()["id"]

    response = await ac.get(f"/projects/{project_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "GetMe"


@pytest.mark.asyncio
async def test_update_project(auth_client):
    ac, user = auth_client
    create_resp = await ac.post("/projects", json={"name": "Old Name"})
    project_id = create_resp.json()["id"]

    response = await ac.patch(f"/projects/{project_id}", json={"name": "New Name"})
    assert response.status_code == 200
    assert response.json()["name"] == "New Name"


@pytest.mark.asyncio
async def test_delete_project(auth_client):
    ac, user = auth_client
    create_resp = await ac.post("/projects", json={"name": "ToDelete"})
    project_id = create_resp.json()["id"]

    response = await ac.delete(f"/projects/{project_id}")
    assert response.status_code == 204

    get_resp = await ac.get(f"/projects/{project_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_get_project_not_found(auth_client):
    ac, user = auth_client
    response = await ac.get("/projects/99999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_unauthenticated(client):
    response = await client.get("/projects")
    assert response.status_code == 401

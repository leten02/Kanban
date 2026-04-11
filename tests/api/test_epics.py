import pytest


@pytest.fixture
async def project_id(auth_client):
    ac, user = auth_client
    resp = await ac.post("/projects", json={"name": "Epic Project"})
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_list_epics_with_progress(auth_client, project_id):
    ac, user = auth_client
    await ac.post(f"/projects/{project_id}/epics", json={"title": "Epic 1"})

    response = await ac.get(f"/projects/{project_id}/epics")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Epic 1"
    assert "progress" in data[0]
    assert data[0]["progress"] == 0


@pytest.mark.asyncio
async def test_create_epic(auth_client, project_id):
    ac, user = auth_client
    response = await ac.post(
        f"/projects/{project_id}/epics",
        json={"title": "My Epic", "description": "Epic desc", "status": "todo"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "My Epic"
    assert data["project_id"] == project_id
    assert data["status"] == "todo"
    assert data["progress"] == 0


@pytest.mark.asyncio
async def test_update_epic_status(auth_client, project_id):
    ac, user = auth_client
    create_resp = await ac.post(f"/projects/{project_id}/epics", json={"title": "Status Epic"})
    epic_id = create_resp.json()["id"]

    response = await ac.patch(f"/epics/{epic_id}", json={"status": "in_progress"})
    assert response.status_code == 200
    assert response.json()["status"] == "in_progress"


@pytest.mark.asyncio
async def test_delete_epic(auth_client, project_id):
    ac, user = auth_client
    create_resp = await ac.post(f"/projects/{project_id}/epics", json={"title": "Delete Me"})
    epic_id = create_resp.json()["id"]

    response = await ac.delete(f"/epics/{epic_id}")
    assert response.status_code == 204

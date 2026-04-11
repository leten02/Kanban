import pytest


@pytest.fixture
async def setup(auth_client):
    ac, user = auth_client
    proj = await ac.post("/projects", json={"name": "Task Project"})
    project_id = proj.json()["id"]
    epic = await ac.post(f"/projects/{project_id}/epics", json={"title": "Task Epic"})
    epic_id = epic.json()["id"]
    return ac, user, project_id, epic_id


@pytest.mark.asyncio
async def test_list_tasks(auth_client, setup):
    ac, user, project_id, epic_id = setup
    await ac.post(f"/epics/{epic_id}/tasks", json={"title": "Task 1"})

    response = await ac.get(f"/projects/{project_id}/tasks")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Task 1"


@pytest.mark.asyncio
async def test_list_tasks_with_status_filter(auth_client, setup):
    ac, user, project_id, epic_id = setup
    t = await ac.post(f"/epics/{epic_id}/tasks", json={"title": "Todo Task"})
    task_id = t.json()["id"]
    await ac.patch(f"/tasks/{task_id}/status", json={"status": "done"})

    await ac.post(f"/epics/{epic_id}/tasks", json={"title": "Another Todo"})

    done_resp = await ac.get(f"/projects/{project_id}/tasks?status=done")
    assert done_resp.status_code == 200
    assert len(done_resp.json()) == 1
    assert done_resp.json()[0]["status"] == "done"

    todo_resp = await ac.get(f"/projects/{project_id}/tasks?status=todo")
    assert len(todo_resp.json()) == 1


@pytest.mark.asyncio
async def test_create_task(auth_client, setup):
    ac, user, project_id, epic_id = setup
    response = await ac.post(
        f"/epics/{epic_id}/tasks",
        json={"title": "New Task", "priority": "high", "description": "desc"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "New Task"
    assert data["priority"] == "high"
    assert data["epic_id"] == epic_id
    assert data["project_id"] == project_id


@pytest.mark.asyncio
async def test_update_task(auth_client, setup):
    ac, user, project_id, epic_id = setup
    t = await ac.post(f"/epics/{epic_id}/tasks", json={"title": "Old Title"})
    task_id = t.json()["id"]

    response = await ac.patch(f"/tasks/{task_id}", json={"title": "New Title", "priority": "low"})
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "New Title"
    assert data["priority"] == "low"


@pytest.mark.asyncio
async def test_move_task_status(auth_client, setup):
    ac, user, project_id, epic_id = setup
    t = await ac.post(f"/epics/{epic_id}/tasks", json={"title": "Status Task"})
    task_id = t.json()["id"]

    response = await ac.patch(f"/tasks/{task_id}/status", json={"status": "in_review"})
    assert response.status_code == 200
    assert response.json()["status"] == "in_review"


@pytest.mark.asyncio
async def test_delete_task(auth_client, setup):
    ac, user, project_id, epic_id = setup
    t = await ac.post(f"/epics/{epic_id}/tasks", json={"title": "Delete Task"})
    task_id = t.json()["id"]

    response = await ac.delete(f"/tasks/{task_id}")
    assert response.status_code == 204

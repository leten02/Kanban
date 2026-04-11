import pytest


@pytest.fixture
async def setup(auth_client):
    ac, user = auth_client
    proj = await ac.post("/projects", json={"name": "Subtask Project"})
    project_id = proj.json()["id"]
    epic = await ac.post(f"/projects/{project_id}/epics", json={"title": "Subtask Epic"})
    epic_id = epic.json()["id"]
    task = await ac.post(f"/epics/{epic_id}/tasks", json={"title": "Parent Task"})
    task_id = task.json()["id"]
    return ac, user, task_id


@pytest.mark.asyncio
async def test_list_subtasks(auth_client, setup):
    ac, user, task_id = setup
    await ac.post(f"/tasks/{task_id}/subtasks", json={"title": "Sub 1"})

    response = await ac.get(f"/tasks/{task_id}/subtasks")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Sub 1"
    assert data[0]["is_completed"] is False


@pytest.mark.asyncio
async def test_create_subtask(auth_client, setup):
    ac, user, task_id = setup
    response = await ac.post(
        f"/tasks/{task_id}/subtasks",
        json={"title": "New Subtask"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "New Subtask"
    assert data["task_id"] == task_id
    assert data["is_completed"] is False


@pytest.mark.asyncio
async def test_complete_subtask_returns_progress(auth_client, setup):
    ac, user, task_id = setup
    s1 = await ac.post(f"/tasks/{task_id}/subtasks", json={"title": "Sub A"})
    s2 = await ac.post(f"/tasks/{task_id}/subtasks", json={"title": "Sub B"})
    subtask_id = s1.json()["id"]

    response = await ac.patch(f"/subtasks/{subtask_id}", json={"is_completed": True})
    assert response.status_code == 200
    data = response.json()
    assert data["is_completed"] is True
    assert data["task_progress"] == 50  # 1 of 2 done


@pytest.mark.asyncio
async def test_delete_subtask(auth_client, setup):
    ac, user, task_id = setup
    s = await ac.post(f"/tasks/{task_id}/subtasks", json={"title": "Delete Me"})
    subtask_id = s.json()["id"]

    response = await ac.delete(f"/subtasks/{subtask_id}")
    assert response.status_code == 204

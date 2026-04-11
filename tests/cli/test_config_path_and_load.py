from kanban.config import get_config_path, load_config, save_config


def test_config_path_uses_env(tmp_config_dir):
    path = get_config_path()
    assert "config.json" in str(path)
    assert str(tmp_config_dir) in str(path.parent)


def test_load_and_save_config(tmp_config_dir):
    # ensure starting empty
    assert load_config() == {}
    save_config({"token": "abc"})
    cfg = load_config()
    assert cfg.get("token") == "abc"

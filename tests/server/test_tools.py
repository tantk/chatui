"""Tests for the JSON-Patch template interpreter (no ADK).

The agent now declares each tool with an `implementation` containing a JSON
Patch template; the server applies the template after substituting the call's
arguments. These tests exercise that interpreter directly.

Placeholders in templates use ``<<argname>>`` syntax (not ``{{argname}}``)
because ADK's instruction template engine eagerly interprets ``{...}`` blocks
as session-state variable lookups.
"""

from server.agent.mutate import apply_template


def test_addrun_template_appends():
    impl = {
        "type": "patch",
        "patches": [
            {
                "op": "add",
                "path": "/runs/-",
                "value": {
                    "date": "<<date>>",
                    "miles": "<<miles>>",
                    "pace": "<<pace>>",
                    "x": "<<date>>",
                    "y": "<<miles>>",
                },
            }
        ],
    }
    data: dict = {"runs": []}
    r = apply_template(
        impl, {"date": "2026-05-09", "miles": 5, "pace": "8:30"}, data
    )
    assert r == {"ok": True, "applied": 1}
    assert len(data["runs"]) == 1
    assert data["runs"][0]["miles"] == 5
    assert data["runs"][0]["date"] == "2026-05-09"
    # Whole-string placeholders preserve type (number stays a number).
    assert data["runs"][0]["y"] == 5


def test_replace_at_path():
    impl = {
        "type": "patch",
        "patches": [{"op": "replace", "path": "/total", "value": "<<n>>"}],
    }
    data: dict = {"total": 0}
    r = apply_template(impl, {"n": 42}, data)
    assert r["ok"] is True
    assert data["total"] == 42


def test_remove_from_list():
    impl = {
        "type": "patch",
        "patches": [{"op": "remove", "path": "/items/0"}],
    }
    data: dict = {"items": ["a", "b", "c"]}
    r = apply_template(impl, {}, data)
    assert r["ok"] is True
    assert data["items"] == ["b", "c"]


def test_inline_substitution_in_string():
    impl = {
        "type": "patch",
        "patches": [
            {
                "op": "add",
                "path": "/notes/-",
                "value": "Run on <<date>>: <<miles>>mi",
            }
        ],
    }
    data: dict = {"notes": []}
    apply_template(impl, {"date": "2026-05-10", "miles": 5}, data)
    assert data["notes"] == ["Run on 2026-05-10: 5mi"]


def test_unsupported_type():
    r = apply_template({"type": "exec"}, {}, {})
    assert r["ok"] is False
    assert "exec" in r["error"]


def test_unsupported_op():
    impl = {
        "type": "patch",
        "patches": [{"op": "test", "path": "/x", "value": 1}],
    }
    r = apply_template(impl, {}, {"x": 1})
    assert r["ok"] is False
    assert "test" in r["error"]

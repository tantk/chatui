"""Tests for the pure tool dispatchers (no ADK)."""

from server.agent.tools.handlers import dispatch


def test_marathon_add_run_appends():
    data: dict = {}
    r = dispatch("marathon.addRun", {"date": "2026-05-09", "miles": 5, "pace": "8:30"}, data)
    assert r == {"ok": True, "runsCount": 1}
    assert len(data["runs"]) == 1
    assert data["runs"][0]["miles"] == 5


def test_jobs_move_stage_between_columns():
    data: dict = {
        "columns": [
            {"name": "Applied", "items": [{"id": "1", "title": "Anthropic", "subtitle": "SWE"}]},
            {"name": "Onsite", "items": []},
        ],
    }
    r = dispatch("jobs.moveStage", {"id": "1", "toStage": "Onsite"}, data)
    assert r["ok"]
    assert len(data["columns"][0]["items"]) == 0
    assert len(data["columns"][1]["items"]) == 1


def test_trip_add_day_appends():
    data: dict = {}
    dispatch("trip.addDay", {"date": "Day 3", "title": "Hakone", "items": ["onsen"]}, data)
    assert len(data["days"]) == 1
    assert data["days"][0]["title"] == "Hakone"


def test_dispatch_unknown_raises():
    import pytest
    with pytest.raises(ValueError, match="unknown tool handler"):
        dispatch("foo.bar", {}, {})

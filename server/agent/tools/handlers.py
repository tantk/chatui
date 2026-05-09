"""Pure-Python tool implementations. Each takes (args dict, data dict),
mutates data in place, and returns a result dict."""

from __future__ import annotations
from datetime import datetime, timezone
from typing import Any, Callable
import uuid


def _marathon_add_run(args: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
    runs = data.setdefault("runs", [])
    entry = {
        "date": args["date"],
        "miles": args["miles"],
        "pace": args["pace"],
        "x": args["date"],
        "y": args["miles"],
    }
    runs.append(entry)
    return {"ok": True, "runsCount": len(runs)}


def _marathon_remove_run(args: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
    runs = data.get("runs", [])
    before = len(runs)
    data["runs"] = [r for r in runs if r.get("date") != args["date"]]
    return {"ok": True, "removed": before - len(data["runs"])}


def _marathon_set_goal_race(args: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
    data["goalRace"] = {k: v for k, v in args.items() if v is not None}
    return {"ok": True}


def _marathon_plan_week(args: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
    data["plannedWeekMiles"] = args["miles"]
    return {"ok": True}


def _trip_add_day(args: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
    days = data.setdefault("days", [])
    days.append({
        "date": args["date"],
        "title": args["title"],
        "items": args.get("items") or [],
    })
    return {"ok": True}


def _trip_add_activity(args: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
    for d in data.get("days", []):
        if d.get("date") == args["dayDate"]:
            d.setdefault("items", []).append(args["activity"])
            return {"ok": True}
    return {"ok": False, "error": "day not found"}


def _trip_set_budget(args: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
    data["budget"] = {"amount": args["amount"], "currency": args["currency"]}
    return {"ok": True}


def _trip_move_pin(args: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
    pins = data.setdefault("pins", [])
    label = args["label"]
    new_pin = {"label": label, "lat": args["lat"], "lng": args["lng"]}
    for i, p in enumerate(pins):
        if p.get("label") == label:
            pins[i] = new_pin
            return {"ok": True}
    pins.append(new_pin)
    return {"ok": True}


def _jobs_add_application(args: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
    columns = data.setdefault("columns", [])
    stage = args.get("stage", "Applied")
    job_id = args.get("id") or uuid.uuid4().hex
    item = {"id": job_id, "title": args["company"], "subtitle": args["role"]}
    for col in columns:
        if col.get("name") == stage:
            col.setdefault("items", []).append(item)
            return {"ok": True, "id": job_id}
    columns.append({"name": stage, "items": [item]})
    return {"ok": True, "id": job_id}


def _jobs_move_stage(args: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
    moved = None
    for col in data.get("columns", []):
        items = col.get("items", [])
        for i, it in enumerate(items):
            if it.get("id") == args["id"]:
                moved = items.pop(i)
                break
        if moved:
            break
    if not moved:
        return {"ok": False, "error": "id not found"}

    columns = data.setdefault("columns", [])
    for col in columns:
        if col.get("name") == args["toStage"]:
            col.setdefault("items", []).append(moved)
            return {"ok": True}
    columns.append({"name": args["toStage"], "items": [moved]})
    return {"ok": True}


def _jobs_add_contact(args: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
    contacts = data.setdefault("contacts", [])
    contacts.append({k: v for k, v in args.items() if v is not None})
    return {"ok": True}


def _jobs_log_event(args: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
    events = data.setdefault("events", [])
    events.append({
        "applicationId": args["applicationId"],
        "event": args["event"],
        "date": args.get("date") or datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True}


HANDLER_TYPE = Callable[[dict[str, Any], dict[str, Any]], dict[str, Any]]

REGISTRY: dict[str, HANDLER_TYPE] = {
    "marathon.addRun": _marathon_add_run,
    "marathon.removeRun": _marathon_remove_run,
    "marathon.setGoalRace": _marathon_set_goal_race,
    "marathon.planWeek": _marathon_plan_week,
    "trip.addDay": _trip_add_day,
    "trip.addActivity": _trip_add_activity,
    "trip.setBudget": _trip_set_budget,
    "trip.movePin": _trip_move_pin,
    "jobs.addApplication": _jobs_add_application,
    "jobs.moveStage": _jobs_move_stage,
    "jobs.addContact": _jobs_add_contact,
    "jobs.logEvent": _jobs_log_event,
}


def dispatch(handler: str, args: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
    fn = REGISTRY.get(handler)
    if fn is None:
        raise ValueError(f"unknown tool handler: {handler}")
    return fn(args, data)

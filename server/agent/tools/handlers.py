"""Pure-Python tool implementations. Each takes (args dict, data dict),
mutates data in place, and returns a result dict."""

from __future__ import annotations
from datetime import datetime, timezone
from typing import Any, Callable
import uuid


def _pick(args: dict[str, Any], *keys: str, default: Any = None) -> Any:
    """Return the first present non-None arg from keys, else default."""
    for k in keys:
        if k in args and args[k] is not None:
            return args[k]
    return default


def _marathon_add_run(args: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
    runs = data.setdefault("runs", [])
    date = _pick(args, "date")
    miles = _pick(args, "miles", "distance", "distanceMiles")
    pace = _pick(args, "pace", "duration", "time")
    if date is None or miles is None:
        return {"ok": False, "error": "missing date or miles/distance"}
    entry = {
        "date": date,
        "miles": miles,
        "pace": pace,
        "x": date,
        "y": miles,
    }
    runs.append(entry)
    return {"ok": True, "runsCount": len(runs)}


def _marathon_remove_run(args: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
    runs = data.get("runs", [])
    before = len(runs)
    target = _pick(args, "date")
    data["runs"] = [r for r in runs if r.get("date") != target]
    return {"ok": True, "removed": before - len(data["runs"])}


def _marathon_set_goal_race(args: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
    data["goalRace"] = {k: v for k, v in args.items() if v is not None}
    return {"ok": True}


def _marathon_plan_week(args: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
    miles = _pick(args, "miles", "targetDistance", "distance", "weeklyMiles")
    if miles is None:
        return {"ok": False, "error": "missing miles"}
    data["plannedWeekMiles"] = miles
    return {"ok": True}


def _trip_add_day(args: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
    days = data.setdefault("days", [])
    date = _pick(args, "date", "dayDate")
    title = _pick(args, "title", "name")
    if date is None or title is None:
        return {"ok": False, "error": "missing date or title"}
    days.append({
        "date": date,
        "title": title,
        "items": args.get("items") or [],
    })
    return {"ok": True}


def _trip_add_activity(args: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
    target = _pick(args, "dayDate", "date")
    activity = _pick(args, "activity", "item", "name")
    if target is None or activity is None:
        return {"ok": False, "error": "missing dayDate or activity"}
    for d in data.get("days", []):
        if d.get("date") == target:
            d.setdefault("items", []).append(activity)
            return {"ok": True}
    return {"ok": False, "error": "day not found"}


def _trip_set_budget(args: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
    amount = _pick(args, "amount", "value")
    currency = _pick(args, "currency", "ccy", default="USD")
    if amount is None:
        return {"ok": False, "error": "missing amount"}
    data["budget"] = {"amount": amount, "currency": currency}
    return {"ok": True}


def _trip_move_pin(args: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
    pins = data.setdefault("pins", [])
    label = _pick(args, "label", "name")
    lat = _pick(args, "lat", "latitude")
    lng = _pick(args, "lng", "longitude", "lon")
    if label is None or lat is None or lng is None:
        return {"ok": False, "error": "missing label/lat/lng"}
    new_pin = {"label": label, "lat": lat, "lng": lng}
    for i, p in enumerate(pins):
        if p.get("label") == label:
            pins[i] = new_pin
            return {"ok": True}
    pins.append(new_pin)
    return {"ok": True}


def _jobs_add_application(args: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
    columns = data.setdefault("columns", [])
    company = _pick(args, "company", "employer", "name")
    role = _pick(args, "role", "title", "position", default="")
    stage = _pick(args, "stage", "status", "column", default="Applied")
    if company is None:
        return {"ok": False, "error": "missing company"}
    job_id = _pick(args, "id") or uuid.uuid4().hex
    item = {"id": job_id, "title": company, "subtitle": role}
    for col in columns:
        if col.get("name") == stage:
            col.setdefault("items", []).append(item)
            return {"ok": True, "id": job_id}
    columns.append({"name": stage, "items": [item]})
    return {"ok": True, "id": job_id}


def _jobs_move_stage(args: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
    job_id = _pick(args, "id", "applicationId", "jobId")
    to_stage = _pick(args, "toStage", "stage", "column")
    if job_id is None or to_stage is None:
        return {"ok": False, "error": "missing id or toStage"}
    moved = None
    for col in data.get("columns", []):
        items = col.get("items", [])
        for i, it in enumerate(items):
            if it.get("id") == job_id:
                moved = items.pop(i)
                break
        if moved:
            break
    if not moved:
        return {"ok": False, "error": "id not found"}

    columns = data.setdefault("columns", [])
    for col in columns:
        if col.get("name") == to_stage:
            col.setdefault("items", []).append(moved)
            return {"ok": True}
    columns.append({"name": to_stage, "items": [moved]})
    return {"ok": True}


def _jobs_add_contact(args: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
    contacts = data.setdefault("contacts", [])
    contacts.append({k: v for k, v in args.items() if v is not None})
    return {"ok": True}


def _jobs_log_event(args: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
    events = data.setdefault("events", [])
    app_id = _pick(args, "applicationId", "id", "jobId")
    event_text = _pick(args, "event", "text", "note")
    if app_id is None or event_text is None:
        return {"ok": False, "error": "missing applicationId or event"}
    events.append({
        "applicationId": app_id,
        "event": event_text,
        "date": _pick(args, "date") or datetime.now(timezone.utc).isoformat(),
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

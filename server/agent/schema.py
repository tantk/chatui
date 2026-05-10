from typing import Any, Literal
from pydantic import BaseModel, Field, ConfigDict


class WidgetNode(BaseModel):
    """One node in the layout tree. Recursive."""
    model_config = ConfigDict(extra="allow")
    type: str
    id: str | None = None
    props: dict[str, Any] | None = None
    bindings: dict[str, str] | None = None
    children: list["WidgetNode"] | None = None


class ToolParameters(BaseModel):
    type: Literal["object"]
    properties: dict[str, Any]
    required: list[str] | None = None


class ToolImplementation(BaseModel):
    """A JSON-Patch template that the server applies when the tool is called.

    Each patch object can reference call arguments via ``"{{argname}}"``
    placeholder strings, which the server substitutes at call time. Example:

        [{"op": "add", "path": "/runs/-", "value": {
            "date": "{{date}}", "miles": "{{miles}}", "pace": "{{pace}}",
            "x": "{{date}}", "y": "{{miles}}"
        }}]
    """
    type: Literal["patch"] = "patch"
    patches: list[dict[str, Any]]


class ToolDeclaration(BaseModel):
    name: str
    description: str
    parameters: ToolParameters
    implementation: ToolImplementation


class BootstrapResponse(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    icon: str = Field(min_length=1, max_length=8)
    appType: Literal["marathon", "trip", "jobs", "generic"]
    tree: WidgetNode
    data: dict[str, Any]
    tools: list[ToolDeclaration] = Field(min_length=1)
    backendCode: str | None = None


WidgetNode.model_rebuild()

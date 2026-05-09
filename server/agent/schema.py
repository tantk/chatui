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


class ToolDeclaration(BaseModel):
    name: str
    description: str
    parameters: ToolParameters
    handler: str


class BootstrapResponse(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    icon: str = Field(min_length=1, max_length=8)
    appType: Literal["marathon", "trip", "jobs", "generic"]
    tree: WidgetNode
    data: dict[str, Any]
    tools: list[ToolDeclaration] = Field(min_length=1)
    backendCode: str | None = None


WidgetNode.model_rebuild()

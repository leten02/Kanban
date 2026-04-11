from pydantic import BaseModel, ConfigDict


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    picture: str | None
    model_config = ConfigDict(from_attributes=True)

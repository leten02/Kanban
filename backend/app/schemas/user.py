from pydantic import BaseModel, ConfigDict


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    picture: str | None
    has_school_token: bool = False
    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm(cls, obj):
        return cls(
            id=obj.id,
            name=obj.name,
            email=obj.email,
            picture=obj.picture,
            has_school_token=bool(obj.school_api_token),
        )

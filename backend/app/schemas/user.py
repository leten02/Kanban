from pydantic import BaseModel, ConfigDict, model_validator


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    picture: str | None
    has_school_token: bool = False
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='before')
    @classmethod
    def set_has_school_token(cls, values):
        if hasattr(values, 'school_api_token'):
            return {
                'id': values.id,
                'name': values.name,
                'email': values.email,
                'picture': values.picture,
                'has_school_token': bool(values.school_api_token),
            }
        return values

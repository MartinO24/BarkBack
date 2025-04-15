from pydantic import BaseModel

class Message(BaseModel):
    name: str
    url: str

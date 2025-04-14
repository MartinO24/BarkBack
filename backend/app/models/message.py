from pydantic import BaseModel

class Message(BaseModel):
    user: str
    text: str
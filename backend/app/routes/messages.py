from fastapi import APIRouter
from app.models.message import Message
from app.db.mongodb import db

router = APIRouter()

@router.post("/messages")
def create_message(message: Message):
    result = db.messages.insert_one(message.model_dump())
    return {"inserted_id": str(result.inserted_id)}
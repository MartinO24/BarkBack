from fastapi import APIRouter
from app.models.message import Message
from app.db.mongodb import db
from bson import ObjectId
from bson.errors import InvalidId

router = APIRouter()

@router.post("/messages")
def create_message(message: Message):
    result = db.messages.insert_one(message.dict())
    return {"inserted_id": str(result.inserted_id)}

@router.get("/messages")
def get_messages():
    messages = list(db.messages.find())
    for msg in messages:
        msg["_id"] = str(msg["_id"])  # Convert ObjectId to string
    return messages
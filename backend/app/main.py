from fastapi import FastAPI
from app.routes import messages

app = FastAPI()

app.include_router(messages.router, prefix="/api")
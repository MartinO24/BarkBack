from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import messages

app = FastAPI()

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev only — later restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(messages.router, prefix="/api")

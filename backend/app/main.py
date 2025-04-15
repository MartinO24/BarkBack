# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import messages
from app.routes import translation # <--- Import the new router

app = FastAPI()

# CORS setup (keep as is for now)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include existing and new routers
app.include_router(messages.router, prefix="/api", tags=["messages"])
app.include_router(translation.router, prefix="/api", tags=["translation"]) # <--- Include the translation router

# Add a root endpoint for testing if the server is up
@app.get("/")
def read_root():
    return {"message": "BarkBack API is running!"}
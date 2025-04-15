# /app/routes/translation.py

from fastapi import APIRouter, UploadFile, File, HTTPException
import shutil  # Standard library for high-level file operations
import os      # Standard library for interacting with the operating system
import logging # For logging information and errors

# --- Configuration ---
# Set up basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define a directory to store uploads temporarily.
# IMPORTANT: Ensure this directory exists and your FastAPI process has write permissions.
# In production, consider using a dedicated volume or cloud storage.
UPLOAD_DIRECTORY = "/tmp/animal_audio_uploads"
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True) # Create the directory if it doesn't exist

# List of allowed audio MIME types (adjust as needed for your model)
ALLOWED_AUDIO_TYPES = [
    "audio/mpeg", # .mp3
    "audio/wav",  # .wav
    "audio/ogg",  # .ogg
    "audio/aac",  # .aac
    "audio/m4a",  # .m4a (common from iOS/Android)
    "audio/webm", # .webm
    "audio/amr",  # .amr (older mobile format)
    "audio/x-m4a", # Sometimes seen for m4a
]

# --- Router Setup ---
router = APIRouter()

# --- File Upload Endpoint ---
@router.post(
    "/translate-audio", # Renamed slightly for clarity
    tags=["Translation"], # For Swagger UI grouping
    summary="Upload an audio file for translation" # For Swagger UI
)
async def create_upload_file(
    # The parameter name 'uploaded_file' MUST match the key in the frontend FormData
    uploaded_file: UploadFile = File(..., description="The audio file to be processed.")
):
    """
    Receives an audio file via multipart/form-data upload.

    - Validates the file type.
    - Saves the file temporarily to the server's filesystem.
    - **(Placeholder)** Calls a hypothetical translation function.
    - Returns information about the uploaded file and the result.
    """
    logger.info(f"Received file upload request: {uploaded_file.filename}")
    logger.info(f"Content-Type: {uploaded_file.content_type}")

    # --- 1. Validation ---
    if uploaded_file.content_type not in ALLOWED_AUDIO_TYPES:
        logger.warning(f"Invalid file type '{uploaded_file.content_type}' for file '{uploaded_file.filename}'")
        raise HTTPException(
            status_code=400, # Bad Request
            detail=(
                f"Invalid audio file type: {uploaded_file.content_type}. "
                f"Allowed types are: {', '.join(ALLOWED_AUDIO_TYPES)}"
            )
        )

    # --- 2. Prepare to Save File ---
    # Create a safe destination path. Avoid using the raw filename directly
    # due to potential security risks (e.g., path traversal '../').
    # Here, we just join it with the upload directory, but consider sanitizing
    # or generating unique names in production.
    destination_path = os.path.join(UPLOAD_DIRECTORY, uploaded_file.filename)
    logger.info(f"Attempting to save file to: {destination_path}")

    # --- 3. Save the File ---
    try:
        # Use 'with open' for safe file handling (ensures file is closed)
        # Use 'wb' mode for writing bytes
        with open(destination_path, "wb") as buffer:
            # shutil.copyfileobj reads from the source (uploaded_file.file)
            # and writes to the destination (buffer) efficiently in chunks.
            shutil.copyfileobj(uploaded_file.file, buffer)
        logger.info(f"Successfully saved file: {destination_path}")

    except Exception as e:
        logger.error(f"Error saving file '{uploaded_file.filename}' to '{destination_path}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Could not save file on server: {e}")
    finally:
        # UploadFile handles closing its internal SpooledTemporaryFile automatically
        # when it goes out of scope, but explicitly closing is fine too.
        await uploaded_file.close()
        logger.debug(f"Closed file object for {uploaded_file.filename}")

    # --- 4. Process the File (Placeholder) ---
    # This is where you would pass the 'destination_path' or file content
    # to your actual animal sound analysis/translation model/logic.
    try:
        logger.info(f"Processing file: {destination_path}...")
        # Replace with your actual processing function call:
        # translation_result = your_animal_sound_translator(destination_path)
        translation_result = f"Meow! (Placeholder translation for {uploaded_file.filename})"
        logger.info(f"Processing complete for {uploaded_file.filename}")
    except Exception as e:
        logger.error(f"Error during translation processing for file '{destination_path}': {e}", exc_info=True)
        # Clean up the saved file if processing fails? (Optional)
        # try:
        #     os.remove(destination_path)
        #     logger.info(f"Cleaned up failed file: {destination_path}")
        # except OSError as rm_err:
        #     logger.error(f"Could not remove file after processing error: {rm_err}")
        raise HTTPException(status_code=500, detail=f"Failed to process audio: {e}")


    # --- 5. Return Success Response ---
    return {
        "message": "File uploaded and processed successfully!",
        "filename": uploaded_file.filename,
        "content_type": uploaded_file.content_type,
        "saved_path": destination_path, # Usually only for debug/internal use
        "translation": translation_result
    }

# Remember to include this router in your main.py:
# from app.routes import translation
# app.include_router(translation.router, prefix="/api")
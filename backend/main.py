import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from ai_model import process_crop_image

app = FastAPI(title="CropGuard AI API")

frontend_url = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173"
)
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    frontend_url.rstrip("/")
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "CropGuard API is running!"}


@app.post("/analyze")
async def analyze_crop(file: UploadFile = File(...)):
    image_bytes = await file.read()

    result = process_crop_image(image_bytes)

    return result
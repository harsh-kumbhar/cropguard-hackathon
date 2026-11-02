import os
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
load_dotenv()
from ai_model import process_crop_image

app = FastAPI(title="CropGuard AI API")

##Frontend URL configured through environment variables

frontend_url = os.getenv(
"FRONTEND_URL",
"http://localhost:5173"
).rstrip("/")

allowed_origins = [
origin.strip().rstrip("/")
for origin in frontend_url.split(",")
if origin.strip()
]

app.add_middleware(
CORSMiddleware,
allow_origins=allowed_origins,
allow_credentials=True,
allow_methods=["GET", "POST", "OPTIONS"],
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
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from ai_model import process_crop_image

app = FastAPI(title="CropGuard AI API")

# VERY IMPORTANT FOR HACKATHONS: Allow React to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.get("/")
def health_check():
    return {"status": "CropGuard API is running!"}

@app.post("/analyze")
async def analyze_crop(file: UploadFile = File(...)):
    # Read the image bytes from the uploaded file
    image_bytes = await file.read()
    
    # Send it to your isolated ML script
    result = process_crop_image(image_bytes)
    
    return result
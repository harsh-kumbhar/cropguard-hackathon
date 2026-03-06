import cv2
import numpy as np
import requests
import base64

# Roboflow Configuration
API_KEY = "nnY4KgvEnxAv65vf8jFC"
MODEL_ID = "stem-project-7z7kd/4"
INFERENCE_URL = f"https://detect.roboflow.com/{MODEL_ID}?api_key={API_KEY}"

def process_crop_image(image_bytes):
    # 1. Convert uploaded bytes into OpenCV Image
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    output = image.copy()

    # Calculate overall image Edge Density (for Developer Telemetry)
    gray_full = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    edges_full = cv2.Canny(gray_full, 40, 120)
    overall_edge_density = round((np.count_nonzero(edges_full) / edges_full.size) * 100, 2)

    # 2. Encode to Base64 for Roboflow
    _, buffer = cv2.imencode('.jpg', image)
    img_b64 = base64.b64encode(buffer).decode('utf-8')

    # 3. Request Predictions
    try:
        response = requests.post(
            INFERENCE_URL, 
            data=img_b64, 
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        result = response.json()
    except Exception as e:
        return {"error": f"Failed to connect: {str(e)}"}

    if "predictions" not in result:
        return {"error": "No predictions returned from model."}

    # 4. Process Detections
    results_data = []
    lodged_stems = 0
    total_lodged_tilt = 0

    for pred in result["predictions"]:
        if pred["class"] != "Stem":
            continue

        x, y, w, h = int(pred["x"]), int(pred["y"]), int(pred["width"]), int(pred["height"])
        x1, y1 = int(x - w/2), int(y - h/2)
        x2, y2 = int(x + w/2), int(y + h/2)

        stem_crop = image[max(0, y1):max(0, y2), max(0, x1):max(0, x2)]
        if stem_crop.size == 0:
            continue

        # OpenCV Angle Math
        gray = cv2.cvtColor(stem_crop, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(gray, 40, 120)
        lines = cv2.HoughLinesP(edges, rho=1, theta=np.pi/180, threshold=20, minLineLength=20, maxLineGap=5)
        
        tilt = 0
        if lines is not None:
            max_length = 0
            best_line = None
            for line in lines:
                xA, yA, xB, yB = line[0]
                length = np.sqrt((xB-xA)**2 + (yB-yA)**2)
                if length > max_length:
                    max_length = length
                    best_line = (xA, yA, xB, yB)

            if best_line:
                xA, yA, xB, yB = best_line
                angle = np.degrees(np.arctan2((yB-yA), (xB-xA)))
                tilt = abs(90 - abs(angle))

        label = "Lodged" if tilt > 25 else "Healthy"
        if label == "Lodged":
            lodged_stems += 1
            total_lodged_tilt += tilt
            color = (0, 0, 255) # Red
        else:
            color = (0, 255, 0) # Green

        # Save individual stem data for graphs
        results_data.append({"tilt": round(tilt, 2), "label": label, "health": 100 - tilt})

        # Draw bounding boxes
        cv2.rectangle(output, (x1, y1), (x2, y2), (0, 255, 255), 2)
        cv2.putText(output, f"{tilt:.1f}deg", (x1, y1-5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    # 5. Calculate Advanced Field Statistics
    total_stems = len(results_data)
    lodging_percent = (lodged_stems / total_stems * 100) if total_stems > 0 else 0
    yield_loss = lodging_percent * 0.6
    
    # Calculate Inclination Vulnerability (Average tilt of lodged crops)
    inclination_vuln = (total_lodged_tilt / lodged_stems) if lodged_stems > 0 else 0

    # Determine Alerts based on new UI
    if lodging_percent < 20:
        severity = "Optimal Health Maintained"
        alert_level = "Green"
    elif lodging_percent < 50:
        severity = "Moderate Damage Detected"
        alert_level = "Yellow"
    else:
        severity = "Severe Inclination Vulnerability"
        alert_level = "Red"

    # 6. Encode Final Image
    _, buffer_out = cv2.imencode('.jpg', output)
    final_img_b64 = base64.b64encode(buffer_out).decode('utf-8')

    # The New, Data-Rich Payload for CropIQ V4
    return {
        "farmer_metrics": {
            "total_stems": total_stems,
            "lodging_percentage": round(lodging_percent, 2),
            "yield_loss_estimate": round(yield_loss, 2),
            "severity": severity,
            "alert_level": alert_level
        },
        "developer_metrics": {
            "edge_density": overall_edge_density,
            "inclination_vulnerability": round(inclination_vuln, 2),
            "core_stack": ["OpenCV Hough Lines", "Canny Edge Detection", "Bio-Density Neural Integrity"],
            "stem_details": results_data
        },
        "processed_image_base64": f"data:image/jpeg;base64,{final_img_b64}"
    }
import cv2
import numpy as np
import requests
import base64
import time
from PIL import Image, ImageDraw, ImageFont
import io

# Roboflow Configuration
API_KEY = "nnY4KgvEnxAv65vf8jFC"
MODEL_ID = "stem-project-7z7kd/8"
INFERENCE_URL = f"https://detect.roboflow.com/{MODEL_ID}?api_key={API_KEY}"


def _img_to_b64(img_bgr):
    """Convert a BGR numpy array to a base64 JPEG data URI string."""
    _, buf = cv2.imencode('.jpg', img_bgr, [cv2.IMWRITE_JPEG_QUALITY, 88])
    return "data:image/jpeg;base64," + base64.b64encode(buf).decode('utf-8')


def _make_veg_mask(image):
    """HSV vegetation mask (CHROMA_MASK view)."""
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    lower = np.array([30, 40, 40])
    upper = np.array([90, 255, 255])
    mask = cv2.inRange(hsv, lower, upper)
    result = cv2.bitwise_and(image, image, mask=mask)
    coverage_pct = round((np.count_nonzero(mask) / mask.size) * 100, 2)
    return result, coverage_pct


def _make_thermal_density(image):
    """Pseudo-thermal heatmap (THERMAL_HEATMAP view)."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (21, 21), 0)
    heatmap = cv2.applyColorMap(blur, cv2.COLORMAP_INFERNO)
    return heatmap


def _make_edge_topology(image):
    """Canny edge topology (TOPOLOGICAL_SCAN view)."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 40, 120)
    edge_density_pct = round((np.count_nonzero(edges) / edges.size) * 100, 2)
    edges_colored = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
    edges_colored[edges > 0] = [0, 240, 255]  # cyan edges
    return edges_colored, edge_density_pct


def _make_structural_mesh(image):
    """Hough line structural mesh (STRUCTURAL_MESH view)."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=40, minLineLength=30, maxLineGap=10)
    mesh = np.zeros_like(image)
    if lines is not None:
        for line in lines:
            x1, y1, x2, y2 = line[0]
            cv2.line(mesh, (x1, y1), (x2, y2), (255, 0, 85), 1)
    return mesh


def _count_stems_and_angle(image):
    """Count stem lines and compute average vertical angle."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(gray, 40, 120)
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=30, minLineLength=25, maxLineGap=8)
    if lines is None:
        return 0, 0, 90.0
    angles = []
    for line in lines:
        x1, y1, x2, y2 = line[0]
        angle = abs(np.degrees(np.arctan2(y2 - y1, x2 - x1)))
        angles.append(angle)
    vertical_pct = round(sum(1 for a in angles if a > 60) / len(angles) * 100, 1)
    avg_angle = round(float(np.mean(angles)), 1)
    return len(lines), vertical_pct, avg_angle


def _apply_tactical_grid(image):
    """Overlay a 4×4 sector grid with A1–D4 coordinate labels."""
    out = image.copy()
    h, w = out.shape[:2]
    color = (0, 240, 255)
    for i in range(1, 4):
        cv2.line(out, (w * i // 4, 0), (w * i // 4, h), color, 1)
        cv2.line(out, (0, h * i // 4), (w, h * i // 4), color, 1)
    for r in range(4):
        for c in range(4):
            label = f"{chr(65 + c)}{r + 1}"
            lx = w * c // 4 + 5
            ly = h * r // 4 + 5
            cv2.putText(out, label, (lx, ly), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1, cv2.LINE_AA)
    return out


def _generate_ohlc(risk_score: float, n: int = 30) -> list:
    """Generate synthetic OHLC sector-health candles seeded by risk_score."""
    import math
    candles = []
    val = max(10.0, risk_score - 20)
    for i in range(n):
        seed = math.sin(i * risk_score + i) * 10000
        jitter = (seed - math.floor(seed) - 0.5) * 18
        o = round(max(0, min(100, val)), 1)
        c = round(max(0, min(100, val + jitter)), 1)
        h = round(max(o, c) + abs(jitter) * 0.4, 1)
        l = round(min(o, c) - abs(jitter) * 0.4, 1)
        candles.append({"x": i + 1, "open": o, "close": c, "high": h, "low": l})
        val = c
    return candles


def process_crop_image(image_bytes):
    # 1. Convert uploaded bytes into OpenCV Image
    t_start = time.time()

    # 1. Decode image
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        return {"error": "Could not decode image."}

    # Resize to a max 800px width for consistent processing
    max_w = 800
    h0, w0 = image.shape[:2]
    if w0 > max_w:
        scale = max_w / w0
        image = cv2.resize(image, (max_w, int(h0 * scale)))

    output = image.copy()

    # 2. Generate processed views
    veg_mask_img, coverage_pct       = _make_veg_mask(image)
    thermal_img                       = _make_thermal_density(image)
    edges_img, edge_density_pct       = _make_edge_topology(image)
    mesh_img                          = _make_structural_mesh(image)
    line_count, vertical_pct, avg_angle = _count_stems_and_angle(image)

    # 3. Roboflow Predictions
    _, buffer = cv2.imencode('.jpg', image)
    img_b64 = base64.b64encode(buffer).decode('utf-8')

    try:
        response = requests.post(
            INFERENCE_URL,
            data=img_b64,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=15
        )
        roboflow_result = response.json()
    except Exception as e:
        roboflow_result = {"predictions": []}

    # 4. Process Roboflow detections
    results_data = []
    lodged_stems = 0
    total_lodged_tilt = 0

    predictions = roboflow_result.get("predictions", [])
    for pred in predictions:
        if pred.get("class") != "Stem":
            continue
        x, y, w, h = int(pred["x"]), int(pred["y"]), int(pred["width"]), int(pred["height"])
        x1, y1 = max(0, int(x - w / 2)), max(0, int(y - h / 2))
        x2, y2 = int(x + w / 2), int(y + h / 2)

        stem_crop = image[y1:y2, x1:x2]
        if stem_crop.size == 0:
            continue

        gray = cv2.cvtColor(stem_crop, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(gray, 40, 120)
        lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=20, minLineLength=20, maxLineGap=5)

        tilt = 0
        if lines is not None:
            max_length = 0
            best_line = None
            for line in lines:
                xA, yA, xB, yB = line[0]
                length = np.sqrt((xB - xA) ** 2 + (yB - yA) ** 2)
                if length > max_length:
                    max_length = length
                    best_line = (xA, yA, xB, yB)
            if best_line:
                xA, yA, xB, yB = best_line
                angle = np.degrees(np.arctan2((yB - yA), (xB - xA)))
                tilt = abs(90 - abs(angle))

        label = "Lodged" if tilt > 25 else "Healthy"
        if label == "Lodged":
            lodged_stems += 1
            total_lodged_tilt += tilt
            box_color = (0, 0, 255)
        else:
            box_color = (0, 255, 0)

        results_data.append({"tilt": round(tilt, 2), "label": label, "health": round(100 - tilt, 1)})
        cv2.rectangle(output, (x1, y1), (x2, y2), (0, 255, 255), 2)
        cv2.putText(output, f"{tilt:.1f}°", (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.45, box_color, 1)

    # 5. Compute statistics
    total_stems   = len(results_data)
    lodging_pct   = (lodged_stems / total_stems * 100) if total_stems > 0 else 0
    yield_loss    = lodging_pct * 0.6
    incl_vuln     = (total_lodged_tilt / lodged_stems) if lodged_stems > 0 else 0

    # Risk score (0–100): blend of lodging % and stem angle deviation
    angle_deviation = max(0, 90 - avg_angle)  # how far from vertical
    risk_score = round(min(100, lodging_pct * 0.6 + angle_deviation * 0.4), 1)

    # Confidence: based on how many stems were detected vs edge density signal
    confidence = round(min(99, max(40, 50 + (total_stems * 3) - (edge_density_pct * 0.5))), 1)

    # 6. Severity classification
    if lodging_pct < 20:
        severity     = "Optimal Health Maintained"
        result_label = "Healthy Crop"
        alert_level  = "Green"
    elif lodging_pct < 50:
        severity     = "Moderate Damage Detected"
        result_label = "Moderate Lodging"
        alert_level  = "Yellow"
    else:
        severity     = "Severe Inclination Vulnerability"
        result_label = "Severe Lodging"
        alert_level  = "Red"

    # 7. Tactical grid overlay on annotated output
    tactical_img = _apply_tactical_grid(output)

    process_time_ms = round((time.time() - t_start) * 1000, 1)

    return {
        # ── Legacy farmer view ───────────────────────────────────────
        "farmer_metrics": {
            "total_stems":        total_stems,
            "lodging_percentage": round(lodging_pct, 2),
            "yield_loss_estimate": round(yield_loss, 2),
            "severity":           severity,
            "alert_level":        alert_level,
        },
        # ── New rich metrics ─────────────────────────────────────────
        "result": {
            "label":       result_label,
            "risk_score":  risk_score,
            "avg_angle":   avg_angle,
        },
        "vegetation": {
            "coverage_pct": coverage_pct,
        },
        "edges": {
            "edge_density_pct": edge_density_pct,
        },
        "stems": {
            "line_count":    line_count,
            "vertical_pct":  vertical_pct,
            "avg_angle":     avg_angle,
        },
        "confidence":      confidence,
        "process_time_ms": process_time_ms,
        # ── Developer metrics ─────────────────────────────────────────
        "developer_metrics": {
            "edge_density":              edge_density_pct,
            "inclination_vulnerability": round(incl_vuln, 2),
            "core_stack": [
                "OpenCV Hough Lines",
                "Canny Edge Detection",
                "HSV Bio-Density Masking",
                "Roboflow Stem Inference",
                "FastAPI REST Backend",
            ],
            "stem_details": results_data,
            # OHLC sector-health data (30 synthetic candles seeded by risk_score)
            "ohlc": _generate_ohlc(risk_score),
        },
        # ── Processed images ─────────────────────────────────────────
        "processed_image_base64": _img_to_b64(output),
        "processed_images": {
            "mask":     _img_to_b64(veg_mask_img),
            "density":  _img_to_b64(thermal_img),
            "edges":    _img_to_b64(edges_img),
            "stem":     _img_to_b64(mesh_img),
            "tactical": _img_to_b64(tactical_img),
        },
    }

  
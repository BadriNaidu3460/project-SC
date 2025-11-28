from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import tensorflow as tf
import numpy as np
import cv2
import pickle
import base64
import os

app = Flask(__name__, static_folder="../Frontend")
CORS(app)  # allow frontend to communicate

# ===== Load Model and Label Map =====
MODEL_PATH = "sign_model_isl_faster.h5"
LABEL_MAP_PATH = "label_map_faster.pkl"

model = tf.keras.models.load_model(MODEL_PATH)
with open(LABEL_MAP_PATH, "rb") as f:
    label_map = pickle.load(f)

IMG_SIZE = 128  # must match frontend canvas size

# Serve frontend files
@app.route("/")
def serve_index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/project.js")
def serve_js():
    return send_from_directory(app.static_folder, "project.js")

@app.route("/project.css")
def serve_css():
    return send_from_directory(app.static_folder, "project.css")

# ===== Prediction Route =====
@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        image_data = data.get("image")
        if not image_data:
            return jsonify({"error": "No image received"}), 400

        # Decode Base64 -> OpenCV image
        img_bytes = base64.b64decode(image_data.split(",")[1])
        img_np = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(img_np, cv2.IMREAD_COLOR)

        # Preprocess
        frame = cv2.resize(frame, (IMG_SIZE, IMG_SIZE))
        frame = frame / 255.0
        frame = np.expand_dims(frame, axis=0)

        # Predict
        preds = model.predict(frame)
        pred_label = label_map[np.argmax(preds)]

        return jsonify({"letter": pred_label})

    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

# predict.py
# Usage: python predict.py
from flask import Flask, request, jsonify
import numpy as np
import pandas as pd
import joblib
import os
from datetime import datetime, timedelta
import tensorflow as tf

MODEL_DIR = "seq2seq_model"
SCALER_PATH = "scaler.pkl"
RESAMPLE_SECONDS = 30
PAST_HOURS = 2
FUTURE_HOURS = 2

app = Flask(__name__)
# load model + scaler once
model = None
scaler = None

def load_artifacts():
    global model, scaler
    if model is None:
        model_path = os.path.join(MODEL_DIR, "final_model")
        if not os.path.exists(model_path):
            raise RuntimeError("Model not found. Train and save model to " + MODEL_DIR)
        model = tf.keras.models.load_model(model_path)
    if scaler is None:
        if not os.path.exists(SCALER_PATH):
            raise RuntimeError("Scaler not found at " + SCALER_PATH)
        scaler = joblib.load(SCALER_PATH)

def input_to_df(payload):
    """
    Accepts either:
    - list of dicts: [{"timestamp": "...", "ppm":.., "temperature":.., "humidity":..}, ...]
    - list of lists/tuples: [[ppm, temp, hum], ...] (no timestamps)
    Returns df indexed by timestamp (if missing, create timestamps with RESAMPLE_SECONDS spacing backwards).
    """
    if not isinstance(payload, list):
        raise ValueError("Payload must be a list of samples.")
    # if first element has keys, parse timestamps
    if len(payload) == 0:
        raise ValueError("Empty payload.")
    first = payload[0]
    rows = []
    if isinstance(first, dict) and ("ppm" in first or "temperature" in first):
        for item in payload:
            ts = item.get("timestamp")
            ppm = float(item.get("ppm"))
            temp = float(item.get("temperature"))
            hum = float(item.get("humidity"))
            if ts is None:
                rows.append({"timestamp": None, "ppm": ppm, "temperature": temp, "humidity": hum})
            else:
                rows.append({"timestamp": pd.to_datetime(ts), "ppm": ppm, "temperature": temp, "humidity": hum})
        df = pd.DataFrame(rows)
        if df["timestamp"].isnull().all():
            # create timestamps backwards from now
            end = pd.Timestamp.now()
            start = end - pd.Timedelta(hours=PAST_HOURS)
            df.index = pd.date_range(start=start, end=end, periods=len(df))
        else:
            # fill missing timestamps by interpolation
            if df["timestamp"].isnull().any():
                # assign sequential timestamps where missing
                # fill Nones by linearly spacing between neighbors (simpler: forward fill)
                df["timestamp"] = df["timestamp"].fillna(method="ffill")
            df = df.set_index("timestamp")
    else:
        # assume array of lists [ppm,temp,hum] with no timestamps
        arr = np.array(payload)
        if arr.shape[1] != 3:
            raise ValueError("If payload is list of lists, each element must have 3 values (ppm,temp,hum).")
        end = pd.Timestamp.now()
        start = end - pd.Timedelta(hours=PAST_HOURS)
        idx = pd.date_range(start=start, end=end, periods=len(arr))
        df = pd.DataFrame(arr, index=idx, columns=["ppm","temperature","humidity"])
    # resample to consistent RESAMPLE_SECONDS
    df = df.sort_index()
    df = df.resample(f"{RESAMPLE_SECONDS}S").mean()
    df = df.interpolate(limit=10, method="time")
    return df

@app.route("/predict", methods=["POST"])
def predict():
    try:
        load_artifacts()
        payload = request.get_json()
        if payload is None:
            return jsonify({"error": "Invalid JSON"}), 400
        # accept either {"data": [...]} or straight array
        data = payload.get("data") if isinstance(payload, dict) and "data" in payload else payload
        df = input_to_df(data)
        # ensure we have expected past length
        past_steps = int(PAST_HOURS * 3600 / RESAMPLE_SECONDS)
        future_steps = int(FUTURE_HOURS * 3600 / RESAMPLE_SECONDS)
        values = df[["ppm","temperature","humidity"]].values
        # if longer than needed, take last past_steps
        if len(values) < past_steps:
            return jsonify({"error": f"Not enough timesteps after resampling. Need {past_steps}, got {len(values)}"}), 400
        x_in = values[-past_steps:]
        # scale
        x_scaled = scaler.transform(x_in)
        x_scaled = x_scaled.reshape((1, past_steps, 3))
        y_pred_scaled = model.predict(x_scaled)
        y_pred = y_pred_scaled.reshape((future_steps, 3))
        y_inv = scaler.inverse_transform(y_pred)
        # build timestamps for future: start at last_timestamp + RESAMPLE_SECONDS
        last_ts = df.index[-1]
        future_index = [ (last_ts + pd.Timedelta(seconds=RESAMPLE_SECONDS*(i+1))).isoformat() for i in range(future_steps) ]
        out = []
        for ts, row in zip(future_index, y_inv):
            out.append({"timestamp": ts, "ppm": float(row[0]), "temperature": float(row[1]), "humidity": float(row[2])})
        return jsonify({"predictions": out})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print("Starting predict API on http://127.0.0.1:5000")
    app.run(debug=True, host="0.0.0.0", port=5000)

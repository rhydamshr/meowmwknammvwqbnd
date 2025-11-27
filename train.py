# train.py
# Usage: python train.py
import json
import numpy as np
import pandas as pd
import os
from datetime import timedelta
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib
import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, LSTM, RepeatVector, TimeDistributed, Dense

DATA_PATH = "sensor_data.json"     # your uploaded file
MODEL_DIR = "seq2seq_model"
SCALER_PATH = "scaler.pkl"

# Config
RESAMPLE_SECONDS = 30            # resample interval (seconds). change if you want 1min etc.
PAST_HOURS = 2
FUTURE_HOURS = 2
BATCH_SIZE = 32
EPOCHS = 30
LATENT_DIM = 128
TEST_SIZE = 0.1
RANDOM_SEED = 42

def load_json_to_df(path):
    with open(path, "r") as f:
        txt = f.read().strip()
    # The JSON is likely an array of objects (or concatenated). Use a safe parse:
    try:
        data = json.loads(txt)
    except Exception:
        # attempt to fix concatenated objects by wrapping in []
        txt2 = "[" + txt.replace("}{", "},{") + "]"
        data = json.loads(txt2)
    rows = []
    for rec in data:
        ts = rec.get("timestamp") or rec.get("time") or rec.get("_id", {}).get("$date")
        payload = rec.get("payload", {})
        # some payloads may already be flattened
        ppm = payload.get("ppm")
        temp = payload.get("temperature")
        hum = payload.get("humidity")
        if ppm is None or temp is None or hum is None:
            continue
        rows.append({"timestamp": pd.to_datetime(ts), "ppm": float(ppm),
                     "temperature": float(temp), "humidity": float(hum)})
    df = pd.DataFrame(rows)
    df = df.sort_values("timestamp").drop_duplicates("timestamp").set_index("timestamp")
    return df

def preprocess_resample(df, resample_seconds=30):
    rule = f"{resample_seconds}S"
    # resample by mean and interpolate small gaps
    df_resampled = df.resample(rule).mean()
    df_resampled = df_resampled.interpolate(limit=10, method="time")  # fill short gaps
    return df_resampled

def make_sequences(df_values, past_steps, future_steps):
    X, y = [], []
    total = past_steps + future_steps
    for i in range(len(df_values) - total + 1):
        X.append(df_values[i : i + past_steps])
        y.append(df_values[i + past_steps : i + total])
    X = np.array(X)   # shape (n_samples, past_steps, n_features)
    y = np.array(y)   # shape (n_samples, future_steps, n_features)
    return X, y

def build_seq2seq(past_steps, future_steps, n_features, latent_dim=128):
    # encoder
    encoder_inputs = Input(shape=(past_steps, n_features))
    encoder = LSTM(latent_dim, activation="tanh", return_state=True)
    encoder_outputs, state_h, state_c = encoder(encoder_inputs)
    encoder_states = [state_h, state_c]

    # decoder
    decoder_inputs = RepeatVector(future_steps)(encoder_outputs)  # start with context
    decoder_lstm = LSTM(latent_dim, activation="tanh", return_sequences=True)
    decoder_outputs = decoder_lstm(decoder_inputs, initial_state=encoder_states)
    decoder_dense = TimeDistributed(Dense(n_features))
    decoder_outputs = decoder_dense(decoder_outputs)

    model = Model(encoder_inputs, decoder_outputs)
    model.compile(optimizer="adam", loss="mse")
    return model

def main():
    print("Loading data from", DATA_PATH)
    df = load_json_to_df(DATA_PATH)
    if df.empty:
        raise RuntimeError("No valid data loaded from JSON. Check file format.")
    print(f"Loaded {len(df)} raw rows. First ts: {df.index[0]}, last ts: {df.index[-1]}")

    df_res = preprocess_resample(df, RESAMPLE_SECONDS)
    print(f"After resample -> {len(df_res)} rows (freq {RESAMPLE_SECONDS}s).")
    n_features = df_res.shape[1]

    past_steps = int(PAST_HOURS * 3600 / RESAMPLE_SECONDS)
    future_steps = int(FUTURE_HOURS * 3600 / RESAMPLE_SECONDS)
    print(f"Using past_steps={past_steps}, future_steps={future_steps}, n_features={n_features}")

    values = df_res[["ppm", "temperature", "humidity"]].values
    # scaling
    scaler = StandardScaler()
    values_scaled = scaler.fit_transform(values)
    joblib.dump(scaler, SCALER_PATH)
    print("Saved scaler to", SCALER_PATH)

    X, y = make_sequences(values_scaled, past_steps, future_steps)
    print("Sequence shapes:", X.shape, y.shape)
    if len(X) == 0:
        raise RuntimeError("Not enough data to create sequences. Reduce RESAMPLE_SECONDS or window size.")

    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=TEST_SIZE, random_state=RANDOM_SEED, shuffle=True)
    print("Train/val shapes:", X_train.shape, X_val.shape)

    model = build_seq2seq(past_steps, future_steps, n_features, LATENT_DIM)
    model.summary()
    os.makedirs(MODEL_DIR, exist_ok=True)
    checkpoint = tf.keras.callbacks.ModelCheckpoint(os.path.join(MODEL_DIR, "best_model.h5"),
                                                    save_best_only=True, monitor="val_loss")
    early = tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=7, restore_best_weights=True)
    history = model.fit(X_train, y_train, validation_data=(X_val, y_val),
                        epochs=EPOCHS, batch_size=BATCH_SIZE, callbacks=[checkpoint, early])

    # save final model (SavedModel format)
    model.save(os.path.join(MODEL_DIR, "final_model"))
    print("Saved model to", MODEL_DIR)
    print("Done.")

if __name__ == "__main__":
    main()

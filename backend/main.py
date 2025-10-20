'''
Author: Yoshi Kameda
Date: 2025-10-18

Description: Contains path to handle audio/text inputs. 4 routes: transcribe, verifyWord, verifyVoice, and register
'''
from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import wave
import json
import os
from vosk import Model, KaldiRecognizer
from resemblyzer import VoiceEncoder, preprocess_wav
import numpy as np

app = Flask(__name__)
CORS(app)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# for transcribing
MODEL_PATH = "model/vosk-model-en-us-0.22-lgraph"
model = Model(MODEL_PATH)

# for register
encoder = VoiceEncoder()

'''
route: 'url/transcribe'

- transcribes the input audio using VOSK model
- returns the text version of the audio
'''
@app.route("/transcribe", methods=["POST"])
def transcribe():
    try:
        file = request.files["file"]
        webm_path = os.path.join(UPLOAD_DIR, "recording.webm")
        wav_path = os.path.join(UPLOAD_DIR, "recording.wav")
        file.save(webm_path)

        subprocess.run(
            ["ffmpeg", "-y", "-i", webm_path, "-ar", "16000", "-ac", "1", wav_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        wf = wave.open(wav_path, "rb")
        rec = KaldiRecognizer(model, wf.getframerate())
        rec.SetWords(True)

        results = []

        while True:
            data = wf.readframes(4000)
            if len(data) == 0:
                break
            if rec.AcceptWaveform(data):
                part = json.loads(rec.Result())
                results.append(part)
        results.append(json.loads(rec.FinalResult()))
        wf.close()

        transcript = " ".join([r.get("text", "") for r in results]).strip()

        return jsonify({"transcript": transcript})

    except Exception as e:
        print("Error transcribing:", e)
        return jsonify({"error": str(e)}), 500

'''
route: 'url/verifyWord'

- Verfies if the words match
- Returns true if the words match. False otherwise.
'''
@app.route("/verifyWord", methods=["POST"])
def verifyWord():
    data = request.get_json()

    password = data.get("password")
    unlockKey = data.get("unlockKey")

    if password == unlockKey:
        return jsonify({"match": True, "message": "Unlocked"})
    else:
        return jsonify({"match": False, "message": "Access denied"})
    
'''
route: 'url/verifyVoice'

- Verifies if voices match using Resemblyzer AI
- Returns true if the voices match. False otherwise.
- If the voices do match, deletes the recording files so that new password can be set next time
'''
@app.route("/verifyVoice", methods=["POST"])
def verifyVoice():
    try:
        file = request.files["file"]

        registered_voice_path = os.path.join(UPLOAD_DIR, "registered_voice.npy")

        webm_path = os.path.join(UPLOAD_DIR, "verify.webm")
        wav_path = os.path.join(UPLOAD_DIR, "verify.wav")
        file.save(webm_path)

        subprocess.run(
            ["ffmpeg", "-y", "-i", webm_path, "-ar", "16000", "-ac", "1", wav_path],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )

        wav = preprocess_wav(wav_path)
        new_embedding = encoder.embed_utterance(wav)

        registered_embedding = np.load(registered_voice_path)

        similarity = np.dot(registered_embedding, new_embedding) / (
            np.linalg.norm(registered_embedding) * np.linalg.norm(new_embedding)
        )

        voice_match = similarity > 0.75
        
        if voice_match:
            for f in os.listdir(UPLOAD_DIR):
                os.remove(os.path.join(UPLOAD_DIR, f))

            result = {"match": True, "similarity": float(similarity), "message": "Voice verified!"}
        else:
            result = {"match": False, "similarity": float(similarity), "message": "Voice mismatch."}

        return jsonify(result)

    except Exception as e:
        print("Error verifying voice:", e)
        return jsonify({"error": str(e)}), 500

'''
route: 'url/register'

- Registers your voice using Resemblyzer AI and saves as .wav and .webm file
- Returns a message if successful
'''
@app.route("/register", methods=["POST"])
def register():
    try: 
        file = request.files["file"]
        phrase = request.form.get("phrase").lower().strip()
        print(phrase)

        webm_path = os.path.join(UPLOAD_DIR, "register.webm")
        wav_path = os.path.join(UPLOAD_DIR, "register.wav")
        file.save(webm_path)

        subprocess.run(
            ["ffmpeg", "-y", "-i", webm_path, "-ar", "16000", "-ac", "1", wav_path],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )

        wav = preprocess_wav(wav_path)
        embedding = encoder.embed_utterance(wav)

        np.save(os.path.join(UPLOAD_DIR, "registered_voice.npy"), embedding)
        with open(os.path.join(UPLOAD_DIR, "registered_phrase.txt"), "w") as f:
            f.write(phrase)

        os.remove(webm_path)

        return jsonify({"message": "Voice registered successfully!"})

    except Exception as e:
        print("Error registering voice:", e)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)

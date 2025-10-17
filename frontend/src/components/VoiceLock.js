import React, { useState } from "react";
import VoiceListener from "./VoiceListener";

const URL = "http://127.0.0.1:5000";

function VoiceLock() {
  const [recording, setRecording] = useState(false);
  const [recorder, setRecorder] = useState(null);
  const [password, setPassword] = useState("");     
  const [unlockKey, setUnlockKey] = useState("");   
  const [wordVerified, setWordVerified] = useState(false);
  const [message, setMessage] = useState("");
  const [voiceVerified, setVoiceVerified] = useState(false);

  const recordAndTranscribe = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const chunks = [];

    return new Promise((resolve) => {
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("file", blob, "recording.webm");

        try {
          const response = await fetch(`${URL}/transcribe`, {
            method: "POST",
            body: formData,
          });
          const data = await response.json();
          const text = data.transcript || "";
          resolve({ blob, text });
        } catch (err) {
          console.error("Error uploading:", err);
          resolve("");
        }
      };

      mediaRecorder.start();
      setRecorder(mediaRecorder);
      setRecording(true);

      setTimeout(() => {
        mediaRecorder.stop();
        setRecording(false);
      }, 3000);
    });
  };

  const recordPassword = async () => {
    setMessage("Listening... please say your password clearly.");
    const { blob, text } = await recordAndTranscribe();    
    setPassword(text);
    setMessage("Password captured successfully.");
    console.log("Saved password:", text);

    const formData = new FormData();
    formData.append("file", blob, "recording.webm");
    formData.append("phrase", text);

    const response = await fetch(`${URL}/register`, {
        method: "POST",
        body: formData,
    });
    const result = await response.json();
    console.log("Register result:", result);
    setMessage(result.message || "Password has been set.");
  };

  const unlockPassword = async () => {
    setMessage("Listening... please say your password to unlock.");
    const { blob, text } = await recordAndTranscribe();
    setUnlockKey(text);
    console.log("Unlock attempt:", text);

    try {
      const verifyWord = await fetch(`${URL}/verifyWord`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password, unlockKey: text }),
      });

      const result = await verifyWord.json();
      console.log("Verification result:", result);

      if (result.match) {
        setWordVerified(true);
        setMessage("Password recognized. Verifying voice...");

        const formData = new FormData();
        formData.append("file", blob, "recording.webm");
        formData.append("phrase", text);

        const verifyVoice = await fetch(`${URL}/verifyVoice`, {
            method: "POST",
            body: formData,
        });

        const voiceResult = await verifyVoice.json();
        console.log("Voice verification result:", voiceResult);
        if (voiceResult.match){
            setVoiceVerified(true);
            setMessage("Access granted. Voice verified successfully.");
        } else {
            setVoiceVerified(false);
            setMessage("Voice verification failed. Please try again.");
        }

      } else {
        setWordVerified(false);
        setMessage("Incorrect password. Access denied.");
      }
    } catch (err) {
      console.error("Verification error:", err);
      setMessage("Error verifying voice or password. Please try again.");
    }
  };

  return (
    <>
      <VoiceListener onTrigger={recordPassword} />

      <div style={{ textAlign: "center", marginTop: "100px" }}>
        {!(wordVerified && voiceVerified) && (
          <>
            <h2 style={{ marginBottom: "20px" }}>🔑 Create your voice password 🔑</h2>
            <h3>(You can also say "set password" to set your password!)</h3>

            {!recording && (
              <>
                <button 
                  onClick={recordPassword} 
                  style={{ marginRight: "10px", padding: "10px 20px" }}
                >
                  Set Voice Password
                </button>
                <button 
                  onClick={unlockPassword} 
                  style={{ padding: "10px 20px" }}
                >
                  Unlock
                </button>
              </>
            )}
            {recording && (
              <button
                onClick={() => recorder?.stop()}
                style={{
                  background: "red",
                  color: "white",
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "5px",
                }}
              >
                Stop Recording
              </button>
            )}
            <p style={{ marginTop: "20px", color: "#333" }}>{message}</p>
          </>
        )}

        {(wordVerified && voiceVerified) && (
          <div
            style={{
              width: "400px",
              margin: "auto",
              padding: "40px",
              border: "2px solid #4CAF50",
              borderRadius: "15px",
              backgroundColor: "#F8FFF8",
            }}
          >
            <h2 style={{ color: "#2E7D32" }}>Access Granted</h2>
            <p>Welcome! The system has verified your voice successfully.</p>
          </div>
        )}
      </div>
    </>
  );
}

export default VoiceLock;

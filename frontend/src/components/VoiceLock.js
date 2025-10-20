/*
*  Author: Yoshi Kameda
*  Date: 2025-10-18
*
*  Description: Locks and unlocks website using your voice. The key is verified only if the phrase and your voice matches.
*/

import React, { useState } from "react";
import VoiceListener from "./VoiceListener";
import "./VoiceLock.css";

// backend url
const URL = "http://127.0.0.1:5000";

function VoiceLock() {
  // states
  const [recording, setRecording] = useState(false);
  const [recorder, setRecorder] = useState(null);
  const [password, setPassword] = useState("");     
  const [unlockKey, setUnlockKey] = useState("");   
  const [message, setMessage] = useState("");
  const [voiceVerified, setVoiceVerified] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  /*
  *  - Records user voice with MediaRecorder
  *  - Transcribes the voice into text using VOSK model
  */
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
          resolve({ blob: null, text: "" });
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

  /*
  *  - Records the password to lock with
  *  - Registers the word and the voice in the backend
  */
  const recordPassword = async () => {
    setMessage("Listening... please say your password clearly.");
    const { blob, text } = await recordAndTranscribe();    

    if (!blob || !text) {
      setMessage("Failed to record. Please try again.");
      return;
    }

    const formData = new FormData();
    formData.append("file", blob, "recording.webm");
    formData.append("phrase", text);

    try {
      const response = await fetch(`${URL}/register`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      setPassword(text);
      setMessage(result.message || "Password has been set successfully.");
      setIsLocked(true);
    } catch (err) {
      console.error("Error registering password:", err);
      setMessage("Error saving password. Please try again.");
    }
  };

  /*
  *  - Unlocks the key using user voice
  *  - Verifies if the phrase match
  *  - Verifies if the voice match
  */
  const unlockPassword = async () => {
    setMessage("Listening... please say your password to unlock.");
    const { blob, text } = await recordAndTranscribe();
    setUnlockKey(text);

    try {
      const verifyWord = await fetch(`${URL}/verifyWord`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, unlockKey: text }),
      });

      const result = await verifyWord.json();

      // verfiy word first
      if (result.match) {
        setMessage("Password recognized. Verifying voice...");
        const formData = new FormData();
        formData.append("file", blob, "recording.webm");
        formData.append("phrase", text);

        const verifyVoice = await fetch(`${URL}/verifyVoice`, {
          method: "POST",
          body: formData,
        });

        // now verify voice
        const voiceResult = await verifyVoice.json();
        if (voiceResult.match) {
          setVoiceVerified(true);
          setMessage("Access granted. Voice verified successfully.");
          setIsLocked(false);
          setPassword("");
          setUnlockKey("");
        } else {
          setVoiceVerified(false);
          setMessage("Voice verification failed. Please try again.");
        }
      } else {
        setMessage("Incorrect password. Access denied.");
      }
    } catch (err) {
      console.error("Verification error:", err);
      setMessage("Error verifying voice or password. Please try again.");
    }
  };

  /*
  *  UI render
  *  Key feature: Once the password is set, the website is grayed out to indicate that it is locked
  *               If unlocked, then the website is switched back to the original state
  */
  return (
    <>
      <VoiceListener
        onTrigger={isLocked ? unlockPassword : recordPassword}
        isLocked={isLocked}
      />

      {/* Unlocked view */}
      {!isLocked && (
        <div className="voice-container">
          <h2 className="voice-title">🔑 Create your voice password 🔑</h2>
          <h3 className="voice-subtitle">
            (You can also say "set password" to set your password!)
          </h3>

          {!recording ? (
            <button onClick={recordPassword} className="voice-button">
              Set Voice Password
            </button>
          ) : (
            <button onClick={() => recorder?.stop()} className="stop-button">
              Stop Recording
            </button>
          )}

          <p className="voice-message">{message}</p>
        </div>
      )}

      {/* Locked view */}
      {isLocked && (
        <div className="locked-overlay">
          <h2>🔒 Website Locked 🔒</h2>
          <p>Say your password to unlock.</p>
          <p>(You can also say "unlock" to unlock!)</p>

          {!recording ? (
            <button onClick={unlockPassword} className="unlock-button">
              Unlock
            </button>
          ) : (
            <button onClick={() => recorder?.stop()} className="stop-button">
              Stop Recording
            </button>
          )}

          <p className="voice-message">{message}</p>
        </div>
      )}
    </>
  );
}

export default VoiceLock;

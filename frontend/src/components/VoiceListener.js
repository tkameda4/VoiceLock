/*
*  Author: Yoshi Kameda
*  Date: 2025-10-18
*
*  Uses the Web Speech API's SpeechRecognition interface to constantly look out for
*  the phrase: "set password" and "unlock"
*  
*  If recognized "set password" -> starts recording to set new password
*  If recognized "unlock" -> starts recording to unlock key
*/
import { useEffect } from "react";

function VoiceListener({ onTrigger, isLocked }) {
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("SpeechRecognition API not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const transcript =
        event.results[event.results.length - 1][0].transcript
          .toLowerCase()
          .trim();

      if (!isLocked && transcript.includes("set password")) {
        onTrigger?.(); 
      } else if (isLocked && transcript.includes("unlock")) {
        onTrigger?.(); 
      }
    };

    recognition.onerror = (e) => {
      if (e.error === "aborted") {
        recognition.stop();
        setTimeout(() => recognition.start(), 500);
      } else {
        console.error("Recognition error:", e);
      }
    };

    recognition.onend = () => {
      console.log("SpeechRecognition ended. Restarting...");
      setTimeout(() => recognition.start(), 500);
    };

    recognition.start();
    console.log("SpeechRecognition started");

    return () => {
      recognition.onend = null;
      recognition.onerror = null;
      recognition.stop();
    };
  }, [onTrigger]);

  return null;
}


export default VoiceListener;
import { useEffect } from "react";

function VoiceListener({ onTrigger }) {
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

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
            event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        console.log("Heard:", transcript);
        if (transcript.includes("set password")) {
            console.log("Trigger phrase detected!");
            onTrigger?.();
        }
    };

    recognition.onerror = (e) => {
      if (e.error === "aborted") {
        console.log("SpeechRecognition aborted — restarting...");
        recognition.stop();
        setTimeout(() => recognition.start(), 500);
      } else {
        console.error("Recognition error:", e);
      }
    };

    recognition.onend = () => {
      console.log("SpeechRecognition ended — restarting...");
      setTimeout(() => recognition.start(), 500);
    };

    recognition.start();
    console.log("🎙️ VoiceListener started.");

    return () => {
      recognition.onend = null;
      recognition.onerror = null;
      recognition.stop();
    };
  }, [onTrigger]);

  return null;
}


export default VoiceListener;
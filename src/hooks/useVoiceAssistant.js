import { useState, useRef, useEffect, useCallback } from "react";

export function useVoiceAssistant(onResult) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);
  const listeningRef = useRef(false);
  const onResultRef = useRef(onResult);

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        }
      }
      if (final.trim()) {
        setTranscript(final.trim());
        onResultRef.current?.(final.trim());
      }
    };

    recognition.onerror = (e) => {
      if (e.error !== "no-speech" && e.error !== "aborted") {
        console.error("Voice error:", e.error);
      }
    };

    recognition.onend = () => {
      if (listeningRef.current) {
        try { recognition.start(); } catch (_) {}
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    return () => {
      listeningRef.current = false;
      try { recognition.stop(); } catch (_) {}
    };
  }, []);

  const start = useCallback(() => {
    if (!recognitionRef.current) return false;
    listeningRef.current = true;
    setIsListening(true);
    try { recognitionRef.current.start(); return true; }
    catch (_) { return false; }
  }, []);

  const stop = useCallback(() => {
    listeningRef.current = false;
    setIsListening(false);
    try { recognitionRef.current?.stop(); } catch (_) {}
  }, []);

  const isSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  return { isListening, isSupported, transcript, start, stop, setTranscript };
}
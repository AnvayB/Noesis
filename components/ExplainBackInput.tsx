"use client";

import { useEffect, useRef, useState } from "react";

// The Web Speech API isn't in TypeScript's lib.dom.d.ts and is only
// implemented (prefixed) in Chromium/Safari — Firefox has no support. Plan
// section D treats this as an intentionally simple V1 implementation,
// explicitly swappable later for a real speech-recognition service.
interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: { [index: number]: SpeechRecognitionAlternative };
}
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export function ExplainBackInput() {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [usedVoice, setUsedVoice] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef("");

  useEffect(() => {
    // Browser API availability can't be known during SSR, so a one-time
    // setState on mount is the correct pattern here, not an anti-pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
    return () => recognitionRef.current?.stop();
  }, []);

  function startListening() {
    const RecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!RecognitionCtor) return;

    const recognition = new RecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    baseTextRef.current = text;

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setText(baseTextRef.current ? `${baseTextRef.current} ${transcript}` : transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
    setUsedVoice(true);
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setIsListening(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        name="explanationText"
        required
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={supported ? "Start anywhere. Type, or record instead." : "Start anywhere."}
        className="writing"
      />
      <input type="hidden" name="inputMode" value={usedVoice ? "voice" : "text"} />
      {supported && (
        <button
          type="button"
          onClick={isListening ? stopListening : startListening}
          className={isListening ? "btn btn-line btn-sm w-fit text-rose" : "btn btn-line btn-sm w-fit"}
        >
          {isListening ? "Stop recording" : "Record instead"}
        </button>
      )}
    </div>
  );
}

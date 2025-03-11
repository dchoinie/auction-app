"use client";

import { useEffect, useRef, useState, memo } from "react";

interface CountdownProps {
  onComplete: () => void;
}

const Countdown = memo(function Countdown({ onComplete }: CountdownProps) {
  const [stage, setStage] = useState<"first" | "second" | "sold">("first");
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const hasSpokenRef = useRef<Set<string>>(new Set());

  const speak = (text: string) => {
    if (hasSpokenRef.current.has(text)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 0.9;
    window.speechSynthesis.speak(utterance);
    hasSpokenRef.current.add(text);
  };

  useEffect(() => {
    // Reset spoken phrases on mount
    hasSpokenRef.current = new Set();

    const startCountdown = () => {
      // Going once
      const firstTimeout = setTimeout(() => {
        speak("Going once");
        setStage("first");

        // Going twice
        const secondTimeout = setTimeout(() => {
          speak("Going twice");
          setStage("second");

          // Sold
          const soldTimeout = setTimeout(() => {
            speak("Sold!");
            setStage("sold");
            // Add a small delay before completing to show the "SOLD!" message
            setTimeout(onComplete, 1000);
          }, 3000);

          timeoutsRef.current.push(soldTimeout);
        }, 3000);

        timeoutsRef.current.push(secondTimeout);
      }, 0);

      timeoutsRef.current.push(firstTimeout);
    };

    startCountdown();

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
      window.speechSynthesis.cancel();
      hasSpokenRef.current.clear();
    };
  }, [onComplete]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <div className="rounded-lg bg-white/90 px-12 py-8 text-center text-4xl font-bold shadow-lg">
        {stage === "first" && <p className="text-blue-600">Going once...</p>}
        {stage === "second" && (
          <p className="text-yellow-600">Going twice...</p>
        )}
        {stage === "sold" && <p className="text-green-600">SOLD!</p>}
      </div>
    </div>
  );
});

export default Countdown;

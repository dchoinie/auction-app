"use client";

import { useEffect, useRef, useState, memo } from "react";

interface CountdownProps {
  onComplete: () => void;
  onCancel: () => void;
  startTime?: number;
}

const STAGE_DURATION = 3000; // 3 seconds per stage
const TOTAL_DURATION = STAGE_DURATION * 3; // 9 seconds total

const Countdown = memo(function Countdown({
  onComplete,
  onCancel,
  startTime,
}: CountdownProps) {
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

    if (!startTime) return;

    const now = Date.now();
    const elapsedTime = now - startTime;

    // If the countdown should have already completed
    if (elapsedTime >= TOTAL_DURATION) {
      onComplete();
      return;
    }

    const startCountdown = () => {
      // Calculate remaining time for each stage
      if (elapsedTime < STAGE_DURATION) {
        // Still in first stage
        speak("Going once");
        setStage("first");

        const remainingInFirst = STAGE_DURATION - elapsedTime;

        const secondTimeout = setTimeout(() => {
          speak("Going twice");
          setStage("second");

          const soldTimeout = setTimeout(() => {
            speak("Sold!");
            setStage("sold");
            setTimeout(onComplete, 1000);
          }, STAGE_DURATION);

          timeoutsRef.current.push(soldTimeout);
        }, remainingInFirst);

        timeoutsRef.current.push(secondTimeout);
      } else if (elapsedTime < STAGE_DURATION * 2) {
        // In second stage
        speak("Going twice");
        setStage("second");

        const remainingInSecond = STAGE_DURATION * 2 - elapsedTime;

        const soldTimeout = setTimeout(() => {
          speak("Sold!");
          setStage("sold");
          setTimeout(onComplete, 1000);
        }, remainingInSecond);

        timeoutsRef.current.push(soldTimeout);
      } else {
        // In final stage
        speak("Sold!");
        setStage("sold");
        setTimeout(onComplete, 1000);
      }
    };

    startCountdown();

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
      window.speechSynthesis.cancel();
      hasSpokenRef.current.clear();
    };
  }, [onComplete, startTime]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="rounded-lg bg-white/90 px-6 py-6 text-center shadow-lg sm:px-12 sm:py-8">
        <div className="text-2xl font-bold sm:text-4xl">
          {stage === "first" && <p className="text-blue-600">Going once...</p>}
          {stage === "second" && (
            <p className="text-yellow-600">Going twice...</p>
          )}
          {stage === "sold" && <p className="text-green-600">SOLD!</p>}
        </div>
        <button
          onClick={onCancel}
          className="mt-4 rounded bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
});

export default Countdown;

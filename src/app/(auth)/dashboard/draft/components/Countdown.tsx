"use client";

import { useEffect, useState } from "react";

interface CountdownProps {
  onComplete: () => void;
  onCancel: () => void;
}

export default function Countdown({ onComplete, onCancel }: CountdownProps) {
  const [stage, setStage] = useState<"first" | "second" | "sold">("first");

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const firstTimeout = setTimeout(() => {
      speak("Going once");
      setStage("first");

      const secondTimeout = setTimeout(() => {
        speak("Going twice");
        setStage("second");

        const soldTimeout = setTimeout(() => {
          speak("Sold!");
          setStage("sold");
          setTimeout(onComplete, 800);
        }, 3000);

        return () => clearTimeout(soldTimeout);
      }, 3000);

      return () => clearTimeout(secondTimeout);
    }, 0);

    return () => {
      clearTimeout(firstTimeout);
      window.speechSynthesis.cancel();
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
}

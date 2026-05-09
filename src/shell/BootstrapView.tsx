import { useEffect, useState } from "react";

const PHASES = ["Designing layout…", "Composing widgets…", "Almost ready…"];

export function BootstrapView({ message }: { message: string }) {
  const [phaseIdx, setPhaseIdx] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhaseIdx(1), 2000);
    const t2 = setTimeout(() => setPhaseIdx(2), 5000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-2xl border-4 border-neutral-700" />
        <div
          className="absolute inset-0 rounded-2xl border-4 border-emerald-500 border-t-transparent animate-spin"
          style={{ animationDuration: "1.2s" }}
        />
      </div>
      <div className="text-sm text-neutral-300 mb-1">{PHASES[phaseIdx]}</div>
      <div className="text-xs text-neutral-500 px-4">"{message}"</div>
    </div>
  );
}

import type { ReactNode } from "react";

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-[390px] h-[844px] rounded-[44px] border-[6px] border-neutral-700 bg-black overflow-hidden flex flex-col relative shadow-2xl">
        <div className="h-8 bg-black flex items-center justify-center text-xs text-neutral-400">
          9:41
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">{children}</div>
      </div>
    </div>
  );
}

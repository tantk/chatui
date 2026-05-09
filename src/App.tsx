import { useEffect, useState } from "react";
import { PhoneFrame } from "./shell/PhoneFrame";
import { HomeScreen } from "./shell/HomeScreen";
import { NewChatScreen } from "./shell/NewChatScreen";
import { BootstrapView } from "./shell/BootstrapView";
import { AppView } from "./shell/AppView";
import { storage } from "./lib/storage";
import { bootstrap } from "./lib/api";
import type { App } from "./lib/types";

type Screen =
  | { kind: "home" }
  | { kind: "newchat" }
  | { kind: "bootstrapping"; message: string }
  | { kind: "app"; id: string };

export default function App() {
  const [apps, setApps] = useState<App[]>(() => storage.loadApps());
  const [screen, setScreen] = useState<Screen>({ kind: "home" });

  useEffect(() => {
    storage.saveApps(apps);
  }, [apps]);

  async function handleNewChatSubmit(message: string) {
    setScreen({ kind: "bootstrapping", message });
    try {
      const newApp = await bootstrap(message);
      setApps((prev) => [...prev, newApp]);
      setScreen({ kind: "app", id: newApp.id });
    } catch (e) {
      alert((e as Error).message);
      setScreen({ kind: "newchat" });
    }
  }

  return (
    <PhoneFrame>
      {screen.kind === "home" && (
        <HomeScreen
          apps={apps}
          onOpen={(id) => setScreen({ kind: "app", id })}
          onNewChat={() => setScreen({ kind: "newchat" })}
        />
      )}
      {screen.kind === "newchat" && (
        <NewChatScreen
          onSubmit={handleNewChatSubmit}
          onBack={() => setScreen({ kind: "home" })}
        />
      )}
      {screen.kind === "bootstrapping" && <BootstrapView message={screen.message} />}
      {screen.kind === "app" && (
        <AppView
          appId={screen.id}
          apps={apps}
          setApps={setApps}
          onHome={() => setScreen({ kind: "home" })}
        />
      )}
    </PhoneFrame>
  );
}

import { AkiraShell } from "@/components/akira-shell";
import { SessionProvider } from "@/components/session-provider";

export default function HomePage() {
  return (
    <SessionProvider>
      <AkiraShell />
    </SessionProvider>
  );
}

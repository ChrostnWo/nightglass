import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Splash, VaultShell } from "@/components/vault/shell";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <Splash />;
  return <VaultShell />;
}

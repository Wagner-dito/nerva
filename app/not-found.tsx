import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-12">
      <div className="pointer-events-none absolute inset-0 bg-signal-glow" />

      <div className="relative w-full max-w-md space-y-6 text-center">
        <Wordmark className="text-2xl" />
        <h1 className="font-serif text-6xl leading-none tracking-tight">
          404
        </h1>
        <p className="text-lg text-muted-foreground">
          Essa página não existe — ou foi pro ralo das sinapses.
        </p>
        <Button asChild>
          <Link href="/">Voltar pra home</Link>
        </Button>
      </div>
    </main>
  );
}

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { BotForm } from "@/app/dashboard/bots/bot-form";

export default function NewBotPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <Link
          href="/dashboard/bots"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Voltar
        </Link>
        <h1 className="mt-2 font-serif text-4xl leading-tight tracking-tight">
          Novo bot
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure o atendente virtual. Você pode editar tudo depois.
        </p>
      </div>

      <BotForm mode="create" />
    </div>
  );
}

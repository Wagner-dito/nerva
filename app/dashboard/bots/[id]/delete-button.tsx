"use client";

import { Trash2 } from "lucide-react";

import { deleteBot } from "@/app/dashboard/bots/actions";
import { Button } from "@/components/ui/button";

export function DeleteBotButton({ botId }: { botId: string }) {
  return (
    <form
      action={deleteBot}
      onSubmit={(e) => {
        if (!confirm("Excluir este bot? Essa ação não pode ser desfeita.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={botId} />
      <Button type="submit" variant="destructive" size="sm">
        <Trash2 />
        Excluir bot
      </Button>
    </form>
  );
}

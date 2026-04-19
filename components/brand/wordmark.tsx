import { cn } from "@/lib/utils";

type WordmarkProps = {
  className?: string;
  as?: "span" | "h1" | "h2";
};

export function Wordmark({ className, as: Tag = "span" }: WordmarkProps) {
  return (
    <Tag className={cn("font-serif tracking-tight", className)}>
      Nerva<span className="text-primary">.</span>
    </Tag>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type GlassCardProps = {
  children: ReactNode;
  className?: string;
  gold?: boolean;
};

export function GlassCard({ children, className, gold = false }: GlassCardProps) {
  return (
    <div className={cn(gold ? "glass-gold" : "glass-card", "rounded-2xl", className)}>
      {children}
    </div>
  );
}

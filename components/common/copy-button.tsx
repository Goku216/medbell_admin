"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function CopyButton({
  value,
  label = "Copy",
  className,
  size = "icon-sm",
  variant = "ghost",
}: {
  value: string;
  label?: string;
  className?: string;
  size?: "icon-sm" | "sm" | "default";
  variant?: "ghost" | "outline" | "secondary";
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Your browser blocked clipboard access. Select and copy manually.");
    }
  }

  const iconOnly = size === "icon-sm";

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={copy}
      className={cn(className)}
      aria-label={iconOnly ? `${label}: ${value}` : undefined}
      title={iconOnly ? value : undefined}
    >
      {copied ? <Check className="text-success" /> : <Copy />}
      {iconOnly ? null : <span>{copied ? "Copied" : label}</span>}
    </Button>
  );
}

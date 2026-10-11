import React from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export const TELEGRAM_CHANNEL_URL = "https://t.me/officialzoomupdates";

interface TelegramCtaProps {
  label?: string;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg";
}

export default function TelegramCta({
  label = "Join our Telegram channel",
  className,
  variant = "outline",
  size = "sm",
}: TelegramCtaProps) {
  return (
    <Button asChild variant={variant} size={size} className={className}>
      <a
        href={TELEGRAM_CHANNEL_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${label} (opens in a new tab)`}
      >
        <Send aria-hidden="true" />
        {label}
      </a>
    </Button>
  );
}

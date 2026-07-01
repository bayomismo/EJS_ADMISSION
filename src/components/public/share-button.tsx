"use client";

import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareButton({ title }: { title: string }) {
  return (
    <Button
      variant="ghost"
      className="w-full h-11"
      onClick={() => {
        if (typeof navigator !== "undefined") {
          if (navigator.share) {
            navigator.share({ title, url: window.location.href }).catch(() => {});
          } else if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href);
          }
        }
      }}
    >
      <Share2 className="ml-2 h-4 w-4" /> مشاركة
    </Button>
  );
}

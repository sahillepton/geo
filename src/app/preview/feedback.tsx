"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useActionState } from "react";
import { submitFeedback } from "./action";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Feedback({ videoId }: { videoId: string }) {
  const [state, formAction, isPending] = useActionState(submitFeedback, null);
  const [submitted, setSubmitted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state?.success) {
      toast.success("Feedback submitted successfully");
      setSubmitted(true);

      // Close the popover immediately
      setOpen(false);

      // Reset submitted state after 2 seconds
      const timer = setTimeout(() => setSubmitted(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`h-8 text-xs transition-all duration-300 ${
            submitted ? "bg-green-500 text-white" : ""
          }`}
          size="sm"
          disabled={isPending}
        >
          {submitted ? (
            "Feedback Submitted"
          ) : isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Feedback"
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-9999 flex flex-col gap-2" side="left">
        <form action={formAction} className="flex flex-col gap-2">
          <input type="hidden" name="videoId" value={videoId} />
          <Textarea name="feedback" />
          <Button
            variant="secondary"
            className="w-20"
            size="sm"
            type="submit"
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Submit"
            )}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

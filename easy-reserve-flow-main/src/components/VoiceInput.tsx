import { useRef, useState } from "react";
import { Mic, Loader2, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Records mic audio in any language and sends it to the
 * `transcribe-voice` edge function (Lovable AI / Gemini).
 * Result text is appended via `onTranscript`.
 */
export function VoiceInput({ onTranscript, disabled, className }: Props) {
  const [state, setState] = useState<"idle" | "recording" | "processing">("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stopStream();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        if (blob.size === 0) {
          setState("idle");
          return;
        }
        setState("processing");
        try {
          const base64 = await blobToBase64(blob);
          const { data, error } = await supabase.functions.invoke("transcribe-voice", {
            body: { audio: base64, mimeType: blob.type },
          });
          if (error) throw error;
          const text = (data as { text?: string } | null)?.text?.trim?.() ?? "";
          if (!text) {
            toast.info("Couldn't catch that — try again.");
          } else {
            onTranscript(text);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "Transcription failed";
          toast.error(message);
        } finally {
          setState("idle");
        }
      };

      recorder.start();
      setState("recording");
    } catch (err) {
      stopStream();
      const message = err instanceof Error ? err.message : "Microphone access denied";
      toast.error(message);
      setState("idle");
    }
  };

  const stop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleClick = () => {
    if (state === "idle") start();
    else if (state === "recording") stop();
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={disabled || state === "processing"}
      variant={state === "recording" ? "destructive" : "outline"}
      size="sm"
      className={cn("gap-2", className)}
      aria-label={
        state === "recording"
          ? "Stop recording"
          : state === "processing"
            ? "Transcribing"
            : "Start voice input"
      }
    >
      {state === "processing" ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Transcribing…
        </>
      ) : state === "recording" ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
          </span>
          <Square className="h-3.5 w-3.5" /> Stop
        </>
      ) : (
        <>
          <Mic className="h-4 w-4" /> Speak
        </>
      )}
    </Button>
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // strip "data:<mime>;base64," prefix
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

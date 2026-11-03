import {
  CalendarX2,
  CircleAlert,
  type LucideIcon,
  SearchX,
  ServerCrash,
  ShieldX,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ApiErrorKind, ApiErrorView } from "@/lib/api-error";

// Each failure kind keeps its own icon and title; access and technical
// failures use the destructive variant (lab section 2.2: kinds stay distinct).
const KINDS: Record<
  ApiErrorKind,
  { icon: LucideIcon; variant: "default" | "destructive" }
> = {
  validation: { icon: CircleAlert, variant: "default" },
  access: { icon: ShieldX, variant: "destructive" },
  "not-found": { icon: SearchX, variant: "default" },
  conflict: { icon: CalendarX2, variant: "default" },
  technical: { icon: ServerCrash, variant: "destructive" },
};

export function ErrorBox({ error }: { error: ApiErrorView }) {
  const { icon: Icon, variant } = KINDS[error.kind];

  return (
    <Alert variant={variant}>
      <Icon />
      <AlertTitle>{error.title}</AlertTitle>
      <AlertDescription>
        <p>{error.message}</p>
        {error.requestId && (
          <p className="font-mono text-xs">request id: {error.requestId}</p>
        )}
      </AlertDescription>
    </Alert>
  );
}

import type { ApiErrorView } from "@/lib/api-error";

const STYLES: Record<ApiErrorView["kind"], string> = {
  validation: "border-amber-300 bg-amber-50 text-amber-900",
  access: "border-red-300 bg-red-50 text-red-900",
  "not-found": "border-slate-300 bg-slate-50 text-slate-900",
  conflict: "border-orange-300 bg-orange-50 text-orange-900",
  technical: "border-red-500 bg-red-100 text-red-950",
};

export function ErrorBox({ error }: { error: ApiErrorView }) {
  return (
    <div
      role="alert"
      className={`rounded-lg border px-3 py-2 text-sm ${STYLES[error.kind]}`}
    >
      <p className="font-medium">{error.title}</p>
      <p>{error.message}</p>
      {error.requestId && (
        <p className="mt-1 font-mono text-xs opacity-75">
          request id: {error.requestId}
        </p>
      )}
    </div>
  );
}

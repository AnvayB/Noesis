"use client";

import { useFormStatus } from "react-dom";

// A form's one filled button. While the action runs it says what is
// happening, so the multi-second model call is never silent.
export function SubmitButton({
  children,
  pendingLabel,
  className = "btn btn-ink",
  name,
  value,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      aria-busy={pending}
      className={className}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

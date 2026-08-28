import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils/cn";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="flex items-center gap-2">
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        className={cn(
          "h-4 w-4 cursor-pointer rounded border-outline-variant bg-surface-container-lowest text-primary-container focus-visible:ring-primary-container",
          className,
        )}
        {...props}
      />
      <label
        htmlFor={inputId}
        className="cursor-pointer font-body-md text-body-md text-on-surface-variant"
      >
        {label}
      </label>
    </div>
  );
});

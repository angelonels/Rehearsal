import * as React from "react";
import { cn } from "../../lib/cn";
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn("h-11 w-full rounded-lg border border-[#30342f] bg-[#111311] px-3 text-sm text-white outline-none transition focus:border-[#caff3d] focus:ring-1 focus:ring-[#caff3d] disabled:opacity-50", className)} {...props} />
));
Input.displayName = "Input";

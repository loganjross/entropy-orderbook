import * as React from "react";
import { Loader2Icon } from "lucide-react";

import { cn } from "../../utils";

export function Spinner({ className, ...props }: React.ComponentProps<"svg">): React.ReactElement {
  return <Loader2Icon role="status" aria-label="Loading" className={cn("size-4 animate-spin", className)} {...props} />;
}

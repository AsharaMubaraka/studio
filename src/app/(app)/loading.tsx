
import { Loader2 } from "lucide-react";

export default function Loading() {
  // This UI will be shown during navigation between pages within the (app) layout.
  return (
    <div className="flex flex-1 items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}

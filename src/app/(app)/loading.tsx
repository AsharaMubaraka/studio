
import { Loader2 } from "lucide-react";
import { siteConfig } from "@/config/site";

export default function Loading() {
  // This UI will be shown during navigation between pages within the (app) layout.
  return (
    <div className="flex flex-1 flex-col items-center justify-center animate-fadeIn">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-lg font-semibold text-foreground">
        Loading {siteConfig.name}...
      </p>
    </div>
  );
}

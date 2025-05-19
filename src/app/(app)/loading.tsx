
import { Orbit } from "lucide-react"; // Changed from Loader2 to Orbit

export default function Loading() {
  // This UI will be shown during navigation between pages within the (app) layout.
  return (
    <div className="flex flex-1 flex-col items-center justify-center animate-fadeIn">
      <Orbit className="h-16 w-16 animate-spin text-primary" />
    </div>
  );
}

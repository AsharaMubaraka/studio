
"use client";

import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WebViewPage() {
  const hardcodedUrl = "https://www.asharamubaraka.net";
  const [iframeError, setIframeError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Web View | Anjuman Hub";
  }, []);

  return (
    <div className={cn(
      "animate-fadeIn h-full",
      iframeError ? "flex flex-col items-center justify-center p-4" : "flex flex-col"
    )}>
      {iframeError ? (
        <Alert variant="destructive" className="shadow-md w-full max-w-lg">
          <Globe className="h-5 w-5" />
          <AlertTitle>Error Loading Page</AlertTitle>
          <AlertDescription>
            {iframeError}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="flex-grow w-full relative">
            <iframe
              src={hardcodedUrl}
              title="Embedded Web View"
              className="absolute top-0 left-0 h-full w-full border-0"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              onError={() => {
                setIframeError(`Could not load content from ${hardcodedUrl}. The site might not allow embedding or there might be a network issue.`);
              }}
            />
        </div>
      )}
    </div>
  );
}

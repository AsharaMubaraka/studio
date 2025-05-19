
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Globe } from "lucide-react";

export default function WebViewPage() {
  const hardcodedUrl = "https://www.asharamubaraka.net";
  const [iframeError, setIframeError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Web View | Anjuman Hub";
  }, []);

  return (
    <div className="animate-fadeIn h-full flex flex-col">
      {iframeError ? (
        <Alert variant="destructive" className="shadow-md m-4">
          <Globe className="h-5 w-5" />
          <AlertTitle>Error Loading Page</AlertTitle>
          <AlertDescription>
            {iframeError}
          </AlertDescription>
        </Alert>
      ) : (
        <Card className="shadow-lg flex-grow border-0 rounded-none md:rounded-lg">
          <CardContent className="p-0 h-full">
            <iframe
              src={hardcodedUrl}
              title="Embedded Web View"
              className="h-full w-full md:rounded-b-lg border-0"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms" // Consider security implications
              onError={() => {
                setIframeError(`Could not load content from ${hardcodedUrl}. The site might not allow embedding or there might be a network issue.`);
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

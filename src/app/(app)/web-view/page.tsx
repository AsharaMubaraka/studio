
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Globe, ExternalLink } from "lucide-react";

export default function WebViewPage() {
  const defaultUrl = "https://www.asharamubaraka.net";
  const [iframeSrc, setIframeSrc] = useState(defaultUrl);
  const [iframeError, setIframeError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Web View | Anjuman Hub";
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn h-full flex flex-col">
      <div className="flex justify-between items-center p-4 bg-card rounded-lg shadow">
        <div className="flex items-center">
          <Globe className="mr-3 h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Web View</h1>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={iframeSrc} target="_blank" rel="noopener noreferrer">
            Open in new tab <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>

      {iframeError ? (
        <Alert variant="destructive" className="shadow-md">
          <Globe className="h-5 w-5" />
          <AlertTitle>Error Loading Page</AlertTitle>
          <AlertDescription>
            {iframeError}
          </AlertDescription>
        </Alert>
      ) : iframeSrc ? (
        <Card className="shadow-lg flex-grow">
          <CardContent className="p-0 h-full">
            <iframe
              src={iframeSrc}
              title="Embedded Web View"
              className="h-full w-full rounded-b-lg border-0"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms" // Consider security implications
              onError={() => {
                setIframeError(`Could not load content from ${iframeSrc}. The site might not allow embedding or there might be a network issue.`);
                // We don't clear iframeSrc here to keep the "Open in new tab" button functional
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <Alert variant="default" className="shadow-md">
          <Globe className="h-5 w-5" />
          <AlertTitle>No URL Loaded</AlertTitle>
          <AlertDescription>
            The web page could not be loaded.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

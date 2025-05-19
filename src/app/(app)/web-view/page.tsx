
"use client";

import { useState, useEffect } from "react";
import type { Metadata } from "next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Globe, ExternalLink, AlertCircle } from "lucide-react";

// export const metadata: Metadata = { // Cannot be used in client component
//   title: "Web View",
// };

const isValidUrl = (urlString: string): boolean => {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
};

export default function WebViewPage() {
  const [url, setUrl] = useState("https://www.example.com");
  const [iframeSrc, setIframeSrc] = useState("https://www.example.com");
  const [inputError, setInputError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Web View | Anjuman Hub";
  }, []);

  const handleLoadUrl = () => {
    if (isValidUrl(url)) {
      setIframeSrc(url);
      setInputError(null);
    } else {
      setInputError("Please enter a valid URL (e.g., https://example.com)");
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight flex items-center">
            <Globe className="mr-3 h-8 w-8 text-primary" /> Web View
          </CardTitle>
          <CardDescription>
            Embed and view external web pages directly within Anjuman Hub. Enter a URL below to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="Enter URL (e.g., https://example.com)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={inputError ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            <Button onClick={handleLoadUrl}>Load URL</Button>
          </div>
          {inputError && (
            <p className="text-sm text-destructive flex items-center">
              <AlertCircle className="mr-1 h-4 w-4" /> {inputError}
            </p>
          )}
           <Button variant="outline" size="sm" asChild className="mt-2">
              <a href={iframeSrc} target="_blank" rel="noopener noreferrer">
                Open in new tab <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
        </CardContent>
      </Card>

      {iframeSrc ? (
        <Card className="shadow-lg">
          <CardContent className="p-0">
            <iframe
              src={iframeSrc}
              title="Embedded Web View"
              className="h-[60vh] min-h-[500px] w-full rounded-b-lg border-0"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms" // Consider security implications
              onError={() => {
                setInputError(`Could not load content from ${iframeSrc}. The site might not allow embedding.`);
                setIframeSrc(""); // Clear invalid src
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <Alert variant="default" className="shadow-md">
          <Globe className="h-5 w-5" />
          <AlertTitle>No URL Loaded</AlertTitle>
          <AlertDescription>
            Enter a URL above and click "Load URL" to display a web page here. Some websites may not allow embedding due to their security policies (X-Frame-Options).
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

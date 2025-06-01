
"use client";

import { useState, useEffect, useCallback } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Globe, Link as LinkIcon, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { fetchAppSettings } from "@/actions/settingsActions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function WebViewPage() {
  const [configuredUrl, setConfiguredUrl] = useState<string | null | undefined>(undefined); // undefined means loading
  const [iframeLoadAttempted, setIframeLoadAttempted] = useState(false);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const loadUrl = useCallback(async () => {
    setIsLoading(true);
    setIframeError(null);
    setIframeLoadAttempted(false);
    const settings = await fetchAppSettings();
    const urlToLoad = settings?.webViewUrl || null;
    setConfiguredUrl(urlToLoad);
    if (urlToLoad) {
      setIframeLoadAttempted(true); // Mark that we will attempt to load this URL
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    document.title = `Web View | ${siteConfig.name}`;
    loadUrl();
  }, [loadUrl]);

  const handleIframeError = () => {
    setIframeError(
      `Could not load content from ${configuredUrl}. This often happens if the website owner has restricted embedding (e.g., via X-Frame-Options or Content-Security-Policy). Please check your browser's developer console for more specific error messages from the target website.`
    );
  };

  const pageContainerClasses = cn(
    "animate-fadeIn h-full",
    (iframeError || (!configuredUrl && !isLoading && !iframeLoadAttempted)) 
      ? "flex flex-col items-center justify-center p-4"
      : "flex flex-col -mx-4 md:-mx-6 lg:-mx-8" 
  );

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={pageContainerClasses}>
      {iframeError ? (
        <Alert variant="destructive" className="shadow-md w-full max-w-lg">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Error Loading Page</AlertTitle>
          <AlertDescription>{iframeError}</AlertDescription>
        </Alert>
      ) : configuredUrl ? (
        <div className="flex-grow w-full relative">
          <iframe
            key={configuredUrl} 
            src={configuredUrl}
            title="Embedded Web View"
            className="absolute top-0 left-0 h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-presentation"
            onError={handleIframeError}
            onLoad={() => {
              // If onLoad fires, it implies the iframe document itself loaded,
              // though the content might still be an error page from the target site
              // or a blank page if embedding was blocked silently.
              // We clear any previous network-related error but keep UI as is
              // if a content-block error was already set by onError.
              if (!iframeError?.includes("restricted embedding")) {
                  setIframeError(null);
              }
            }}
          />
        </div>
      ) : (
        <Card className="shadow-lg w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center text-xl">
              <Globe className="mr-2 h-6 w-6 text-primary" /> Web View Not Configured
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              The URL for the web view has not been set up yet.
            </p>
            {user?.isAdmin && (
              <Button asChild>
                <Link href="/settings">
                  <LinkIcon className="mr-2 h-4 w-4" /> Configure Web View URL
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

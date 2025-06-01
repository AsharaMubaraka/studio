
"use client";

import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Globe, Link as LinkIcon, Loader2, AlertCircle } from "lucide-react";
import { siteConfig } from "@/config/site";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useAppSettings } from "@/hooks/useAppSettings"; // Changed

export default function WebViewPage() {
  const { settings: appSettings, isLoading: isLoadingSettings } = useAppSettings();
  const [configuredUrl, setConfiguredUrl] = useState<string | null | undefined>(undefined);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    document.title = `Web View | ${siteConfig.name}`;
  }, []);

  useEffect(() => {
    if (!isLoadingSettings) {
        const urlToLoad = appSettings?.webViewUrl || null;
        setConfiguredUrl(urlToLoad);
        if (urlToLoad) setIframeError(null); // Reset error if new URL is loaded
    }
  }, [appSettings, isLoadingSettings]);


  const handleIframeError = (event: React.SyntheticEvent<HTMLIFrameElement, Event>) => {
    console.error("Iframe native onError event triggered:", event);
    setIframeError(
      `The browser encountered an error trying to load content from ${configuredUrl}. This could be due to network issues, the website might be down, or it might be blocking embedding (e.g., via X-Frame-Options header). Please check the URL and try again, or ensure the target site permits embedding.`
    );
  };
  
  // Derived loading state for the page content
  const pageIsLoading = isLoadingSettings || configuredUrl === undefined;

  return (
    <div
      id="page-container"
      className="h-full w-full flex flex-col bg-transparent"
    >
      {pageIsLoading && (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      )}

      {!pageIsLoading && iframeError && configuredUrl && ( // Show error only if a URL was attempted
        <div className="flex flex-1 items-center justify-center p-4">
          <Alert variant="destructive" className="shadow-md w-full max-w-lg">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Error Loading Page</AlertTitle>
            <AlertDescription>{iframeError}</AlertDescription>
          </Alert>
        </div>
      )}

      {!pageIsLoading && !configuredUrl && !iframeError && ( // No URL configured, and no previous error
         <div className="flex flex-1 items-center justify-center p-4">
          <Card className="shadow-lg w-full max-w-lg text-center">
            <CardHeader>
              <CardTitle className="flex items-center justify-center text-xl">
                <Globe className="mr-2 h-6 w-6 text-primary" /> Web View Not Configured
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                The URL for the web view has not been set up.
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
        </div>
      )}
      
      {!pageIsLoading && configuredUrl && !iframeError && (
        <div id="iframe-wrapper" className="flex-1 h-full w-full">
          <iframe
            key={configuredUrl} 
            src={configuredUrl}
            title="Embedded Web View"
            className="h-full w-full border-0"
            onError={handleIframeError}
            onLoad={() => {
              if (iframeError) setIframeError(null); 
            }}
            // sandbox attribute removed for broader compatibility as per earlier steps,
            // but consider re-adding with specific permissions if security is a concern for known embeddable sites.
            // sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-presentation"
          />
        </div>
      )}
    </div>
  );
}

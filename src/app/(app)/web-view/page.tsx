
"use client";

import { useState, useEffect, useRef } from "react";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Loader2, AlertCircle, Globe, Link as LinkIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { siteConfig } from "@/config/site";

export default function WebViewPage() {
  const { settings, isLoading: isLoadingSettings, refreshAppSettings } = useAppSettings();
  const [configuredUrl, setConfiguredUrl] = useState<string | null | undefined>(undefined);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const { user } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    document.title = `Web View | ${siteConfig.name}`;
  }, []);

  useEffect(() => {
    if (!isLoadingSettings) {
      const urlToLoad = settings?.webViewUrl || null;
      setConfiguredUrl(urlToLoad);
      if (urlToLoad) {
        setIframeError(null); 
      }
    }
  }, [settings, isLoadingSettings]);

  const handleIframeLoad = () => {
    setIframeError(null); 
  };

  const handleIframeErrorEvent = (e: React.SyntheticEvent<HTMLIFrameElement, Event>) => {
    console.error("Iframe native onError event triggered:", e);
    setIframeError(
      `The browser reported an error loading content from ${configuredUrl}. This could be due to network issues, the website might be down, or it might be blocking embedding (e.g., via X-Frame-Options or CSP).`
    );
  };

  const pageIsLoading = isLoadingSettings || configuredUrl === undefined;

  return (
    <div
      id="page-container"
      className="h-full w-full flex flex-col bg-transparent"
    >
      {pageIsLoading && !configuredUrl && (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      )}

      {!pageIsLoading && iframeError && configuredUrl && (
        <div className="flex flex-1 items-center justify-center p-4">
          <Card className="shadow-md w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-center text-xl">
                <AlertCircle className="mr-2 h-6 w-6 text-destructive" /> Error Loading Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-muted-foreground">
                Could not load the page from:
                <br />
                <code className="text-sm bg-muted p-1 rounded">{configuredUrl}</code>
              </p>
              <p className="text-sm text-destructive">{iframeError}</p>
              <p className="text-xs text-muted-foreground pt-2">
                Please ensure the URL is correct and the external website allows embedding. Some websites (like Google, Facebook) explicitly block being embedded in iframes.
              </p>
              {user?.isAdmin && (
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/settings">
                    <LinkIcon className="mr-2 h-4 w-4" /> Configure Web View URL
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {!pageIsLoading && !configuredUrl && !iframeError && (
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
      
      {configuredUrl && !iframeError && (
        <div id="iframe-wrapper" className="flex-1">
          <iframe
            ref={iframeRef}
            key={configuredUrl} 
            src={configuredUrl}
            title="Embedded Web View"
            className="h-full w-full border-0"
            onLoad={handleIframeLoad}
            onError={handleIframeErrorEvent}
          />
        </div>
      )}
    </div>
  );
}

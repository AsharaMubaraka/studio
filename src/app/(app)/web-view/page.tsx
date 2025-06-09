
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
  const { user } = useAuth(); // User object from auth context
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    document.title = `Web View | ${siteConfig.name}`;
  }, []);

  useEffect(() => {
    if (!isLoadingSettings) {
      const urlToLoad = settings?.webViewUrl || null;
      setConfiguredUrl(urlToLoad);
      if (urlToLoad) {
        setIframeError(null); // Reset error if new URL is loaded
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

  const pageIsLoadingInitially = isLoadingSettings || configuredUrl === undefined;

  const showIframe = configuredUrl && !iframeError;
  const showInitialLoader = pageIsLoadingInitially && !configuredUrl; 
  const showErrorState = !pageIsLoadingInitially && iframeError && configuredUrl;
  const showNotConfiguredState = !pageIsLoadingInitially && !configuredUrl && !iframeError;


  let containerClasses = "flex-1 w-full";
  if (showIframe) {
    containerClasses += " relative"; 
  } else {
    // For loading, error, or not configured states, center their Card content
    containerClasses += " flex flex-col items-center justify-center p-4";
  }

  return (
    <div className={containerClasses}>
      {showInitialLoader && (
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      )}

      {showErrorState && (
        <Card className="shadow-md w-full max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-center text-xl">
              <AlertCircle className="mr-2 h-6 w-6 text-destructive" /> 
              {user?.isAdmin ? "Error Loading Content" : "Content Unavailable"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {user?.isAdmin ? (
              <>
                <p className="text-muted-foreground">
                  Could not load the page from:
                  <br />
                  <code className="text-sm bg-muted p-1 rounded">{configuredUrl}</code>
                </p>
                <p className="text-sm text-destructive">{iframeError}</p>
                <p className="text-xs text-muted-foreground pt-2">
                  Please ensure the URL is correct and the external website allows embedding. Some websites (like Google, Facebook) explicitly block being embedded in iframes.
                </p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/settings">
                    <LinkIcon className="mr-2 h-4 w-4" /> Configure Web View URL
                  </Link>
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground text-center">
                The requested content could not be loaded or is currently unavailable. Please try again later.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {showNotConfiguredState && (
        <Card className="shadow-lg w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center text-xl">
              <Globe className="mr-2 h-6 w-6 text-primary" /> 
              {user?.isAdmin ? "Web View Not Configured" : "Web View"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user?.isAdmin ? (
              <>
                <p className="text-muted-foreground">
                  The URL for the web view has not been set up.
                </p>
                <Button asChild>
                  <Link href="/settings">
                    <LinkIcon className="mr-2 h-4 w-4" /> Configure Web View URL
                  </Link>
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">
                This section is not currently available.
              </p>
            )}
          </CardContent>
        </Card>
      )}
      
      {showIframe && (
        <iframe
          ref={iframeRef}
          key={configuredUrl} // Re-mount iframe if URL changes
          src={configuredUrl} // Use the state variable
          title="Embedded Web View"
          className="absolute inset-0 w-full h-full border-0" // Fills parent
          onLoad={handleIframeLoad}
          onError={handleIframeErrorEvent} // Handle iframe's specific error event
        />
      )}
    </div>
  );
}

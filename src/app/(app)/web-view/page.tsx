
"use client";

import { useState, useEffect, useCallback } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Globe, Link as LinkIcon, Loader2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { fetchAppSettings } from "@/actions/settingsActions";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function WebViewPage() {
  const [configuredUrl, setConfiguredUrl] = useState<string | null | undefined>(undefined); // undefined means initial loading state
  const [iframeError, setIframeError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const loadUrl = useCallback(async () => {
    setIsLoading(true);
    setIframeError(null);
    setConfiguredUrl(undefined); // Reset before fetching
    try {
      const settings = await fetchAppSettings();
      const urlToLoad = settings?.webViewUrl || null;
      setConfiguredUrl(urlToLoad);
    } catch (error: any) {
      console.error("Error fetching app settings for web-view:", error);
      setIframeError(`Failed to load app settings: ${error.message}`);
      setConfiguredUrl(null); // Ensure it's null on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = `Web View | ${siteConfig.name}`;
    loadUrl();
  }, [loadUrl]);

  const handleIframeError = (event: React.SyntheticEvent<HTMLIFrameElement, Event>) => {
    console.error("Iframe native onError event triggered:", event);
    setIframeError(
      `The browser encountered an error trying to load the content from ${configuredUrl}. This could be a network issue, or the website might be down or blocking requests. Please check the URL and try again.`
    );
  };

  const pageContainerClasses = cn(
    "animate-fadeIn h-full",
    (iframeError || (configuredUrl === null && !isLoading)) // Show centered message if error or configuredUrl is explicitly null (not undefined)
      ? "flex flex-col items-center justify-center p-4"
      : "flex flex-col -mx-4 md:-mx-6 lg:-mx-8"
  );

  // Diagnostic Info Display
  const DiagnosticInfo = () => (
    <Card className="fixed bottom-4 right-4 bg-background/80 backdrop-blur-sm p-3 text-xs shadow-xl z-50 max-w-sm w-full border border-destructive">
      <CardHeader className="p-2 pb-1">
        <CardTitle className="text-sm font-semibold text-destructive flex items-center"><Info className="mr-2 h-4 w-4"/>Diagnostic Info</CardTitle>
      </CardHeader>
      <CardContent className="p-2 text-xs space-y-1">
        <p><strong>Is Loading:</strong> {isLoading ? "Yes" : "No"}</p>
        <p><strong>Configured URL:</strong> {configuredUrl === undefined ? "Fetching..." : (configuredUrl === null ? "Not Set / Failed to Fetch" : configuredUrl)}</p>
        <p><strong>Iframe Error:</strong> {iframeError || "None"}</p>
      </CardContent>
    </Card>
  );

  return (
    <>
      <DiagnosticInfo />
      <div className={pageContainerClasses}>
        {isLoading && configuredUrl === undefined ? ( // Initial loading state
          <div className="flex flex-1 items-center justify-center p-4">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
        ) : iframeError ? (
          <Alert variant="destructive" className="shadow-md w-full max-w-lg">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Error Loading Page</AlertTitle>
            <AlertDescription>{iframeError}</AlertDescription>
          </Alert>
        ) : configuredUrl && configuredUrl.trim() !== "" ? ( // URL is configured and not just whitespace
          <div className="flex-grow w-full relative">
            <iframe
              key={configuredUrl} // Re-mounts iframe if URL changes
              src={configuredUrl}
              title="Embedded Web View"
              className="absolute top-0 left-0 h-full w-full border-0"
              onError={handleIframeError}
              onLoad={() => {
                // Consider if clearing error here is always correct.
                // If the loaded page is an error page from the server, onLoad still fires.
                // For now, let's keep it to clear network-level errors caught by `onError`.
                // setIframeError(null); // Potentially problematic, let's keep error if it was set by onError
              }}
              // sandbox attribute removed for diagnostics
            />
          </div>
        ) : ( // No URL configured or an error occurred fetching settings
          <Card className="shadow-lg w-full max-w-lg text-center">
            <CardHeader>
              <CardTitle className="flex items-center justify-center text-xl">
                <Globe className="mr-2 h-6 w-6 text-primary" /> Web View Not Configured
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                The URL for the web view has not been set up, or there was an issue loading the settings.
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
    </>
  );
}

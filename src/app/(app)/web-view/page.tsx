
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
  const [configuredUrl, setConfiguredUrl] = useState<string | null | undefined>(undefined);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const loadUrl = useCallback(async () => {
    setIsLoading(true);
    setIframeError(null);
    setConfiguredUrl(undefined);
    try {
      const settings = await fetchAppSettings();
      const urlToLoad = settings?.webViewUrl || null;
      setConfiguredUrl(urlToLoad);
    } catch (error: any) {
      console.error("Error fetching app settings for web-view:", error);
      setIframeError(`Failed to load app settings: ${error.message}`);
      setConfiguredUrl(null);
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
    "animate-fadeIn",
    (iframeError || (configuredUrl === null && !isLoading))
      ? "flex flex-col items-center justify-center p-4 h-full bg-yellow-300" // For error/not-configured state
      : "flex flex-col h-full w-full bg-blue-400" // For iframe display state - BLUE background
  );

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
        {isLoading && configuredUrl === undefined ? (
          <div className="flex flex-1 items-center justify-center p-4">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
        ) : iframeError ? (
          <Alert variant="destructive" className="shadow-md w-full max-w-lg m-auto">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Error Loading Page</AlertTitle>
            <AlertDescription>{iframeError}</AlertDescription>
          </Alert>
        ) : configuredUrl && configuredUrl.trim() !== "" ? (
          <div className="h-full w-full relative bg-red-500"> {/* IFRAME WRAPPER - RED background */}
            <iframe
              key={configuredUrl} 
              src={configuredUrl}
              title="Embedded Web View"
              className="absolute top-0 left-0 h-full w-full border-8 border-green-500" // IFRAME - GREEN border
              onError={handleIframeError}
              onLoad={() => {
                // console.log("Iframe onLoad triggered for:", configuredUrl);
              }}
            />
          </div>
        ) : (
          <Card className="shadow-lg w-full max-w-lg text-center m-auto">
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

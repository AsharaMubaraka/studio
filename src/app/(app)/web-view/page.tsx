
"use client";

import { useState, useEffect, useCallback } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Globe, Link as LinkIcon, Loader2, AlertCircle, Info } from "lucide-react";
import { siteConfig } from "@/config/site";
import { fetchAppSettings } from "@/actions/settingsActions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
    } catch (error: any) { // Fixed: Added curly braces for the catch block
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
      `The browser encountered an error trying to load the content from ${configuredUrl}. This could be due to network issues, the website might be down, or it might be blocking embedding (e.g., via X-Frame-Options header). Please check the URL and try again, or ensure the target site permits embedding.`
    );
  };

  const DiagnosticInfo = () => (
    <Card className="fixed bottom-4 right-4 bg-background/80 backdrop-blur-sm p-3 text-xs shadow-xl z-50 max-w-sm w-full border border-input">
      <CardHeader className="p-2 pb-1">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center"><Info className="mr-2 h-4 w-4"/>Diagnostic Info</CardTitle>
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
      <div
        id="page-container"
        className="h-full w-full flex flex-col flex-1"
      >
        {isLoading && configuredUrl === undefined && (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && iframeError && (
          <div className="flex flex-1 items-center justify-center p-4">
            <Alert variant="destructive" className="shadow-md w-full max-w-lg">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle>Error Loading Page</AlertTitle>
              <AlertDescription>{iframeError}</AlertDescription>
            </Alert>
          </div>
        )}

        {!isLoading && !iframeError && !configuredUrl && (
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
        
        {!isLoading && configuredUrl && !iframeError && (
          <div id="iframe-wrapper" className="flex-1">
            <iframe
              key={configuredUrl} 
              src={configuredUrl}
              title="Embedded Web View"
              className="h-full w-full border-0"
              onError={handleIframeError}
              onLoad={() => {
                console.log("Iframe onLoad triggered for:", configuredUrl);
                if(iframeError) setIframeError(null);
              }}
            />
          </div>
        )}
      </div>
      <DiagnosticInfo />
    </>
  );
}


"use client";

import { useState, useEffect, useCallback } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Globe, Link as LinkIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { fetchAppSettings } from "@/actions/settingsActions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function WebViewPage() {
  const [configuredUrl, setConfiguredUrl] = useState<string | null | undefined>(undefined); // undefined means loading
  const [iframeError, setIframeError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const loadUrl = useCallback(async () => {
    setIsLoading(true);
    setIframeError(null);
    const settings = await fetchAppSettings();
    setConfiguredUrl(settings?.webViewUrl || null); // null if empty or not set
    setIsLoading(false);
  }, []);

  useEffect(() => {
    document.title = `Web View | ${siteConfig.name}`;
    loadUrl();
  }, [loadUrl]);

  const pageContainerClasses = cn(
    "animate-fadeIn h-full",
    (iframeError || (!configuredUrl && !isLoading)) // Centered content if error or no URL configured
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
          <Globe className="h-5 w-5" />
          <AlertTitle>Error Loading Page</AlertTitle>
          <AlertDescription>{iframeError}</AlertDescription>
        </Alert>
      ) : configuredUrl ? (
        <div className="flex-grow w-full relative">
          <iframe
            key={configuredUrl} // Important to re-render iframe if URL changes
            src={configuredUrl}
            title="Embedded Web View"
            className="absolute top-0 left-0 h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals" // Added allow-modals
            onError={() => {
              setIframeError(`Could not load content from ${configuredUrl}. The site might block embedding or there's a network issue.`);
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

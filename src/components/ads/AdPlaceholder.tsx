
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { useEffect } from "react";

declare global {
  interface Window {
    adsbygoogle: unknown[] | undefined;
  }
}

export function AdPlaceholder() {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error("AdSense push error:", e);
    }
  }, []);

  return (
    <Card className="shadow-lg animate-fadeIn border-dashed border-primary/50 my-6">
      <CardHeader className="py-3 px-4">
        <CardTitle className="flex items-center text-sm font-normal text-muted-foreground">
          <DollarSign className="mr-2 h-4 w-4 text-primary/70" />
          Advertisement
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 text-center text-sm text-muted-foreground min-h-[50px] flex items-center justify-center">
        {/* AdSense Ad Unit */}
        {/* The global AdSense script (adsbygoogle.js) is loaded in RootLayout (src/app/layout.tsx) */}
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client="ca-pub-4478399347291835"
          data-ad-slot="9883117110"
          data-ad-format="auto"
          data-full-width-responsive="true"
        ></ins>
        {/* End AdSense Ad Unit */}
      </CardContent>
    </Card>
  );
}

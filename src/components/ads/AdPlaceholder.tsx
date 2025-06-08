
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

export function AdPlaceholder() {
  return (
    <Card className="shadow-lg animate-fadeIn border-dashed border-primary/50">
      <CardHeader>
        <CardTitle className="flex items-center text-lg text-muted-foreground">
          <DollarSign className="mr-2 h-5 w-5 text-primary/70" />
          Advertisement Placeholder
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center text-sm text-muted-foreground">
        <p>Your ad content would appear here.</p>
        <p className="mt-2 text-xs">
          Integrate with your chosen ad provider (e.g., Google AdSense)
          by replacing this component with their ad code.
        </p>
      </CardContent>
    </Card>
  );
}

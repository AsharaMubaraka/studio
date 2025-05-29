
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { useEffect } from "react";

export default function UserListPage() {
  useEffect(() => {
    document.title = "User List | Anjuman Hub";
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight flex items-center">
            <Users className="mr-3 h-8 w-8 text-primary" /> User List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This is the User List page. Functionality to display and manage users will be implemented here.
          </p>
          {/* Placeholder for user list table or items */}
        </CardContent>
      </Card>
    </div>
  );
}

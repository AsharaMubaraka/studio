
"use client";

import { useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Phone as PhoneIcon, ChevronRight } from "lucide-react";

interface ContactInfo {
  id: string;
  number: string;
  iconColorClass?: string;
}

const jamaatContacts: ContactInfo[] = [
  { id: "1", number: "+965 22209853", iconColorClass: "text-primary" },
  // Add more contacts here if needed, e.g.:
  // { id: "2", number: "+965 12345678", iconColorClass: "text-primary" },
];

export default function ContactPage() {
  useEffect(() => {
    document.title = "Contact | Anjuman Hub";
  }, []);

  return (
    <div className="flex flex-col h-full animate-fadeIn bg-background">
      {/* Page-specific Header Bar */}
      <div className="bg-primary text-primary-foreground p-4 shadow-md sticky top-0 z-30 md:relative">
        <h1 className="text-xl font-semibold text-center">Contact</h1>
      </div>

      <div className="flex-grow p-4 space-y-6 overflow-y-auto">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 px-1">Jamaat Contact Numbers</h2>
          <div className="space-y-3">
            {jamaatContacts.map((contact) => (
              <Card key={contact.id} className="shadow-md hover:shadow-lg transition-shadow bg-card text-card-foreground">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <PhoneIcon className={`h-5 w-5 ${contact.iconColorClass || 'text-muted-foreground'}`} />
                    <span className="text-card-foreground">{contact.number}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground opacity-70" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Example of another contact section */}
        {/* <div className="mt-8">
          <h2 className="text-lg font-semibold text-foreground mb-3 px-1">Department Contacts</h2>
          <div className="space-y-3">
            <Card className="shadow-md hover:shadow-lg transition-shadow bg-card text-card-foreground">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="text-card-foreground">Admin Office: +965 99887766</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground opacity-70" />
              </CardContent>
            </Card>
          </div>
        </div> */}

      </div>
    </div>
  );
}

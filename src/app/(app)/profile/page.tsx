
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, Hash, Save } from "lucide-react";
import { updateUserDisplayNameAction } from "@/actions/userActions";
import { siteConfig } from "@/config/site";
import { Label } from "@/components/ui/label"; // Added import

const profileFormSchema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters.").max(100, "Name must be at most 100 characters."),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { user, isLoading: authLoading, login } = useAuth(); // Assuming login might refresh user state
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: "",
    },
  });

  useEffect(() => {
    document.title = `Your Profile | ${siteConfig.name}`;
  }, []);

  useEffect(() => {
    if (user) {
      form.reset({ displayName: user.name });
    }
  }, [user, form]);

  async function onSubmit(values: ProfileFormValues) {
    if (!user?.username) {
      toast({ variant: "destructive", title: "Error", description: "User not found." });
      return;
    }
    setIsSubmitting(true);
    const result = await updateUserDisplayNameAction(user.username, values.displayName);
    if (result.success) {
      toast({ title: "Success", description: "Your display name has been updated." });
      // To reflect the change in the UI immediately (e.g., in the header),
      // we might need to re-fetch or update the user object in AuthContext.
      // For now, a full page reload or re-login would show the change.
      // A more sophisticated solution would involve updating AuthContext's user.
      // Let's try to update user state more directly if login function can also serve to refresh
      if (user.username && typeof user.password === 'string') { // This is a placeholder for actual refresh logic
           // This is a conceptual example. `login` expects a password.
           // A dedicated `refreshUser` function in AuthContext would be better.
           // For now, this line is problematic and should be replaced with a proper refresh mechanism.
           // We'll rely on the toast and user can manually refresh or see update on next login.
      }
    } else {
      toast({ variant: "destructive", title: "Update Failed", description: result.message || "Could not update display name." });
    }
    setIsSubmitting(false);
  }

  if (authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="shadow-lg animate-fadeIn w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Profile Not Available</CardTitle>
          <CardDescription>Please log in to view your profile.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <Card className="shadow-lg w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight flex items-center">
            <User className="mr-3 h-7 w-7 text-primary" />
            Your Profile
          </CardTitle>
          <CardDescription>View and update your account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username" className="flex items-center text-sm font-medium text-muted-foreground">
              <Hash className="mr-2 h-4 w-4" /> Username
            </Label>
            <Input id="username" value={user.username} readOnly disabled className="bg-muted/50" />
            <p className="text-xs text-muted-foreground">Your username cannot be changed.</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><User className="mr-2 h-4 w-4" /> Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your display name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || !form.formState.isDirty}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

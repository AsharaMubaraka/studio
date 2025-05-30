
"use client";

import { useEffect, useState, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, DocumentData } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users, AlertCircle, Loader2 } from "lucide-react";

interface User {
  id: string;
  name: string;
  username: string;
  isAdmin: boolean;
  // Add other fields if needed, e.g., email, createdAt
}

export default function UserListPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    document.title = "User List | Anjuman Hub";
    fetchUsers();
  }, []);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const usersCollectionRef = collection(db, "users");
      const querySnapshot = await getDocs(usersCollectionRef);
      const fetchedUsers: User[] = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data() as DocumentData;
        return {
          id: docSnap.id,
          name: data.name || "N/A",
          username: data.username || docSnap.id, // Fallback to ID if username field missing
          isAdmin: !!data.isAdmin, // Ensure boolean
        };
      });
      setUsers(fetchedUsers.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError("Failed to load users. Please try again.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch user list.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleAdminToggle = async (userId: string, currentIsAdmin: boolean) => {
    const originalUsers = [...users];
    setUpdatingUserId(userId);

    // Optimistic UI update
    setUsers(prevUsers =>
      prevUsers.map(user =>
        user.id === userId ? { ...user, isAdmin: !currentIsAdmin } : user
      )
    );

    try {
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, {
        isAdmin: !currentIsAdmin,
      });
      toast({
        title: "Success",
        description: `User admin status updated.`,
      });
    } catch (err: any) {
      console.error("Error updating admin status:", err);
      // Revert UI update on error
      setUsers(originalUsers);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update user admin status. Please try again.",
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-bold tracking-tight flex items-center">
              <Users className="mr-3 h-8 w-8 text-primary" /> User List
            </CardTitle>
            <CardDescription>Manage user accounts and permissions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-2 border-b">
                  <div className="space-y-1">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-6 w-12 rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="shadow-md animate-fadeIn">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight flex items-center">
            <Users className="mr-3 h-8 w-8 text-primary" /> User List
          </CardTitle>
          <CardDescription>Manage user accounts and permissions. Click the toggle to change admin status.</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No users found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username (ITS ID)</TableHead>
                  <TableHead className="text-right">Admin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end">
                        {updatingUserId === user.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Switch
                          checked={user.isAdmin}
                          onCheckedChange={() => handleAdminToggle(user.id, user.isAdmin)}
                          disabled={updatingUserId === user.id}
                          aria-label={`Toggle admin status for ${user.name}`}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

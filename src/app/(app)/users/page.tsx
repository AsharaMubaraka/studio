
"use client";

import { useEffect, useState, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, DocumentData, orderBy, query } from "firebase/firestore";
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
import { Users, AlertCircle, Loader2, ShieldOff, ShieldCheck } from "lucide-react"; // Added Shield icons

interface User {
  id: string;
  name: string;
  username: string;
  isAdmin: boolean;
  isRestricted: boolean;
  ipAddress?: string | null;
}

export default function UserListPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"admin" | "restriction" | null>(null);
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const usersCollectionRef = collection(db, "users");
      // Order by name for consistent listing
      const q = query(usersCollectionRef, orderBy("name"));
      const querySnapshot = await getDocs(q);
      const fetchedUsers: User[] = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data() as DocumentData;
        return {
          id: docSnap.id,
          name: data.name || "N/A",
          username: data.username || docSnap.id,
          isAdmin: !!data.isAdmin,
          isRestricted: !!data.isRestricted, // Default to false if not present
          ipAddress: data.ipAddress || null,
        };
      });
      setUsers(fetchedUsers);
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

  useEffect(() => {
    document.title = "User List | Anjuman Hub";
    fetchUsers();
  }, [fetchUsers]);

  const handleAdminToggle = async (userId: string, currentIsAdmin: boolean) => {
    const originalUsers = [...users];
    setUpdatingUserId(userId);
    setActionType("admin");

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
      setUsers(originalUsers);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update user admin status. Please try again.",
      });
    } finally {
      setUpdatingUserId(null);
      setActionType(null);
    }
  };

  const handleRestrictionToggle = async (userId: string, currentIsRestricted: boolean) => {
    const originalUsers = [...users];
    setUpdatingUserId(userId);
    setActionType("restriction");

    setUsers(prevUsers =>
      prevUsers.map(user =>
        user.id === userId ? { ...user, isRestricted: !currentIsRestricted } : user
      )
    );

    try {
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, {
        isRestricted: !currentIsRestricted,
      });
      toast({
        title: "Success",
        description: `User restriction status updated.`,
      });
    } catch (err: any) {
      console.error("Error updating restriction status:", err);
      setUsers(originalUsers);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update user restriction status. Please try again.",
      });
    } finally {
      setUpdatingUserId(null);
      setActionType(null);
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
                <div key={i} className="grid grid-cols-5 items-center gap-4 p-2 border-b">
                  <Skeleton className="h-5 w-8" /> {/* Sr. No. */}
                  <Skeleton className="h-5 w-32" /> {/* Name */}
                  <Skeleton className="h-5 w-24" /> {/* Username */}
                  <Skeleton className="h-5 w-20" /> {/* IP Address */}
                  <div className="flex justify-end gap-2">
                    <Skeleton className="h-6 w-12 rounded-full" /> {/* Admin Toggle */}
                    <Skeleton className="h-6 w-12 rounded-full" /> {/* Restricted Toggle */}
                  </div>
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
          <CardDescription>Manage user accounts, permissions, and login restrictions.</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No users found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Sr. No.</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead className="text-right w-[100px]">Admin</TableHead>
                  <TableHead className="text-right w-[120px]">Restricted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user, index) => (
                  <TableRow key={user.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.ipAddress || "N/A"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end">
                        {updatingUserId === user.id && actionType === "admin" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Switch
                          checked={user.isAdmin}
                          onCheckedChange={() => handleAdminToggle(user.id, user.isAdmin)}
                          disabled={updatingUserId === user.id}
                          aria-label={`Toggle admin status for ${user.name}`}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end">
                        {updatingUserId === user.id && actionType === "restriction" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                         <Switch
                          checked={user.isRestricted}
                          onCheckedChange={() => handleRestrictionToggle(user.id, user.isRestricted)}
                          disabled={updatingUserId === user.id}
                          aria-label={`Toggle restriction status for ${user.name}`}
                          className={user.isRestricted ? "data-[state=checked]:bg-destructive" : ""}
                        />
                        {user.isRestricted ? <ShieldOff className="ml-2 h-4 w-4 text-destructive" /> : <ShieldCheck className="ml-2 h-4 w-4 text-green-600" />}
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

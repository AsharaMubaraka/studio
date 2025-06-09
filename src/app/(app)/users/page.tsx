
"use client";

import { useEffect, useState, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, DocumentData, orderBy, query } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Users, AlertCircle, Loader2, ShieldOff, ShieldCheck, ChevronLeft, ChevronRight, Pencil, MapPin, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateUserDisplayNameAction, deleteUserAction } from "@/actions/userActions";
import { siteConfig } from "@/config/site";
import { useAuth } from "@/hooks/useAuth";

interface User {
  id: string;
  name: string;
  username: string;
  isAdmin: boolean;
  isRestricted: boolean;
  ipAddress?: string | null;
  city?: string | null;
  country?: string | null;
}

const ITEMS_PER_PAGE = 10;

async function fetchGeolocation(ipAddress: string): Promise<{ city: string | null; country: string | null }> {
  if (!ipAddress) return { city: null, country: null };
  try {
    // Using a timeout to prevent hanging indefinitely
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout

    const response = await fetch(`https://ipapi.co/${ipAddress}/json/`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      // Don't throw an error for individual failures, just return nulls
      console.warn(`Geolocation lookup failed for ${ipAddress}: ${response.status}`);
      return { city: null, country: null };
    }
    const data = await response.json();
    if (data.error) {
        console.warn(`Geolocation API error for ${ipAddress}: ${data.reason}`);
        return { city: null, country: null };
    }
    return { city: data.city || null, country: data.country_name || null };
  } catch (error: any) {
    if (error.name === 'AbortError') {
        console.warn(`Geolocation lookup timed out for ${ipAddress}`);
    } else {
        console.error(`Error fetching geolocation for ${ipAddress}:`, error);
    }
    return { city: null, country: null };
  }
}

export default function UserListPage() {
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"admin" | "restriction" | "name" | "delete" | null>(null);
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);

  const [isEditNameDialogOpen, setIsEditNameDialogOpen] = useState(false);
  const [editingUserForName, setEditingUserForName] = useState<User | null>(null);
  const [newName, setNewName] = useState("");
  const [isSubmittingName, setIsSubmittingName] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const usersCollectionRef = collection(db, "users");
      const q = query(usersCollectionRef, orderBy("name"));
      const querySnapshot = await getDocs(q);
      
      let fetchedUsers: User[] = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data() as DocumentData;
        return {
          id: docSnap.id,
          name: data.name || "N/A",
          username: data.username || docSnap.id,
          isAdmin: !!data.isAdmin,
          isRestricted: !!data.isRestricted,
          ipAddress: data.ipAddress || null,
        };
      });

      const usersWithIP = fetchedUsers.filter(user => user.ipAddress);
      const geolocationPromises = usersWithIP.map(user => 
        fetchGeolocation(user.ipAddress!).then(geo => ({ ...user, ...geo }))
      );
      
      const results = await Promise.allSettled(geolocationPromises);

      const usersWithGeoData: User[] = fetchedUsers.map(user => {
        if (!user.ipAddress) return user;
        const foundResult = results.find(r => r.status === 'fulfilled' && (r.value as User).id === user.id);
        if (foundResult && foundResult.status === 'fulfilled') {
          return foundResult.value as User;
        }
        return user;
      });

      setUsers(usersWithGeoData);

    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError("Failed to load users. Please try again.");
      toast({ variant: "destructive", title: "Error", description: "Could not fetch user list." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    document.title = `User List | ${siteConfig.name}`;
    fetchUsers();
  }, [fetchUsers]);

  const handleAdminToggle = async (userId: string, currentIsAdmin: boolean) => {
    setUpdatingUserId(userId); setActionType("admin");
    const originalUsers = [...users];
    setUsers(prevUsers => prevUsers.map(user => user.id === userId ? { ...user, isAdmin: !currentIsAdmin } : user));
    try {
      await updateDoc(doc(db, "users", userId), { isAdmin: !currentIsAdmin });
      toast({ title: "Success", description: `User admin status updated.` });
    } catch (err) { setUsers(originalUsers); toast({ variant: "destructive", title: "Update Failed", description: "Could not update user admin status." });
    } finally { setUpdatingUserId(null); setActionType(null); }
  };

  const handleRestrictionToggle = async (userId: string, currentIsRestricted: boolean) => {
    setUpdatingUserId(userId); setActionType("restriction");
    const originalUsers = [...users];
    setUsers(prevUsers => prevUsers.map(user => user.id === userId ? { ...user, isRestricted: !currentIsRestricted } : user));
    try {
      await updateDoc(doc(db, "users", userId), { isRestricted: !currentIsRestricted });
      toast({ title: "Success", description: `User restriction status updated.` });
    } catch (err) { setUsers(originalUsers); toast({ variant: "destructive", title: "Update Failed", description: "Could not update user restriction status." });
    } finally { setUpdatingUserId(null); setActionType(null); }
  };

  const openEditNameDialog = (user: User) => {
    setEditingUserForName(user);
    setNewName(user.name);
    setIsEditNameDialogOpen(true);
  };

  const handleSaveName = async () => {
    if (!editingUserForName || !newName.trim()) return;
    setIsSubmittingName(true);
    setUpdatingUserId(editingUserForName.id); setActionType("name");

    const result = await updateUserDisplayNameAction(editingUserForName.id, newName.trim());
    if (result.success) {
      toast({ title: "Success", description: result.message });
      setUsers(prevUsers => prevUsers.map(u => u.id === editingUserForName.id ? { ...u, name: newName.trim() } : u));
      setIsEditNameDialogOpen(false);
      setEditingUserForName(null);
    } else {
      toast({ variant: "destructive", title: "Update Failed", description: result.message || "Could not update name." });
    }
    setIsSubmittingName(false);
    setUpdatingUserId(null); setActionType(null);
  };

  const handleDeleteUser = async (userIdToDelete: string) => {
    if (userIdToDelete === authUser?.username) {
      toast({ variant: "destructive", title: "Action Forbidden", description: "You cannot delete your own account." });
      return;
    }
    setDeletingUserId(userIdToDelete); setActionType("delete");
    const result = await deleteUserAction(userIdToDelete);
    if (result.success) {
      toast({ title: "Success", description: result.message });
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userIdToDelete));
    } else {
      toast({ variant: "destructive", title: "Deletion Failed", description: result.message || "Could not delete user." });
    }
    setDeletingUserId(null); setActionType(null);
  };

  const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE);
  const paginatedUsers = users.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fadeIn"><Card className="shadow-lg"><CardHeader><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-64 mt-2" /></CardHeader><CardContent><div className="space-y-2">{[...Array(5)].map((_, i) => (<Skeleton key={i} className="h-10 w-full" />))}</div></CardContent></Card></div>
    );
  }
  if (error) {
    return <Alert variant="destructive" className="shadow-md animate-fadeIn"><AlertCircle className="h-5 w-5" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <Card className="shadow-lg">
        <CardHeader><CardTitle className="text-3xl font-bold tracking-tight flex items-center"><Users className="mr-3 h-8 w-8 text-primary" /> User List</CardTitle><CardDescription>Manage user accounts, permissions, and login restrictions. IP-based location is approximate.</CardDescription></CardHeader>
        <CardContent>
          {users.length === 0 ? (<p className="text-muted-foreground text-center py-4">No users found.</p>) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px] px-2 py-3">#</TableHead>
                      <TableHead className="px-2 py-3">Name</TableHead>
                      <TableHead className="px-2 py-3">Username</TableHead>
                      <TableHead className="px-2 py-3">IP</TableHead>
                      <TableHead className="min-w-[150px] px-2 py-3">Location (City, Country)</TableHead>
                      <TableHead className="text-center px-2 py-3">Admin</TableHead>
                      <TableHead className="text-center px-2 py-3">Restricted</TableHead>
                      <TableHead className="text-right w-[120px] px-2 py-3">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.map((user, index) => (
                      <TableRow key={user.id}>
                        <TableCell className="px-2 py-4">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                        <TableCell className="font-medium px-2 py-4">{user.name}</TableCell>
                        <TableCell className="px-2 py-4">{user.username}</TableCell>
                        <TableCell className="px-2 py-4">{user.ipAddress || "N/A"}</TableCell>
                        <TableCell className="px-2 py-4">
                          {user.ipAddress ? (
                            user.city || user.country ? (
                              <span className="flex items-center">
                                <MapPin className="mr-1.5 h-4 w-4 text-muted-foreground shrink-0" />
                                {`${user.city || "Unknown City"}, ${user.country || "Unknown Country"}`}
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic">Resolving...</span>
                            )
                          ) : (
                            "N/A"
                          )}
                        </TableCell>
                        <TableCell className="text-center px-2 py-4">
                          <div className="flex items-center justify-center">
                            {updatingUserId === user.id && actionType === "admin" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Switch checked={user.isAdmin} onCheckedChange={() => handleAdminToggle(user.id, user.isAdmin)} disabled={updatingUserId === user.id || deletingUserId === user.id} aria-label={`Toggle admin for ${user.name}`} />
                          </div>
                        </TableCell>
                        <TableCell className="text-center px-2 py-4">
                          <div className="flex items-center justify-center">
                            {updatingUserId === user.id && actionType === "restriction" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Switch checked={user.isRestricted} onCheckedChange={() => handleRestrictionToggle(user.id, user.isRestricted)} disabled={updatingUserId === user.id || deletingUserId === user.id} aria-label={`Toggle restriction for ${user.name}`} className={user.isRestricted ? "data-[state=checked]:bg-destructive" : ""} />
                            {user.isRestricted ? <ShieldOff className="ml-2 h-4 w-4 text-destructive shrink-0" /> : <ShieldCheck className="ml-2 h-4 w-4 text-green-600 shrink-0" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-2 py-4">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" onClick={() => openEditNameDialog(user)} disabled={(updatingUserId === user.id && actionType === "name") || deletingUserId === user.id} className="text-primary hover:bg-primary/10">
                              {(updatingUserId === user.id && actionType === "name") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={deletingUserId === user.id || updatingUserId === user.id || user.id === authUser?.username} className="text-destructive hover:bg-destructive/10">
                                  {(deletingUserId === user.id && actionType === "delete") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the user account for "{user.name}" ({user.username}).
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                    Yes, delete user
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-end space-x-2 py-4">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}><ChevronLeft className="mr-1 h-4 w-4" />Prev</Button>
                  <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>Next<ChevronRight className="ml-1 h-4 w-4" /></Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditNameDialogOpen} onOpenChange={setIsEditNameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Display Name</DialogTitle>
            <DialogDescription>Change the display name for {editingUserForName?.username}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newName" className="text-right col-span-1">Name</Label>
              <Input id="newName" value={newName} onChange={(e) => setNewName(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="button" onClick={handleSaveName} disabled={isSubmittingName || !newName.trim() || newName.trim() === editingUserForName?.name}>
              {isSubmittingName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


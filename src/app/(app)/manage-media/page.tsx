
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, UploadCloud, List, Trash2, Image as ImageIconLucide, Eye, Download } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { uploadImageAction, getGalleryImagesAction, deleteImageAction, type MediaItem, type MediaFormValues } from "@/actions/imageActions";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent as AdminDialogContent, DialogHeader as AdminDialogHeader, DialogTitle as AdminDialogTitle, DialogTrigger as AdminDialogTrigger, DialogClose as AdminDialogClose, DialogDescription as AdminDialogDescription, DialogFooter as AdminDialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { siteConfig } from "@/config/site";

const mediaFormSchemaClient = z.object({
  title: z.string().min(2, "Title must be at least 2 characters.").max(100),
  description: z.string().max(500).optional(),
  file: z.instanceof(File, { message: "Image file is required." })
          .refine(file => file.size <= 25 * 1024 * 1024, "Max file size is 25MB.") // Updated to 25MB
          .refine(file => file.type.startsWith("image/"), "Only image files are accepted."),
});


export default function ManageMediaPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user: adminUser, isAuthenticated } = useAuth();
  const [uploadedImages, setUploadedImages] = useState<MediaItem[]>([]);
  const [isLoadingLog, setIsLoadingLog] = useState(true);
  const [logError, setLogError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // Stores docId being deleted
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedImageForAdminView, setSelectedImageForAdminView] = useState<MediaItem | null>(null);

  const form = useForm<z.infer<typeof mediaFormSchemaClient>>({
    resolver: zodResolver(mediaFormSchemaClient),
    defaultValues: {
      title: "",
      description: "",
      file: undefined,
    },
  });

  const fetchMediaLog = useCallback(async () => {
    setIsLoadingLog(true); setLogError(null);
    try {
      const images = await getGalleryImagesAction(true); 
      setUploadedImages(images);
    } catch (error) {
      console.error("Error fetching media log:", error);
      setLogError("Failed to load media log. Please try again.");
    } finally {
      setIsLoadingLog(false);
    }
  }, []);

  useEffect(() => {
    document.title = `Manage Media | ${siteConfig.name}`;
    if (adminUser?.isAdmin) fetchMediaLog();
  }, [adminUser, fetchMediaLog]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue("file", file, { shouldValidate: true });
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      form.setValue("file", undefined);
      setPreviewUrl(null);
    }
  };

  async function onSubmit(values: z.infer<typeof mediaFormSchemaClient>) {
    if (!adminUser?.username || !adminUser?.isAdmin) {
      toast({ variant: "destructive", title: "Unauthorized", description: "You are not authorized." });
      return;
    }
    if (!values.file) {
      form.setError("file", { type: "manual", message: "Image file is required." });
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("title", values.title);
    if (values.description) formData.append("description", values.description);
    formData.append("file", values.file);

    try {
      const result = await uploadImageAction(formData, { id: adminUser.username, name: adminUser.name });
      if (result.success) {
        toast({ title: "Success", description: result.message });
        form.reset();
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = ""; // Clear file input
        fetchMediaLog();
      } else {
        toast({ variant: "destructive", title: "Upload Failed", description: result.message || "Could not upload image." });
        if (result.errors) {
            (Object.keys(result.errors) as Array<keyof MediaFormValues>).forEach((key) => {
                 const fieldErrors = result.errors![key];
                 if (fieldErrors && fieldErrors.length > 0) {
                    form.setError(key, { type: 'server', message: fieldErrors.join(', ') });
                 }
            });
        }
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "An unexpected error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteImage(publicId: string, docId: string) {
    setIsDeleting(docId);
    try {
      const result = await deleteImageAction(publicId, docId);
      if (result.success) {
        toast({ title: "Success", description: result.message });
        setUploadedImages(prev => prev.filter(img => img.id !== docId));
      } else {
        toast({ variant: "destructive", title: "Deletion Failed", description: result.message });
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      toast({ variant: "destructive", title: "Deletion Error", description: "An unexpected error occurred." });
    } finally {
      setIsDeleting(null);
    }
  }

  if (!isAuthenticated || !adminUser?.isAdmin) {
    return (<div className="flex flex-1 items-center justify-center p-4"><Card className="shadow-lg p-8 animate-fadeIn w-full max-w-md"><CardHeader><CardTitle>Access Denied</CardTitle><CardDescription>You do not have permission to view this page.</CardDescription></CardHeader></Card></div>);
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <Card className="shadow-lg w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight flex items-center">
            <UploadCloud className="mr-3 h-8 w-8 text-primary" />
            Upload New Image
          </CardTitle>
          <CardDescription>
            Add new images to the public gallery. Max file size: 25MB.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Image Title</FormLabel><FormControl><Input placeholder="Enter a title for the image" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea placeholder="Briefly describe the image..." {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField
                control={form.control}
                name="file"
                render={({ field }) => ( 
                  <FormItem>
                    <FormLabel>Image File</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {previewUrl && (
                <div className="mt-4">
                  <FormLabel className="text-sm">Image Preview:</FormLabel>
                  <div className="mt-2 border rounded-md p-2 flex justify-center items-center max-h-60 overflow-hidden">
                    <Image src={previewUrl} alt="Preview" width={200} height={200} className="max-w-full max-h-52 object-contain rounded-md" />
                  </div>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                {isSubmitting ? "Uploading..." : "Upload Image"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="shadow-lg w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight flex items-center">
            <List className="mr-3 h-7 w-7 text-primary" />
            Uploaded Media Gallery
          </CardTitle>
          <CardDescription>Manage images uploaded to the gallery.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingLog ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-square w-full rounded-md" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              ))}
            </div>
          ) : logError ? (
            <div className="p-4 border rounded-md bg-destructive/10 text-destructive">
              <h4 className="font-semibold mb-1">Error</h4>
              <p className="text-sm">{logError}</p>
            </div>
          ) : uploadedImages.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No images uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {uploadedImages.map((image) => (
                <Card key={image.id} className="overflow-hidden shadow-md flex flex-col">
                  <div className="aspect-square w-full relative bg-muted">
                    <Image src={image.imageUrl} alt={image.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"/>
                  </div>
                  <CardContent className="p-3 space-y-1 flex-grow">
                    <h3 className="font-semibold text-sm truncate" title={image.title}>{image.title}</h3>
                    <p className="text-xs text-muted-foreground truncate" title={image.description || ""}>{image.description || "No description"}</p>
                    <p className="text-xs text-muted-foreground">Uploaded: {format(image.createdAt, "dd MMM yyyy")}</p>
                    <p className="text-xs text-muted-foreground flex items-center"><Download className="mr-1 h-3 w-3"/>Downloads: {image.downloadCount || 0}</p>
                  </CardContent>
                  <CardFooter className="p-2 border-t flex gap-1">
                    <AdminDialog onOpenChange={(open) => !open && setSelectedImageForAdminView(null)}>
                      <AdminDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedImageForAdminView(image)}>
                          <Eye className="mr-1.5 h-3.5 w-3.5"/>View
                        </Button>
                      </AdminDialogTrigger>
                    </AdminDialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="flex-1" disabled={isDeleting === image.id}>
                          {isDeleting === image.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the image "{image.title}" from Cloudinary and the database. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteImage(image.publicId, image.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                            Yes, delete image
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {selectedImageForAdminView && (
        <AdminDialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <AdminDialogHeader className="p-4 border-b">
                <AdminDialogTitle>Image Preview: {selectedImageForAdminView.title}</AdminDialogTitle>
                {selectedImageForAdminView.description && <AdminDialogDescription>{selectedImageForAdminView.description}</AdminDialogDescription>}
            </AdminDialogHeader>
            <div className="p-4 relative max-h-[70vh] overflow-y-auto flex justify-center items-center bg-black/5">
                <div className="relative inline-block">
                    <Image
                        src={selectedImageForAdminView.imageUrl}
                        alt={selectedImageForAdminView.title}
                        width={1200}
                        height={800}
                        className="max-w-full max-h-[65vh] object-contain rounded"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span 
                            className="text-6xl md:text-8xl font-bold text-white/20 transform -rotate-12 select-none"
                            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)'}}
                        >
                            deeniakhbar
                        </span>
                    </div>
                </div>
            </div>
            <AdminDialogFooter className="p-4 border-t">
                <AdminDialogClose asChild><Button variant="outline">Close</Button></AdminDialogClose>
            </AdminDialogFooter>
        </AdminDialogContent>
      )}

    </div>
  );
}

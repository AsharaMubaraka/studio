
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import { Loader2, UploadCloud, ListOrdered, Trash2, ImageIcon, Image as ImageIconLucide, CalendarDays, DownloadCloud as DownloadIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { 
  uploadImageAndSaveMetadataAction, 
  fetchAdminImageInfosAction, 
  deleteImageAction, 
  type AdminImageInfo 
} from "@/actions/imageActions";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Image from "next/image";
import { format } from "date-fns";
import { siteConfig } from "@/config/site";

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const uploadFormSchema = z.object({
  name: z.string().min(3, "Image name must be at least 3 characters.").max(100),
  description: z.string().max(500, "Description can be up to 500 characters.").optional(),
  imageFile: z
    .custom<FileList>((val) => val instanceof FileList && val.length > 0, "Image file is required.")
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE_BYTES, `Max file size is ${MAX_FILE_SIZE_MB}MB.`)
    .refine(
      (files) => ALLOWED_IMAGE_TYPES.includes(files?.[0]?.type),
      `Only .jpg, .jpeg, .png, .gif, and .webp formats are supported.`
    ),
});

type UploadFormValues = z.infer<typeof uploadFormSchema>;

export default function ManageMediaPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user: adminUser, isAuthenticated } = useAuth();
  
  const [uploadedImages, setUploadedImages] = useState<AdminImageInfo[]>([]);
  const [isLoadingLog, setIsLoadingLog] = useState(true);
  const [logError, setLogError] = useState<string | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      name: "",
      description: "",
      imageFile: undefined,
    },
  });

  const fetchUploadedImages = useCallback(async () => {
    setIsLoadingLog(true); setLogError(null);
    try {
      const images = await fetchAdminImageInfosAction();
      setUploadedImages(images);
    } catch (error) {
      console.error("Error fetching uploaded images:", error);
      setLogError("Failed to load image log. Please try again.");
    } finally {
      setIsLoadingLog(false);
    }
  }, []);

  useEffect(() => {
    document.title = `Manage Media | ${siteConfig.name}`;
    if (adminUser?.isAdmin) fetchUploadedImages();
  }, [adminUser, fetchUploadedImages]);

  async function onSubmit(values: UploadFormValues) {
    if (!adminUser?.username || !adminUser?.isAdmin) {
        toast({ variant: "destructive", title: "Unauthorized", description: "You are not authorized." });
        return;
    }
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("name", values.name);
    if (values.description) formData.append("description", values.description);
    if (values.imageFile && values.imageFile.length > 0) {
        formData.append("imageFile", values.imageFile[0]);
    }

    try {
      const result = await uploadImageAndSaveMetadataAction(formData, { id: adminUser.username, name: adminUser.name });
      if (result.success) {
          toast({ title: "Success", description: result.message });
          form.reset();
          fetchUploadedImages(); // Refresh the list
      } else {
          toast({ variant: "destructive", title: "Upload Error", description: result.message });
          if (result.error?.imageFile) {
            form.setError("imageFile", { message: result.error.imageFile.join(', ') });
          }
      }
    } catch (error: any) {
      console.error("Error in onSubmit:", error);
      toast({ variant: "destructive", title: "Submission Error", description: error.message || "An unexpected error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteImage(image: AdminImageInfo) {
    setDeletingImageId(image.id);
    try {
      const result = await deleteImageAction(image.id, image.storagePath);
      if (result.success) {
        toast({ title: "Success", description: result.message });
        setUploadedImages(prev => prev.filter(img => img.id !== image.id));
      } else {
        toast({ variant: "destructive", title: "Error", description: result.message });
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      toast({ variant: "destructive", title: "Deletion Error", description: "An unexpected error occurred." });
    } finally {
      setDeletingImageId(null);
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
            Upload New Media
          </CardTitle>
          <CardDescription>
            Upload images to the media gallery. Ensure Firebase Storage and Admin SDK are configured.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Image Name / Title</FormLabel><FormControl><Input placeholder="e.g., Event Highlights" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea placeholder="Brief description of the image..." {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField
                control={form.control}
                name="imageFile"
                render={({ field: { onChange, value, ...restField } }) => (
                  <FormItem>
                    <FormLabel>Image File</FormLabel>
                    <FormControl>
                      <Input 
                        type="file" 
                        accept={ALLOWED_IMAGE_TYPES.join(',')}
                        onChange={(e) => onChange(e.target.files)} 
                        {...restField} 
                      />
                    </FormControl>
                    <FormDescription>Max file size: {MAX_FILE_SIZE_MB}MB. Allowed types: JPG, PNG, GIF, WEBP.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />} {isSubmitting ? "Uploading..." : "Upload Image"}</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="shadow-lg w-full max-w-4xl mx-auto">
        <CardHeader>
            <CardTitle className="text-xl font-semibold tracking-tight flex items-center">
                <ListOrdered className="mr-3 h-7 w-7 text-primary" /> Uploaded Media
            </CardTitle>
            <CardDescription>List of all uploaded media files. Newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingLog ? (<div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>)
           : logError ? (<div className="p-4 border rounded-md bg-destructive/10 text-destructive"><h4 className="font-semibold mb-1">Error</h4><p className="text-sm">{logError}</p></div>)
           : uploadedImages.length === 0 ? (<p className="text-muted-foreground text-center py-4">No media uploaded yet.</p>)
           : (<div className="space-y-4">
              {uploadedImages.map((image) => (
                <div key={image.id} className="p-3 border rounded-lg shadow-sm bg-card flex flex-col sm:flex-row items-start gap-4">
                  <div className="relative w-full sm:w-32 h-32 sm:h-20 aspect-video sm:aspect-square rounded-md overflow-hidden border shrink-0 bg-muted">
                    <Image src={image.imageUrl} alt={image.name} fill className="object-cover" data-ai-hint="thumbnail gallery item" />
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-semibold text-md">{image.name}</h3>
                    {image.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{image.description}</p>}
                    <div className="text-xs text-muted-foreground mt-1 space-x-3">
                        <span className="inline-flex items-center"><CalendarDays className="mr-1 h-3 w-3" />{format(new Date(image.uploadedAt), "MMM d, yyyy")}</span>
                        <span className="inline-flex items-center"><DownloadIcon className="mr-1 h-3 w-3" />{image.downloadCount} downloads</span>
                        <span className="inline-flex items-center"><ImageIconLucide className="mr-1 h-3 w-3" />{image.originalFileName}</span>
                    </div>
                  </div>
                  <div className="shrink-0 mt-2 sm:mt-0">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive hover:border-destructive hover:bg-destructive/10 border-destructive/50" disabled={deletingImageId === image.id}>
                          {deletingImageId === image.id ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the image "{image.name}" from storage and the gallery. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteImage(image)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Yes, delete image</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

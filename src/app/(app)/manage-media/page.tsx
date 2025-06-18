
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
import { Loader2, UploadCloud, List, Trash2, Image as ImageIconLucide, Eye, Download, Save } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { uploadImageAction, getGalleryImagesAction, deleteImageAction, updateImageMetadataAction, type MediaItem, type MediaFormValues as AppUploadMediaFormValues } from "@/actions/imageActions";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription, DialogFooter as AdminDialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { siteConfig } from "@/config/site";

// Schema for client-side form validation for new uploads
const appUploadFormSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters.").max(100),
  description: z.string().max(500).optional(),
  file: z.instanceof(File, { message: "Image file is required." })
          .refine(file => file.size <= 25 * 1024 * 1024, "Max file size is 25MB.")
          .refine(file => file.type.startsWith("image/"), "Only image files are accepted."),
});

// Schema for editing existing metadata (simpler, no file)
const metadataEditSchema = z.object({
  title: z.string().min(1, "Title cannot be empty.").max(100),
  description: z.string().max(500).optional(),
});
type MetadataEditFormValues = z.infer<typeof metadataEditSchema>;


export default function ManageMediaPage() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const { user: adminUser, isAuthenticated } = useAuth();
  const [galleryImages, setGalleryImages] = useState<MediaItem[]>([]);
  const [isLoadingGallery, setIsLoadingGallery] = useState(true);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  
  const [editingImage, setEditingImage] = useState<MediaItem | null>(null);
  const [isSubmittingMetadata, setIsSubmittingMetadata] = useState(false);

  const uploadForm = useForm<z.infer<typeof appUploadFormSchema>>({
    resolver: zodResolver(appUploadFormSchema),
    defaultValues: { title: "", description: "", file: undefined },
  });

  const metadataForm = useForm<MetadataEditFormValues>({
    resolver: zodResolver(metadataEditSchema),
    defaultValues: { title: "", description: "" },
  });

  const fetchGallery = useCallback(async () => {
    setIsLoadingGallery(true); setGalleryError(null);
    try {
      const images = await getGalleryImagesAction(true); 
      setGalleryImages(images);
    } catch (error) {
      console.error("Error fetching media gallery:", error);
      setGalleryError("Failed to load media gallery. Please try again.");
    } finally {
      setIsLoadingGallery(false);
    }
  }, []);

  useEffect(() => {
    document.title = `Manage Media | ${siteConfig.name}`;
    if (adminUser?.isAdmin) fetchGallery();
  }, [adminUser, fetchGallery]);

  const handleFileUploadChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadForm.setValue("file", file, { shouldValidate: true });
      const reader = new FileReader();
      reader.onloadend = () => { setUploadPreviewUrl(reader.result as string); };
      reader.readAsDataURL(file);
    } else {
      uploadForm.setValue("file", undefined, { shouldValidate: true });
      setUploadPreviewUrl(null);
    }
  };

  async function onUploadSubmit(values: z.infer<typeof appUploadFormSchema>) {
    if (!adminUser?.username || !adminUser?.isAdmin) {
      toast({ variant: "destructive", title: "Unauthorized" }); return;
    }
    if (!values.file) {
      uploadForm.setError("file", { type: "manual", message: "Image file is required." }); return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append("title", values.title);
    if (values.description) formData.append("description", values.description);
    formData.append("file", values.file);

    const result = await uploadImageAction(formData, { id: adminUser.username, name: adminUser.name });
    if (result.success) {
      toast({ title: "Success", description: result.message });
      uploadForm.reset(); setUploadPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchGallery(); // Refresh gallery
    } else {
      toast({ variant: "destructive", title: "Upload Failed", description: result.message });
      if (result.errors) {
        (Object.keys(result.errors) as Array<keyof AppUploadMediaFormValues>).forEach((key) => {
          const fieldErrors = result.errors![key];
          if (fieldErrors && fieldErrors.length > 0) uploadForm.setError(key, { type: 'server', message: fieldErrors.join(', ') });
        });
      }
    }
    setIsUploading(false);
  }
  
  const openEditDialog = (image: MediaItem) => {
    setEditingImage(image);
    metadataForm.reset({
      title: image.title,
      description: image.description || "",
    });
  };

  async function onMetadataSubmit(values: MetadataEditFormValues) {
    if (!editingImage || !adminUser?.username || !adminUser?.isAdmin) {
        toast({ variant: "destructive", title: "Error", description: "No image selected or unauthorized."});
        return;
    }
    setIsSubmittingMetadata(true);
    const result = await updateImageMetadataAction(
        { 
            filePath: editingImage.filePath, 
            imageUrl: editingImage.imageUrl,
            title: values.title, 
            description: values.description 
        },
        { id: adminUser.username, name: adminUser.name }
    );
    if (result.success && result.updatedItem) {
        toast({ title: "Success", description: result.message });
        setGalleryImages(prev => prev.map(img => img.filePath === result.updatedItem!.filePath ? result.updatedItem! : img));
        setEditingImage(null); // Close dialog
    } else {
        toast({ variant: "destructive", title: "Update Failed", description: result.message });
    }
    setIsSubmittingMetadata(false);
  }


  async function handleDeleteImage(filePath: string, docId: string) {
    setIsDeleting(docId); // Use docId (which might be sanitized filePath) for isDeleting state
    const result = await deleteImageAction(filePath, docId);
    if (result.success) {
      toast({ title: "Success", description: result.message });
      setGalleryImages(prev => prev.filter(img => img.id !== docId));
    } else {
      toast({ variant: "destructive", title: "Deletion Failed", description: result.message });
    }
    setIsDeleting(null);
  }

  if (!isAuthenticated || !adminUser?.isAdmin) {
    return (<div className="flex flex-1 items-center justify-center p-4"><Card className="shadow-lg p-8 animate-fadeIn w-full max-w-md"><CardHeader><CardTitle>Access Denied</CardTitle><CardDescription>You do not have permission.</CardDescription></CardHeader></Card></div>);
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <Card className="shadow-lg w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight flex items-center"><UploadCloud className="mr-3 h-8 w-8 text-primary" />Upload New Image</CardTitle>
          <CardDescription>Add new images to the gallery. Max file size: 25MB.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...uploadForm}>
            <form onSubmit={uploadForm.handleSubmit(onUploadSubmit)} className="space-y-6">
              <FormField control={uploadForm.control} name="title" render={({ field }) => (<FormItem><FormLabel>Image Title</FormLabel><FormControl><Input placeholder="Title for the image" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={uploadForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea placeholder="Describe the image..." {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={uploadForm.control} name="file" render={({}) => (<FormItem><FormLabel>Image File</FormLabel><FormControl><Input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUploadChange} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" /></FormControl><FormMessage /></FormItem>)} />
              {uploadPreviewUrl && (<div className="mt-4"><FormLabel className="text-sm">Image Preview:</FormLabel><div className="mt-2 border rounded-md p-2 flex justify-center items-center max-h-60 overflow-hidden"><Image src={uploadPreviewUrl} alt="Preview" width={200} height={200} className="max-w-full max-h-52 object-contain rounded-md" /></div></div>)}
              <Button type="submit" className="w-full" disabled={isUploading}>{isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}{isUploading ? "Uploading..." : "Upload Image"}</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="shadow-lg w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight flex items-center"><List className="mr-3 h-7 w-7 text-primary" />Uploaded Media Gallery</CardTitle>
          <CardDescription>Manage images. Images uploaded via console will show filename as title until edited.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingGallery ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (<div key={i} className="space-y-2"><Skeleton className="aspect-square w-full rounded-md" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /><Skeleton className="h-3 w-1/4" /></div>))}
            </div>
          ) : galleryError ? (
            <div className="p-4 border rounded-md bg-destructive/10 text-destructive"><h4 className="font-semibold mb-1">Error</h4><p className="text-sm">{galleryError}</p></div>
          ) : galleryImages.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No images uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {galleryImages.map((image) => (
                <Card key={image.id} className="overflow-hidden shadow-md flex flex-col">
                  <div className="aspect-square w-full relative bg-muted"><Image src={image.imageUrl} alt={image.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"/></div>
                  <CardContent className="p-3 space-y-1 flex-grow">
                    <h3 className="font-semibold text-sm truncate" title={image.title}>{image.title}</h3>
                    <p className="text-xs text-muted-foreground truncate" title={image.description || ""}>{image.description || "No description"}</p>
                    <p className="text-xs text-muted-foreground">Uploaded: {format(new Date(image.createdAt), "dd MMM yyyy")}</p>
                    <p className="text-xs text-muted-foreground flex items-center"><Download className="mr-1 h-3 w-3"/>Downloads: {image.downloadCount || 0}</p>
                  </CardContent>
                  <CardFooter className="p-2 border-t flex gap-1">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(image)}>
                          <Eye className="mr-1.5 h-3.5 w-3.5"/>Edit/View
                      </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="destructive" size="sm" className="flex-1" disabled={isDeleting === image.id}>{isDeleting === image.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}Delete</Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>Delete "{image.title}"? This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteImage(image.filePath, image.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Yes, delete</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={!!editingImage} onOpenChange={(isOpen) => { if (!isOpen) setEditingImage(null); }}>
        {editingImage && (
          <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="p-4 border-b">
              <DialogTitle>Edit Metadata: {editingImage.title}</DialogTitle>
              {editingImage.description && <DialogDescription>Current Description: {editingImage.description}</DialogDescription>}
            </DialogHeader>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="relative aspect-square md:aspect-auto md:max-h-[60vh] flex justify-center items-center bg-black/5 rounded overflow-hidden">
                    <Image src={editingImage.imageUrl} alt={editingImage.title} width={800} height={800} className="max-w-full max-h-[55vh] object-contain rounded" />
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-6xl md:text-8xl font-bold text-white/20 transform -rotate-12 select-none" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)'}}>deeniakhbar</span></div>
                </div>
                <Form {...metadataForm}>
                    <form onSubmit={metadataForm.handleSubmit(onMetadataSubmit)} className="space-y-4">
                        <FormField control={metadataForm.control} name="title" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Enter image title" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={metadataForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea placeholder="Enter image description" {...field} rows={3} /></FormControl><FormMessage /></FormItem>)} />
                        <div className="flex justify-end gap-2 pt-2">
                           <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                           <Button type="submit" disabled={isSubmittingMetadata}>{isSubmittingMetadata && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Metadata</Button>
                        </div>
                    </form>
                </Form>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

    
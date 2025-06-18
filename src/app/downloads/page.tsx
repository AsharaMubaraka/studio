
"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { getGalleryImagesAction, type MediaItem } from "@/actions/imageActions";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Eye, Loader2, ImageOff, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { siteConfig } from "@/config/site";

export default function DownloadsPage() {
  const [images, setImages] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<MediaItem | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null); // Store ID of image being downloaded

  const fetchImages = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedImages = await getGalleryImagesAction();
      setImages(fetchedImages);
    } catch (err) {
      console.error("Error fetching images for gallery:", err);
      setError("Failed to load images. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = `Media Downloads | ${siteConfig.name}`;
    fetchImages();
  }, [fetchImages]);

  const handleDownload = async (image: MediaItem) => {
    setIsDownloading(image.id);
    try {
      // Direct download from Cloudinary URL
      const response = await fetch(image.imageUrl);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      const nameParts = image.imageUrl.split('/');
      const defaultName = nameParts[nameParts.length -1];
      link.download = image.title.replace(/[^a-zA-Z0-9_.-]/g, '_') + `.${defaultName.split('.').pop() || 'jpg'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      // await incrementDownloadCountAction(image.id); // Placeholder if we add this back
      // fetchImages(); // Re-fetch to update counts if implemented
    } catch (err: any) {
      console.error("Download error:", err);
      alert(`Error downloading file: ${err.message}`);
    } finally {
      setIsDownloading(null);
    }
  };


  return (
    <div className="container mx-auto py-8 px-4 animate-fadeIn">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary">Media Downloads</h1>
        <p className="text-lg text-muted-foreground mt-2">Browse and download from our gallery.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-video w-full" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : images.length === 0 ? (
         <Alert className="max-w-md mx-auto text-center">
            <ImageOff className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
            <AlertDescription className="text-lg">No images available in the gallery at this time. Please check back later.</AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {images.map((image) => (
            <Card key={image.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 group">
              <Dialog onOpenChange={(open) => !open && setSelectedImage(null)}>
                <DialogTrigger asChild>
                  <div 
                    className="aspect-video w-full relative bg-muted cursor-pointer overflow-hidden"
                    onClick={() => setSelectedImage(image)}
                  >
                    <Image
                      src={image.imageUrl}
                      alt={image.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  </div>
                </DialogTrigger>
                {selectedImage && selectedImage.id === image.id && (
                  <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-0">
                    <DialogHeader className="p-4 border-b">
                      <DialogTitle>{selectedImage.title}</DialogTitle>
                      {selectedImage.description && <DialogDescription>{selectedImage.description}</DialogDescription>}
                    </DialogHeader>
                    <div className="p-4 relative max-h-[70vh] overflow-y-auto flex justify-center items-center bg-black/5">
                        <div className="relative inline-block">
                            <Image
                                src={selectedImage.imageUrl}
                                alt={selectedImage.title}
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
                    <DialogFooter className="p-4 border-t">
                        <Button onClick={() => handleDownload(selectedImage)} disabled={isDownloading === selectedImage.id}>
                            {isDownloading === selectedImage.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            {isDownloading === selectedImage.id ? "Downloading..." : "Download Original"}
                        </Button>
                        <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                    </DialogFooter>
                  </DialogContent>
                )}
              </Dialog>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-md font-semibold truncate" title={image.title}>{image.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-xs text-muted-foreground line-clamp-2" title={image.description || "No description"}>
                  {image.description || "No description"}
                </p>
              </CardContent>
              <CardFooter className="p-4 border-t">
                <Button onClick={() => handleDownload(image)} className="w-full" disabled={isDownloading === image.id}>
                  {isDownloading === image.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  {isDownloading === image.id ? "Downloading..." : "Download"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

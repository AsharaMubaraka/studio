
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { fetchPublicImagesAction, incrementDownloadCountAction, type PublicImage } from "@/actions/imageActions";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { DownloadCloud, ImageIcon, Image as ImageIconLucide, X, Loader2, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { siteConfig } from "@/config/site";
import { useToast } from "@/hooks/use-toast";

const WATERMARK_TEXT = "deeniakhbar";

export default function DownloadsPage() {
  const [images, setImages] = useState<PublicImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<PublicImage | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null); // Store ID of downloading image
  const { toast } = useToast();

  useEffect(() => {
    document.title = `Media Downloads | ${siteConfig.name}`;
    async function loadImages() {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedImages = await fetchPublicImagesAction();
        setImages(fetchedImages);
      } catch (err) {
        setError("Failed to load images. Please try again later.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadImages();
  }, []);

  const handleDownload = async (event: React.MouseEvent<HTMLButtonElement>, image: PublicImage) => {
    event.stopPropagation(); // Prevent dialog from closing if button is inside trigger
    setIsDownloading(image.id);
    try {
      // Attempt to increment download count
      await incrementDownloadCountAction(image.id);

      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = image.imageUrl;
      
      // Suggest a filename for the download
      const fileName = image.originalFileName || image.name.replace(/\s+/g, '_') || "downloaded_image";
      link.download = fileName;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({ title: "Download Started", description: `Downloading ${fileName}...` });

    } catch (err: any) {
        toast({ variant: "destructive", title: "Download Error", description: err.message || "Could not initiate download."});
    } finally {
        setIsDownloading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <h1 className="text-3xl font-bold tracking-tight">Media Downloads</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-video w-full bg-muted" />
              <CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2 mt-1" /></CardHeader>
              <CardFooter><Skeleton className="h-10 w-full" /></CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fadeIn">
        <h1 className="text-3xl font-bold tracking-tight mb-6">Media Downloads</h1>
        <Alert variant="destructive">
          <ImageIcon className="h-5 w-5" />
          <AlertTitle>Error Loading Media</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 bg-card rounded-lg shadow">
        <h1 className="text-3xl font-bold tracking-tight">Media Downloads</h1>
        <p className="text-muted-foreground text-sm">Browse and download available media files.</p>
      </div>

      {images.length === 0 ? (
        <Alert>
          <ImageIconLucide className="h-5 w-5" />
          <AlertTitle>No Media Available</AlertTitle>
          <AlertDescription>There are currently no images available for download. Please check back later.</AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {images.map((image) => (
            <Dialog key={image.id} onOpenChange={(open) => !open && setSelectedImage(null)}>
              <DialogTrigger asChild>
                <Card 
                  className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer group"
                  onClick={() => setSelectedImage(image)}
                >
                  <CardContent className="p-0 aspect-video relative">
                    <Image
                      src={image.imageUrl}
                      alt={image.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      data-ai-hint={image.name.split(" ").slice(0,2).join(" ") || "gallery image"}
                    />
                  </CardContent>
                  <CardHeader className="pb-3 pt-4">
                    <CardTitle className="truncate text-lg">{image.name}</CardTitle>
                    {image.description && <CardDescription className="truncate text-xs h-4">{image.description}</CardDescription>}
                     <CardDescription className="text-xs text-muted-foreground pt-1 flex items-center">
                        <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                        {format(new Date(image.uploadedAt), "MMM d, yyyy")}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button 
                        className="w-full" 
                        onClick={(e) => handleDownload(e, image)} 
                        disabled={isDownloading === image.id}
                    >
                      {isDownloading === image.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DownloadCloud className="mr-2 h-4 w-4" />}
                      {isDownloading === image.id ? "Downloading..." : "Download"}
                    </Button>
                  </CardFooter>
                </Card>
              </DialogTrigger>
              {selectedImage && selectedImage.id === image.id && (
                <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-0 overflow-hidden">
                  <DialogHeader className="p-4 border-b">
                    <DialogTitle className="truncate">{selectedImage.name}</DialogTitle>
                    {selectedImage.description && <DialogDescription>{selectedImage.description}</DialogDescription>}
                     <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </DialogClose>
                  </DialogHeader>
                  <div className="p-1 md:p-2 bg-muted/20">
                    <div className="relative aspect-video w-full max-h-[75vh] mx-auto flex items-center justify-center">
                      <Image
                        src={selectedImage.imageUrl}
                        alt={selectedImage.name}
                        fill
                        className="object-contain"
                        data-ai-hint={selectedImage.name.split(" ").slice(0,2).join(" ") || "preview image"}
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span 
                          className="text-4xl md:text-6xl lg:text-8xl font-bold opacity-20 text-foreground select-none"
                          style={{ transform: 'rotate(-30deg)' }}
                        >
                          {WATERMARK_TEXT}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border-t flex justify-end">
                     <Button 
                        onClick={(e) => handleDownload(e, selectedImage)} 
                        disabled={isDownloading === selectedImage.id}
                    >
                      {isDownloading === selectedImage.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DownloadCloud className="mr-2 h-4 w-4" />}
                      {isDownloading === selectedImage.id ? "Downloading..." : "Download Original"}
                    </Button>
                  </div>
                </DialogContent>
              )}
            </Dialog>
          ))}
        </div>
      )}
    </div>
  );
}

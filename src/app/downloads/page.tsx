
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
// MediaItem and actions from imageActions are no longer needed here for fetching
// import { type MediaItem, incrementDownloadCountAction } from "@/actions/imageActions"; 
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Eye, Loader2, ImageOff, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { siteConfig } from "@/config/site";
import { useToast } from "@/hooks/use-toast";

// Simplified interface for hardcoded images
interface SimpleMediaItem {
  id: string;
  title: string;
  imageUrl: string;
  description?: string;
  dataAiHint?: string; // Optional AI hint for next/image
}

const hardcodedImages: SimpleMediaItem[] = [
  {
    id: "wallpaper-01",
    title: "Wallpaper 01",
    imageUrl: "https://firebasestorage.googleapis.com/v0/b/lnv-fmb.appspot.com/o/4_20250617_221801_0000.png?alt=media&token=0040f824-5016-4f5e-b651-b053ba371ca1",
    description: "Ashara Mubaraka Wallpaper & DP Series - Design 1",
    dataAiHint: "abstract spiritual"
  },
  {
    id: "wallpaper-02",
    title: "Wallpaper 02",
    imageUrl: "https://firebasestorage.googleapis.com/v0/b/lnv-fmb.appspot.com/o/5_20250617_221801_0001.png?alt=media&token=004b31b6-3c45-4031-be3a-009c575e25a1",
    description: "Ashara Mubaraka Wallpaper & DP Series - Design 2",
    dataAiHint: "geometric patterns"
  },
  {
    id: "wallpaper-03",
    title: "Wallpaper 03",
    imageUrl: "https://firebasestorage.googleapis.com/v0/b/lnv-fmb.appspot.com/o/6_20250617_221802_0002.png?alt=media&token=50000005-c8ca-4e29-850e-02c213edfa83",
    description: "Ashara Mubaraka Wallpaper & DP Series - Design 3",
    dataAiHint: "calligraphy design"
  },
  // Add more images here if needed, following the same structure
];

export default function DownloadsPage() {
  const [images, setImages] = useState<SimpleMediaItem[]>(hardcodedImages);
  const [isLoading, setIsLoading] = useState(false); // No initial loading from server
  const [error, setError] = useState<string | null>(null); // For potential download errors
  const [selectedImage, setSelectedImage] = useState<SimpleMediaItem | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    document.title = `Media Downloads | ${siteConfig.name}`;
  }, []);

  const handleDownload = async (image: SimpleMediaItem) => {
    setIsDownloading(image.id);
    try {
      // For direct Firebase URLs with tokens, fetching via a link is simplest
      const link = document.createElement("a");
      link.href = image.imageUrl;
      // Extract a filename or use a default one
      const urlParts = image.imageUrl.split('?')[0].split('/');
      const firebasePath = urlParts[urlParts.length - 1];
      const decodedFirebasePath = decodeURIComponent(firebasePath);
      const filename = decodedFirebasePath.substring(decodedFirebasePath.indexOf('/') + 1) || image.title.replace(/[^a-zA-Z0-9_.-]/g, '_') + '.png';
      
      link.download = filename; 
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({ title: "Download Started", description: `Downloading ${image.title}...`});
      // Download count increment is removed as we are not fetching metadata from Firestore
    } catch (err: any) {
      console.error("Download error:", err);
      toast({ variant: "destructive", title: "Download Error", description: err.message || "Could not download the file."});
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

      {isLoading ? ( // This state is less relevant now but kept for consistency
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(hardcodedImages.length || 4)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-video w-full" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? ( // For download errors, not fetching errors
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : images.length === 0 ? (
         <Alert className="max-w-md mx-auto text-center">
            <ImageOff className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
            <AlertDescription className="text-lg">No images available in the gallery. Please check back later.</AlertDescription>
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
                      data-ai-hint={image.dataAiHint || "wallpaper image"}
                    />
                  </div>
                </DialogTrigger>
                {selectedImage && selectedImage.id === image.id && (
                  <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-0">
                    <DialogHeader className="p-4 border-b">
                      <DialogTitle>Image Preview: {selectedImage.title}</DialogTitle>
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
                                data-ai-hint={selectedImage.dataAiHint || "wallpaper image"}
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
                 <p className="text-xs text-muted-foreground line-clamp-2" title={image.description}>
                    {image.description || "Official wallpaper."}
                </p>
                {/* Download count is removed as it's not tracked for hardcoded list */}
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


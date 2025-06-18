
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Eye, Loader2, ImageOff, AlertTriangle, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { siteConfig } from "@/config/site";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase"; 
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { incrementDownloadCountAction } from "@/actions/imageActions";

interface SimpleMediaItem {
  id: string;
  title: string;
  imageUrl: string;
  description?: string;
  dataAiHint?: string;
  downloadCount: number;
}

const initialHardcodedImages: Omit<SimpleMediaItem, 'downloadCount'>[] = [
  {
    id: "dp-01", // Matched with DP-1.png
    title: "DP 01",
    imageUrl: "https://i.ibb.co/8FWdWST/DP-1.png",
    description: "Ashara Mubaraka Display Picture - Design 1",
    dataAiHint: "profile picture"
  },
  {
    id: "dp-02", // Matched with DP-2.png
    title: "DP 02",
    imageUrl: "https://i.ibb.co/wrjdhTMZ/DP-2.png",
    description: "Ashara Mubaraka Display Picture - Design 2",
    dataAiHint: "avatar graphic"
  },
  {
    id: "dp-03", // Matched with DP-3.png
    title: "DP 03",
    imageUrl: "https://i.ibb.co/V0twts6z/DP-3.png",
    description: "Ashara Mubaraka Display Picture - Design 3",
    dataAiHint: "icon design"
  },
  {
    id: "dp-04", // Matched with DP-4.png
    title: "DP 04",
    imageUrl: "https://i.ibb.co/gZLCrmwL/DP-4.png",
    description: "Ashara Mubaraka Display Picture - Design 4",
    dataAiHint: "abstract art"
  },
  {
    id: "dp-05", // Matched with DP-5.png
    title: "DP 05",
    imageUrl: "https://i.ibb.co/vCq9fkZj/DP-5.png",
    description: "Ashara Mubaraka Display Picture - Design 5",
    dataAiHint: "modern design"
  },
  {
    id: "dp-06", // Matched with DP-6.png
    title: "DP 06",
    imageUrl: "https://i.ibb.co/s9gJ0jhY/DP-6.png",
    description: "Ashara Mubaraka Display Picture - Design 6",
    dataAiHint: "artistic design"
  },
  {
    id: "dp-07", // Matched with DP-7.png
    title: "DP 07",
    imageUrl: "https://i.ibb.co/Dg51QVjY/DP-7.png",
    description: "Ashara Mubaraka Display Picture - Design 7",
    dataAiHint: "creative avatar"
  },
  {
    id: "wallpaper-01", // Matched with Wallpaper-1.png
    title: "Wallpaper 01",
    imageUrl: "https://i.ibb.co/Z6y3BsNj/Wallpaper-1.png",
    description: "Ashara Mubaraka Wallpaper & DP Series - Design 1",
    dataAiHint: "abstract spiritual"
  },
  {
    id: "wallpaper-02", // Matched with Wallpaper-2.png
    title: "Wallpaper 02",
    imageUrl: "https://i.ibb.co/1tCdMhWk/Wallpaper-2.png",
    description: "Ashara Mubaraka Wallpaper & DP Series - Design 2",
    dataAiHint: "geometric patterns"
  },
  {
    id: "wallpaper-03", // Matched with Wallpaper-3.png
    title: "Wallpaper 03",
    imageUrl: "https://i.ibb.co/Tftx8jn/Wallpaper-3.png",
    description: "Ashara Mubaraka Wallpaper & DP Series - Design 3",
    dataAiHint: "calligraphy design"
  },
];


export default function DownloadsPage() {
  const [images, setImages] = useState<SimpleMediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<SimpleMediaItem | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    document.title = `Media Downloads | ${siteConfig.name}`;

    const fetchAndInitializeCounts = async () => {
      if (!db) {
        setError("Database connection not available. Cannot fetch download counts.");
        setIsLoading(false);
        setImages(Array.isArray(initialHardcodedImages) ? initialHardcodedImages.map(img => ({ ...img, downloadCount: 0 })) : []);
        return;
      }
      setIsLoading(true);
      try {
        const updatedImagesPromises = Array.isArray(initialHardcodedImages) ? initialHardcodedImages.map(async (hardcodedImg) => {
          const docRef = doc(db, "media_gallery", hardcodedImg.id);
          const docSnap = await getDoc(docRef);
          let count = 0;
          let firestoreData: any = {};
          if (docSnap.exists()) {
            firestoreData = docSnap.data();
            count = firestoreData?.downloadCount || 0;
          } else {
            try {
              const newDocData = {
                title: hardcodedImg.title,
                description: hardcodedImg.description || null,
                imageUrl: hardcodedImg.imageUrl,
                filePath: `hardcoded/${hardcodedImg.id}`, 
                uploaderId: "system",
                uploaderName: "System (Hardcoded)",
                createdAt: serverTimestamp(), 
                downloadCount: 0,
              };
              await setDoc(docRef, newDocData);
              firestoreData = newDocData; // Use this for title/desc if doc was just created
            } catch (setDocError) {
                console.warn(`Failed to create Firestore doc for ${hardcodedImg.id}:`, setDocError);
            }
          }
          return { 
            ...hardcodedImg, 
            title: firestoreData?.title || hardcodedImg.title,
            description: firestoreData?.description || hardcodedImg.description,
            imageUrl: firestoreData?.imageUrl || hardcodedImg.imageUrl, // Ensure imageUrl from DB is used if available
            downloadCount: count 
          };
        }) : [];
        const resolvedImages = await Promise.all(updatedImagesPromises);
        setImages(resolvedImages);
      } catch (fetchError: any) {
        console.error("Error fetching/initializing download counts:", fetchError);
        setError("Failed to load download counts. Displaying images without live counts.");
        setImages(Array.isArray(initialHardcodedImages) ? initialHardcodedImages.map(img => ({ ...img, downloadCount: 0 })) : []);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndInitializeCounts();
  }, []);

 const handleDownload = async (imageToDownload: SimpleMediaItem | null) => {
    if (!imageToDownload) {
        toast({
            variant: "destructive",
            title: "Download Error",
            description: "No image selected or image data is missing.",
        });
        return;
    }

    setIsDownloading(imageToDownload.id);
    try {
        const proxyUrl = `/api/download?url=${encodeURIComponent(imageToDownload.imageUrl)}`;
        
        // This will navigate to the API route, which should then force a download.
        // Opening in a new tab (_blank) is often better UX for downloads.
        window.open(proxyUrl, '_self'); // Use _self to attempt download in same tab flow
        
        const result = await incrementDownloadCountAction(imageToDownload.id);
        if (result.success) {
            setImages(prevImages =>
                prevImages.map(img =>
                    img.id === imageToDownload.id ? { ...img, downloadCount: (img.downloadCount || 0) + 1 } : img
                )
            );
        } else {
            console.warn(`Failed to update download count for ${imageToDownload.id}: ${result.message}`);
        }
        
        toast({
            title: "Shukran!",
            description: "Thank you for downloading the wallpaper! Do share your screen using #deeniakhbar53 and on Insta @deeni.akhbar53",
            duration: 10000, 
        });

    } catch (err: any) {
        console.error("Download error:", err);
        toast({ variant: "destructive", title: "Download Error", description: err.message || "Could not download the file."});
    } finally {
        setIsDownloading(null);
    }
};

  const renderContent = () => {
    if (isLoading && (!images || images.length === 0)) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {(Array.isArray(initialHardcodedImages) ? initialHardcodedImages : []).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-video w-full" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
              <CardFooter className="p-4">
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      );
    }

    if (error && (!images || images.length === 0)) {
      return (
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }
    
    if (!Array.isArray(images) || images.length === 0) {
      return (
         <Alert className="max-w-md mx-auto text-center">
            <ImageOff className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
            <AlertDescription className="text-lg">No images available in the gallery. Please check back later.</AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {images.map((image) => (
          <Card key={image.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 group flex flex-col">
            <div 
              className="aspect-video w-full relative bg-muted cursor-pointer overflow-hidden"
              onClick={() => setSelectedImage(image)} // Sets selected image for the single dialog
            >
              <Image
                src={image.imageUrl}
                alt={image.title || "Gallery image"}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                data-ai-hint={image.dataAiHint || "wallpaper image"}
                unoptimized={!!image.imageUrl?.includes('?') || !!image.imageUrl?.includes('&') || image.imageUrl?.includes('i.ibb.co')}
              />
            </div>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-md font-semibold truncate" title={image.title}>{image.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex-grow">
               <p className="text-xs text-muted-foreground line-clamp-2" title={image.description}>
                  {image.description || "Official wallpaper."}
              </p>
              <p className="text-xs text-muted-foreground mt-2 flex items-center">
                <TrendingUp className="mr-1.5 h-4 w-4 text-primary/70" />
                Downloads: {(image.downloadCount || 0).toLocaleString()}
              </p>
            </CardContent>
            <CardFooter className="p-4 border-t mt-auto">
              <Button onClick={() => handleDownload(image)} className="w-full" disabled={isDownloading === image.id}>
                {isDownloading === image.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {isDownloading === image.id ? "Downloading..." : "Download"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4 animate-fadeIn">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary">Media Downloads</h1>
        <p className="text-lg text-muted-foreground mt-2">Browse and download from our gallery.</p>
      </div>
      {error && !isLoading && (!Array.isArray(images) || images.length === 0) && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
      
      {renderContent()}

      {/* Single Dialog for Preview */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => { if (!open) setSelectedImage(null); }}>
        {selectedImage && (
          <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-0">
            <DialogHeader className="p-4 border-b">
              <DialogTitle>Image Preview: {selectedImage.title}</DialogTitle>
              {selectedImage.description && <DialogDescription>{selectedImage.description}</DialogDescription>}
            </DialogHeader>
            <div className="p-4 relative max-h-[70vh] overflow-y-auto flex justify-center items-center bg-black/5">
                <div className="relative inline-block">
                    <Image
                        src={selectedImage.imageUrl}
                        alt={selectedImage.title || "Selected image"}
                        width={1200}
                        height={800}
                        className="max-w-full max-h-[65vh] object-contain rounded"
                        data-ai-hint={selectedImage.dataAiHint || "wallpaper image"}
                        unoptimized={!!selectedImage.imageUrl?.includes('?') || !!selectedImage.imageUrl?.includes('&') || selectedImage.imageUrl?.includes('i.ibb.co')}
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
    </div>
  );
}

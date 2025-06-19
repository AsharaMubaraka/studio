
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, Unsubscribe } from "firebase/firestore";
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
    id: "wallpaper-01",
    title: "Wallpaper 01",
    imageUrl: "https://i.ibb.co/Z6y3BsNj/Wallpaper-1.png",
    description: "Ashara Mubaraka Wallpaper & DP Series - Design 1",
    dataAiHint: "abstract spiritual"
  },
  {
    id: "wallpaper-02",
    title: "Wallpaper 02",
    imageUrl: "https://i.ibb.co/1tCdMhWk/Wallpaper-2.png",
    description: "Ashara Mubaraka Wallpaper & DP Series - Design 2",
    dataAiHint: "geometric patterns"
  },
  {
    id: "wallpaper-03",
    title: "Wallpaper 03",
    imageUrl: "https://i.ibb.co/Tftx8jn/Wallpaper-3.png",
    description: "Ashara Mubaraka Wallpaper & DP Series - Design 3",
    dataAiHint: "calligraphy design"
  },
  {
    id: "dp-01",
    title: "DP 01",
    imageUrl: "https://i.ibb.co/8FWdWST/DP-1.png",
    description: "Ashara Mubaraka Display Picture - Design 1",
    dataAiHint: "profile picture"
  },
  {
    id: "dp-02",
    title: "DP 02",
    imageUrl: "https://i.ibb.co/wrjdhTMZ/DP-2.png",
    description: "Ashara Mubaraka Display Picture - Design 2",
    dataAiHint: "avatar graphic"
  },
  {
    id: "dp-03",
    title: "DP 03",
    imageUrl: "https://i.ibb.co/V0twts6z/DP-3.png",
    description: "Ashara Mubaraka Display Picture - Design 3",
    dataAiHint: "icon design"
  },
  {
    id: "dp-04",
    title: "DP 04",
    imageUrl: "https://i.ibb.co/gZLCrmwL/DP-4.png",
    description: "Ashara Mubaraka Display Picture - Design 4",
    dataAiHint: "abstract art"
  },
  {
    id: "dp-05",
    title: "DP 05",
    imageUrl: "https://i.ibb.co/vCq9fkZj/DP-5.png",
    description: "Ashara Mubaraka Display Picture - Design 5",
    dataAiHint: "modern design"
  },
  {
    id: "dp-06",
    title: "DP 06",
    imageUrl: "https://i.ibb.co/s9gJ0jhY/DP-6.png",
    description: "Ashara Mubaraka Display Picture - Design 6",
    dataAiHint: "artistic design"
  },
  {
    id: "dp-07",
    title: "DP 07",
    imageUrl: "https://i.ibb.co/Dg51QVjY/DP-7.png",
    description: "Ashara Mubaraka Display Picture - Design 7",
    dataAiHint: "creative avatar"
  },
];

const seedDownloadCounts: Record<string, number> = {
  "wallpaper-01": 890,
  "wallpaper-02": 230,
  "wallpaper-03": 196,
  "dp-01": 201,
  "dp-02": 150,
  "dp-03": 203,
  "dp-04": 150,
  "dp-05": 205,
  "dp-06": 150,
  "dp-07": 230,
};


export default function DownloadsPage() {
  const [images, setImages] = useState<SimpleMediaItem[]>(() =>
    initialHardcodedImages.map(img => ({ ...img, downloadCount: seedDownloadCounts[img.id] || 0 }))
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<SimpleMediaItem | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    document.title = `Media Downloads | ${siteConfig.name}`;

    if (!db) {
      setError("Database connection not available. Cannot fetch download counts.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribers: Unsubscribe[] = [];
    let initialLoadsPending = initialHardcodedImages.length;

    initialHardcodedImages.forEach((hardcodedImg) => {
      const docRef = doc(db, "media_gallery", hardcodedImg.id);
      
      const unsubscribe = onSnapshot(docRef, async (docSnap) => {
        let currentCount = 0;
        let firestoreDataToSet: any = {
          title: hardcodedImg.title,
          description: hardcodedImg.description || null,
          imageUrl: hardcodedImg.imageUrl, 
          filePath: `hardcoded/${hardcodedImg.id}`, // Using a different path for these special items
          uploaderId: "system_seeded",
          uploaderName: "System (Seeded)",
        };

        if (docSnap.exists()) {
          const firestoreData = docSnap.data();
          currentCount = firestoreData?.downloadCount || seedDownloadCounts[hardcodedImg.id] || 0;
          
          firestoreDataToSet = { 
            ...firestoreData, // Keep existing data
            ...firestoreDataToSet, // Override with hardcoded metadata
            downloadCount: currentCount // Ensure count is from Firestore or seed if Firestore is lower
          }; 
          
          // Only update Firestore if metadata changed or if Firestore count was less than seed
          if (firestoreData?.imageUrl !== hardcodedImg.imageUrl ||
              firestoreData?.title !== hardcodedImg.title ||
              firestoreData?.description !== (hardcodedImg.description || null) ||
              (typeof firestoreData?.downloadCount !== 'number') || // Ensure count exists
              firestoreData.downloadCount < (seedDownloadCounts[hardcodedImg.id] || 0) // If Firestore count is somehow less than seed
             ) {
            try {
              // Ensure we don't accidentally reduce a count if Firestore already had higher
              const finalCountForSet = Math.max(currentCount, seedDownloadCounts[hardcodedImg.id] || 0);
              firestoreDataToSet.downloadCount = finalCountForSet;
              await setDoc(docRef, firestoreDataToSet, { merge: true });
              console.log(`Updated/verified Firestore doc for ${hardcodedImg.id}. Count: ${finalCountForSet}`);
            } catch (setDocError) {
              console.warn(`Failed to update/verify Firestore doc for ${hardcodedImg.id}:`, setDocError);
            }
          }
        } else {
          // Document doesn't exist, create it with seed count
          currentCount = seedDownloadCounts[hardcodedImg.id] || 0;
          firestoreDataToSet.downloadCount = currentCount;
          firestoreDataToSet.createdAt = serverTimestamp();
          try {
            await setDoc(docRef, firestoreDataToSet);
            console.log(`Created Firestore doc for ${hardcodedImg.id} with seed count ${currentCount}`);
          } catch (setDocError) {
            console.warn(`Failed to create Firestore doc for ${hardcodedImg.id}:`, setDocError);
          }
        }
        
        setImages(prevImages =>
          prevImages.map(img =>
            img.id === hardcodedImg.id ? { ...img, downloadCount: currentCount, imageUrl: hardcodedImg.imageUrl } : img
          )
        );

        if (initialLoadsPending > 0) {
          initialLoadsPending--;
          if (initialLoadsPending === 0) {
            setIsLoading(false);
          }
        }

      }, (err) => {
        console.error(`Error listening to image ${hardcodedImg.id}:`, err);
        setError(`Failed to load real-time data for ${hardcodedImg.title}. Displaying last known or seeded count.`);
        setImages(prevImages => // Fallback to seeded count if listener fails
          prevImages.map(img =>
            img.id === hardcodedImg.id ? { ...img, downloadCount: seedDownloadCounts[img.id] || img.downloadCount || 0 } : img
          )
        );
        if (initialLoadsPending > 0) {
          initialLoadsPending--;
          if (initialLoadsPending === 0) {
            setIsLoading(false);
          }
        }
      });
      unsubscribers.push(unsubscribe);
    });

    if (initialHardcodedImages.length === 0) {
        setIsLoading(false);
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  const handleDownload = async (imageToDownload: SimpleMediaItem | null) => {
    if (!imageToDownload || !imageToDownload.imageUrl) {
        toast({ variant: "destructive", title: "Download Error", description: "No image selected or image URL is missing." });
        return;
    }

    setIsDownloading(imageToDownload.id);
    try {
        const proxyUrl = `/api/download?url=${encodeURIComponent(imageToDownload.imageUrl)}`;
        window.location.href = proxyUrl;
        
        await incrementDownloadCountAction(imageToDownload.id); 
        
        toast({
            title: "Shukran!",
            description: "Thank you for downloading the wallpaper! Do share your screen using #deeniakhbar53 and on Insta @deeni.akhbar53",
            duration: 10000, 
        });

    } catch (err: any) {
        console.error("Download error:", err);
        toast({ variant: "destructive", title: "Download Error", description: err.message || "Could not download the file."});
    } finally {
        setTimeout(() => {
            setIsDownloading(null);
        }, 2000); 
    }
  };

  const totalDownloads = images.reduce((acc, img) => acc + (img.downloadCount || 0), 0);

  const renderContent = () => {
    if (isLoading && images.every(img => (seedDownloadCounts[img.id] || 0) === img.downloadCount && img.downloadCount === 0)) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {initialHardcodedImages.map((img, i) => (
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

    if (error && images.length === 0) {
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
              onClick={() => setSelectedImage(image)}
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
                Downloads: {isLoading && image.downloadCount === (seedDownloadCounts[image.id] || 0) ? <Loader2 className="h-3 w-3 animate-spin inline-block ml-1" /> : (image.downloadCount || 0).toLocaleString()}
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

      <Card className="mt-6 mb-8 max-w-sm mx-auto shadow-md bg-card">
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center text-xl font-semibold text-card-foreground">
            <TrendingUp className="mr-2 h-6 w-6 text-primary" />
            Total Gallery Downloads
          </div>
          <p className="text-3xl font-bold text-primary mt-1">
            {isLoading && totalDownloads === Object.values(seedDownloadCounts).reduce((a, b) => a + b, 0) ? <Loader2 className="h-7 w-7 animate-spin inline-block" /> : totalDownloads.toLocaleString()}
          </p>
        </CardContent>
      </Card>
      
      {error && (
        <Alert variant="destructive" className="mb-4 max-w-md mx-auto">
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {renderContent()}

      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={(open) => { if (!open) setSelectedImage(null); }}>
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
        </Dialog>
      )}
    </div>
  );
}
    
    

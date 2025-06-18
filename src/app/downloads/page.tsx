
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Eye, Loader2, ImageOff, AlertTriangle, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { siteConfig } from "@/config/site";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase"; 
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
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
  {
    id: "dp-01",
    title: "DP 01",
    imageUrl: "https://firebasestorage.googleapis.com/v0/b/lnv-fmb.appspot.com/o/7_20250618_084246_0006.png?alt=media&token=9a2d3f87-dbd3-471f-aa0e-94f6487ff29c",
    description: "Ashara Mubaraka Display Picture - Design 1",
    dataAiHint: "profile picture"
  },
  {
    id: "dp-02",
    title: "DP 02",
    imageUrl: "https://firebasestorage.googleapis.com/v0/b/lnv-fmb.appspot.com/o/6_20250618_084246_0005.png?alt=media&token=c764a39c-f815-4bc8-8159-76d9ad6717d7",
    description: "Ashara Mubaraka Display Picture - Design 2",
    dataAiHint: "avatar graphic"
  },
  {
    id: "dp-03",
    title: "DP 03",
    imageUrl: "https://firebasestorage.googleapis.com/v0/b/lnv-fmb.appspot.com/o/5_20250618_084246_0004.png?alt=media&token=9c2ea1a9-01e2-4423-9018-1bbd7bdabf23",
    description: "Ashara Mubaraka Display Picture - Design 3",
    dataAiHint: "icon design"
  },
  {
    id: "dp-04",
    title: "DP 04",
    imageUrl: "https://firebasestorage.googleapis.com/v0/b/lnv-fmb.appspot.com/o/4_20250618_084246_0003.png?alt=media&token=f8cc498c-2816-4231-ab74-6e6c0beec70b",
    description: "Ashara Mubaraka Display Picture - Design 4",
    dataAiHint: "abstract art"
  },
  {
    id: "dp-05",
    title: "DP 05",
    imageUrl: "https://firebasestorage.googleapis.com/v0/b/lnv-fmb.appspot.com/o/3_20250618_084246_0002.png?alt=media&token=dbebb14e-6c2c-486a-a500-708fa76b43b0",
    description: "Ashara Mubaraka Display Picture - Design 5",
    dataAiHint: "modern design"
  },
  {
    id: "dp-06",
    title: "DP 06",
    imageUrl: "https://firebasestorage.googleapis.com/v0/b/lnv-fmb.appspot.com/o/2_20250618_084246_0001.png?alt=media&token=76709236-c10c-44a9-b36b-a5ddfdbf34ae",
    description: "Ashara Mubaraka Display Picture - Design 6",
    dataAiHint: "artistic design"
  },
  {
    id: "dp-07",
    title: "DP 07",
    imageUrl: "https://firebasestorage.googleapis.com/v0/b/lnv-fmb.appspot.com/o/1_20250618_084246_0000.png?alt=media&token=a5ab1165-3ba5-4449-959c-011c3f811406",
    description: "Ashara Mubaraka Display Picture - Design 7",
    dataAiHint: "creative avatar"
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
              firestoreData = newDocData;
            } catch (setDocError) {
                console.warn(`Failed to create Firestore doc for ${hardcodedImg.id}:`, setDocError);
            }
          }
          return { 
            ...hardcodedImg, 
            title: firestoreData?.title || hardcodedImg.title,
            description: firestoreData?.description || hardcodedImg.description,
            imageUrl: firestoreData?.imageUrl || hardcodedImg.imageUrl,
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


  const handleDownload = async (image: SimpleMediaItem) => {
    setIsDownloading(image.id);
    try {
        // Construct the URL for our API proxy
        const proxyUrl = `/api/download?url=${encodeURIComponent(image.imageUrl)}`;
        
        // Open the proxy URL, which will trigger the download with correct headers
        window.open(proxyUrl, '_blank');
        // Or for same tab navigation (might be less ideal for user experience if it replaces content):
        // window.location.href = proxyUrl;

        // Extract filename for toast message (optional, as server now handles actual filename)
        let filename = image.title.replace(/[^a-zA-Z0-9_-\s]/g, '_').replace(/\s+/g, '_') || "download";
        const extensionMatch = image.imageUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i);
        const extension = extensionMatch && extensionMatch[1] ? `.${extensionMatch[1]}` : '.png';
        if (!filename.includes('.')) {
             filename += extension;
        }

        toast({ title: "Download Initiated", description: `Downloading ${filename}...`});

        // Increment download count
        const result = await incrementDownloadCountAction(image.id);
        if (result.success) {
            setImages(prevImages =>
                prevImages.map(img =>
                    img.id === image.id ? { ...img, downloadCount: (img.downloadCount || 0) + 1 } : img
                )
            );
        } else {
            console.warn(`Failed to update download count for ${image.id}: ${result.message}`);
        }

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
            <Dialog onOpenChange={(open) => !open && setSelectedImage(null)}>
              <DialogTrigger asChild>
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
                    unoptimized={!!image.imageUrl?.includes('?') || !!image.imageUrl?.includes('&')}
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
                              alt={selectedImage.title || "Selected image"}
                              width={1200}
                              height={800}
                              className="max-w-full max-h-[65vh] object-contain rounded"
                              data-ai-hint={selectedImage.dataAiHint || "wallpaper image"}
                              unoptimized={!!selectedImage.imageUrl?.includes('?') || !!selectedImage.imageUrl?.includes('&')}
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
    </div>
  );
}

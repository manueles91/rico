'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface CameraCaptureProps {
  onPhotoCapture: (file: File) => void;
  onClear: () => void;
  capturedPhoto: File | null;
  isCapturing: boolean;
  className?: string;
}

export function CameraCapture({
  onPhotoCapture,
  onClear,
  capturedPhoto,
  isCapturing,
  className,
}: CameraCaptureProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasCamera, setHasCamera] = useState(true); // Default to true for better UX
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check device type and camera availability
  useEffect(() => {
    // Check if mobile device
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    setIsMobile(/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase()));
    
    // Check camera availability
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          setHasCamera(videoDevices.length > 0);
        })
        .catch(err => {
          console.error('Error checking camera availability:', err);
          // Don't set hasCamera to false on error, as it might be a permission issue
        });
    }
  }, []);

  // Handle file selection from native file picker (fallback for mobile)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Check file size (max 20MB as per OpenAI requirements)
    if (file.size > 20 * 1024 * 1024) {
      alert('File size must be less than 20MB');
      return;
    }

    onPhotoCapture(file);
    
    // Create preview URL
    setPreviewUrl(URL.createObjectURL(file));
  };

  // Handle starting the camera stream
  const startCamera = async () => {
    // For mobile devices, use the native camera
    if (isMobile) {
      fileInputRef.current?.click();
      return;
    }
    
    try {
      if (videoRef.current) {
        const constraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        videoRef.current.srcObject = stream;
        setStream(stream);
        setShowCamera(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Could not access the camera. Please check permissions and try again.');
      
      // Fallback to file input
      fileInputRef.current?.click();
    }
  };

  // Handle stopping the camera stream
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  // Handle taking a photo
  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the video frame to the canvas
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
            onPhotoCapture(file);
            
            // Create preview URL
            setPreviewUrl(URL.createObjectURL(blob));
            
            // Stop the camera
            stopCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  // Handle the clear button
  const handleClear = () => {
    onClear();
    setPreviewUrl(null);
    stopCamera();
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={cn('relative', className)}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={isCapturing}
      />
      
      {capturedPhoto && previewUrl ? (
        <div className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-md overflow-hidden flex-shrink-0">
          <Image
            src={previewUrl}
            alt="Captured photo"
            fill
            className="object-cover"
          />
          <button
            onClick={handleClear}
            className="absolute top-0 right-0 bg-black/70 p-0.5 rounded-bl-md"
            disabled={isCapturing}
            aria-label="Remove photo"
          >
            <X size={12} className="text-white" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={startCamera}
          disabled={isCapturing}
          className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0"
          aria-label="Take photo"
          title="Take a photo"
        >
          <Camera size={16} className="sm:size-[18px]" />
        </Button>
      )}
      
      {/* Camera modal (only shown on desktop) */}
      {showCamera && !isMobile && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg p-4 max-w-md w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">Take a Photo</h3>
              <Button variant="ghost" size="icon" onClick={stopCamera}>
                <X size={18} />
              </Button>
            </div>
            
            <div className="relative aspect-video bg-black rounded-md overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="flex justify-center mt-4">
              <Button onClick={takePhoto} className="px-6">
                Capture
              </Button>
            </div>
            
            {/* Hidden canvas for processing the photo */}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      )}
    </div>
  );
}

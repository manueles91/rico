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
  const [hasCamera, setHasCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Check if camera is available
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setHasCamera(videoDevices.length > 0);
      })
      .catch(err => {
        console.error('Error checking camera availability:', err);
        setHasCamera(false);
      });
  }, []);

  // Handle starting the camera stream
  const startCamera = async () => {
    try {
      if (videoRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        
        videoRef.current.srcObject = stream;
        setStream(stream);
        setShowCamera(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Could not access the camera. Please check permissions and try again.');
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
  };

  return (
    <div className={cn('relative', className)}>
      <input type="hidden" /> {/* Placeholder for form compatibility */}
      
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
          disabled={isCapturing || !hasCamera}
          className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0"
          aria-label="Take photo"
          title={!hasCamera ? "Camera not available" : "Take a photo"}
        >
          <Camera size={16} className="sm:size-[18px]" />
        </Button>
      )}
      
      {/* Camera modal */}
      {showCamera && (
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

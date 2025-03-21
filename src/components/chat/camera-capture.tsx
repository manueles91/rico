'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import NextImage from 'next/image';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClear: () => void;
  capturedImage: File | null;
  isUploading: boolean;
  className?: string;
}

export function CameraCapture({
  onCapture,
  onClear,
  capturedImage,
  isUploading,
  className,
}: CameraCaptureProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      // Try to get the rear camera first
      let stream;
      
      try {
        // First try with exact environment (rear camera) constraint
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: 'environment' } }
        });
      } catch (err) {
        // If that fails, try with a preference for environment but accept any camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
      }
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
      }
      
      setShowCamera(true);
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Could not access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsStreaming(false);
    setShowCamera(false);
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    const context = canvas.getContext('2d');
    if (!context) return;
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to file
    canvas.toBlob((blob) => {
      if (!blob) return;
      
      const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
      onCapture(file);
      
      // Create preview URL
      setPreviewUrl(URL.createObjectURL(blob));
      
      // Stop camera
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  const handleClear = () => {
    onClear();
    setPreviewUrl(null);
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Hidden canvas for capturing photos */}
      <canvas ref={canvasRef} className="hidden" />
      
      {showCamera && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed inset-x-0 top-1/2 -translate-y-1/2 p-4 max-w-md mx-auto">
            <div className="relative bg-card rounded-lg overflow-hidden shadow-lg">
              <video 
                ref={videoRef} 
                className="w-full aspect-[4/3] bg-black"
                autoPlay 
                playsInline
              />
              
              <div className="p-4 flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={stopCamera}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={takePhoto}
                  disabled={isUploading || !isStreaming}
                >
                  Capture
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {capturedImage && previewUrl ? (
        <div className="relative h-11 w-full rounded-md overflow-hidden">
          <NextImage
            src={previewUrl}
            alt="Captured photo"
            fill
            className="object-cover"
          />
          <button
            onClick={handleClear}
            className="absolute top-0 right-0 bg-black/70 p-0.5 rounded-bl-md"
            disabled={isUploading}
            aria-label="Remove photo"
          >
            <X size={12} className="text-white" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={startCamera}
          disabled={isUploading}
          className="w-full h-11 p-0"
          aria-label="Take photo"
          title="Take a photo"
        >
          <Camera size={18} />
        </Button>
      )}
    </div>
  );
}

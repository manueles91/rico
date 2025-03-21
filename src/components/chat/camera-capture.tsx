'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import NextImage from 'next/image';

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if device is mobile
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor;
    if (/android|iPad|iPhone|iPod/i.test(userAgent)) {
      setIsMobile(true);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      alert('Please capture an image');
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

  const handleClear = () => {
    onClear();
    setPreviewUrl(null);
    
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
        capture={isMobile ? 'environment' : undefined}
        className="hidden"
        disabled={isCapturing}
      />
      
      {capturedPhoto && previewUrl ? (
        <div className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-md overflow-hidden flex-shrink-0">
          <NextImage
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
          onClick={() => fileInputRef.current?.click()}
          disabled={isCapturing}
          className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0"
          aria-label="Take photo"
          title="Take a photo"
        >
          <Camera size={16} className="sm:size-[18px]" />
        </Button>
      )}
    </div>
  );
}

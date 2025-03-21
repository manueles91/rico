'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Image, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import NextImage from 'next/image';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onClear: () => void;
  selectedFile: File | null;
  isUploading: boolean;
  className?: string;
}

export function FileUpload({
  onFileSelect,
  onClear,
  selectedFile,
  isUploading,
  className,
}: FileUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    onFileSelect(file);
    
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
    <div className={cn('flex flex-col w-full', className)}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        disabled={isUploading}
      />
      
      {selectedFile && previewUrl ? (
        <div className="relative h-11 w-full rounded-md overflow-hidden mb-2">
          <NextImage
            src={previewUrl}
            alt="Selected file"
            fill
            className="object-cover"
          />
          <button
            onClick={handleClear}
            className="absolute top-0 right-0 bg-black/70 p-0.5 rounded-bl-md"
            disabled={isUploading}
            aria-label="Remove file"
          >
            <X size={12} className="text-white" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full h-11 p-0"
          aria-label="Upload image"
          title="Upload an image"
        >
          <Image size={18} />
        </Button>
      )}
    </div>
  );
}

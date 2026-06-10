import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onUpload: (file: File) => Promise<void>;
  onDelete?: () => Promise<void>;
  className?: string;
}

export function ImageUpload({
  currentImageUrl,
  onUpload,
  onDelete,
  className = '',
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Formato no permitido. Use JPG, PNG o WebP.');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo es demasiado grande. Máximo 5MB.');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload
    setIsUploading(true);
    try {
      await onUpload(file);
      setPreview(null);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsUploading(true);
    try {
      await onDelete();
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const displayUrl = preview || currentImageUrl;

  return (
    <div className={className}>
      <div className="relative w-40 h-40 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
        {isUploading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <LoadingSpinner size="sm" />
          </div>
        )}

        {displayUrl ? (
          <>
            <img
              src={displayUrl}
              alt="Imagen del artículo"
              className="w-full h-full object-cover"
            />
            {!isUploading && onDelete && (
              <button
                onClick={handleDelete}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
            <ImageIcon className="w-10 h-10 mb-2" />
            <span className="text-sm">Sin imagen</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="mt-2 btn-secondary btn-sm w-full"
      >
        <Upload className="w-4 h-4 mr-1" />
        {currentImageUrl ? 'Cambiar' : 'Subir'} imagen
      </button>
    </div>
  );
}

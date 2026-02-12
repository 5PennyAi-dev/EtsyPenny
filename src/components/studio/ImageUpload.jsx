import { Upload } from 'lucide-react';
import { useState, useEffect } from 'react';

const ImageUpload = ({ onFileSelect, initialImage, compact = false }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [preview, setPreview] = useState(initialImage || null);

  // Update preview if initialImage changes
  useEffect(() => {
    if (initialImage) {
        setPreview(initialImage);
    }
  }, [initialImage]);

  const handleFile = (file) => {
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      onFileSelect(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const clearImage = (e) => {
      e.stopPropagation();
      setPreview(null);
      onFileSelect(null);
  };

  return (
    <div 
      className={`relative border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center transition-colors cursor-pointer bg-slate-50 overflow-hidden group
        ${compact ? 'p-4 min-h-[200px]' : 'p-8 min-h-[300px]'}
        ${isDragOver ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400'}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => document.getElementById('fileInput').click()}
    >
      <input 
        type="file" 
        id="fileInput" 
        className="hidden" 
        accept="image/png, image/jpeg" 
        onChange={handleChange}
      />
      
      {preview ? (
        <div className={`relative w-full ${compact ? 'h-40' : 'h-64'}`}>
          <img src={preview} alt="Upload preview" className="w-full h-full object-contain rounded-lg" />
          <button 
             onClick={clearImage}
             className="absolute top-1 right-1 bg-white/90 p-1.5 rounded-full text-slate-500 hover:text-red-500 hover:bg-white shadow-sm transition-all opacity-0 group-hover:opacity-100"
             title="Remove image"
          >
            <Upload size={14} className="rotate-45" /> 
          </button>
        </div>
      ) : (
        <>
          <div className={`rounded-full shadow-sm flex items-center justify-center mb-3 bg-white ${compact ? 'w-12 h-12' : 'w-16 h-16'}`}>
            <Upload size={compact ? 20 : 32} className="text-indigo-600" />
          </div>
          <h3 className={`font-semibold text-slate-900 mb-1 ${compact ? 'text-sm' : 'text-lg'}`}>
            {compact ? 'Upload Product Image' : 'Drag and drop your product image'}
          </h3>
          {!compact && (
            <p className="text-sm text-slate-500 mb-6">
                or click to upload (JPG, PNG)
            </p>
          )}
          <button className={`bg-white border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm pointer-events-none
              ${compact ? 'px-3 py-1.5 text-xs' : 'px-6 py-2 text-sm'}`}>
            Select file
          </button>
        </>
      )}
    </div>
  );
};

export default ImageUpload;

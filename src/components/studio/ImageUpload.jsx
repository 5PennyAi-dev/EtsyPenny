import { Upload } from 'lucide-react';
import { useState } from 'react';

const ImageUpload = ({ onFileSelect }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [preview, setPreview] = useState(null);

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

  return (
    <div 
      className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer bg-slate-50 overflow-hidden
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
        <div className="relative w-full h-48">
          <img src={preview} alt="Upload preview" className="w-full h-full object-contain rounded-lg" />
          <button 
             onClick={(e) => { e.stopPropagation(); setPreview(null); onFileSelect(null); }}
             className="absolute top-2 right-2 bg-white/80 p-1 rounded-full text-slate-700 hover:text-red-600 transition-colors"
          >
            <Upload size={16} className="rotate-45" /> {/* Using rotate-45 Upload as Close icon equivalent for simplicity or verify Lucide */}
          </button>
        </div>
      ) : (
        <>
          <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
            <Upload size={32} className="text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">
            Drag and drop your product image
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            or click to upload (JPG, PNG)
          </p>
          <button className="px-6 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm pointer-events-none">
            Select a file
          </button>
        </>
      )}
    </div>
  );
};

export default ImageUpload;

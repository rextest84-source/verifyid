import { X } from "lucide-react";

export default function ImageLightbox({
  src,
  alt,
  label,
  open,
  onClose,
}: {
  src: string;
  alt: string;
  label?: string;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={label || alt}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <p className="text-sm text-slate-200 truncate">{label || alt}</p>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg text-slate-300 hover:bg-white/10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div
        className="flex-1 flex items-center justify-center p-4 overflow-auto min-h-0"
        onClick={onClose}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-full object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}

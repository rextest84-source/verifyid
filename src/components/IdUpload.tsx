import { useState, useRef } from "react";
import { apiUrl } from "@/lib/api";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Camera, FileImage, CheckCircle2, Loader2 } from "lucide-react";

interface IdUploadProps {
  verificationId: number;
  onComplete: () => void;
}

export default function IdUpload({ verificationId, onComplete }: IdUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraMode, setCameraMode] = useState(false);

  const updateIdMutation = trpc.verification.updateIdDocument.useMutation();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file: File) => {
    setUploading(true);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(apiUrl("/api/upload"), {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        await updateIdMutation.mutateAsync({ id: verificationId, imageUrl: data.url });
        setDone(true);
        onComplete();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const startCamera = async () => {
    setCameraMode(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setCameraMode(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraMode(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "id-document.jpg", { type: "image/jpeg" });
      await processFile(file);
      stopCamera();
    }, "image/jpeg");
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-slate-100">ID Document</h3>
        <p className="text-sm text-slate-400">
          Upload or capture a photo of your government-issued ID.
        </p>
      </div>

      {done ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-green-400" />
          </div>
          <p className="text-slate-300 font-medium">ID Document Uploaded</p>
        </div>
      ) : cameraMode ? (
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 mx-auto max-w-sm">
            <video ref={videoRef} className="w-full aspect-[3/4] object-cover" playsInline muted />
          </div>
          <div className="flex justify-center gap-3">
            <Button variant="outline" className="border-slate-700 text-slate-300" onClick={stopCamera}>
              Cancel
            </Button>
            <Button className="bg-sky-500 hover:bg-sky-600 text-white" onClick={capturePhoto}>
              <Camera className="w-4 h-4 mr-2" />
              Capture
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {preview && (
            <div className="mx-auto max-w-sm rounded-xl overflow-hidden border border-slate-700">
              <img src={preview} alt="ID Preview" className="w-full object-cover" />
            </div>
          )}

          <div className="flex flex-col items-center gap-3">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="border-slate-700 text-slate-300"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileImage className="w-4 h-4 mr-2" />
                )}
                Choose File
              </Button>
              <Button
                variant="outline"
                className="border-slate-700 text-slate-300"
                onClick={startCamera}
                disabled={uploading}
              >
                <Camera className="w-4 h-4 mr-2" />
                Use Camera
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

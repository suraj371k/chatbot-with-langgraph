"use client";

import * as React from "react";
import { UploadCloud, FileText, X, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export interface FileUploaderProps {
  /** Comma-separated list of accepted extensions, e.g. ".pdf,.doc,.docx" */
  accept?: string;
  /** Maximum allowed file size, in MB */
  maxSizeMB?: number;
  /** Disables all interaction (e.g. while parent is busy for another reason) */
  disabled?: boolean;
  /** Called with a freshly picked/dropped file once it passes validation */
  onFileSelected: (file: File) => void;
  /** The file currently staged/uploading, controlled by the parent */
  file?: File | null;
  /** Clears the currently staged file */
  onClear?: () => void;
  /** Whether an upload is in progress for `file` */
  uploading?: boolean;
  /** Upload progress, 0-100 */
  progress?: number;
  /** Short label shown inside the dropzone */
  label?: string;
  /** Helper copy shown under the label */
  helperText?: string;
  className?: string;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Reusable drag-and-drop / click-to-browse file picker with client-side
 * validation, a staged-file preview, and an upload progress bar.
 * The component itself never performs the upload — it hands a validated
 * `File` back to the parent via `onFileSelected` and reflects `uploading`
 * / `progress` state that the parent controls.
 */
export function FileUploader({
  accept = "*",
  maxSizeMB = 20,
  disabled = false,
  onFileSelected,
  file,
  onClear,
  uploading = false,
  progress = 0,
  label = "Drag & drop a file here, or click to browse",
  helperText,
  className,
}: FileUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const allowedExts = React.useMemo(
    () =>
      accept === "*"
        ? null
        : accept
            .split(",")
            .map((ext) => ext.trim().toLowerCase())
            .filter(Boolean),
    [accept],
  );

  const defaultHelperText = allowedExts
    ? `${allowedExts.map((e) => e.replace(".", "").toUpperCase()).join(", ")} up to ${maxSizeMB}MB`
    : `Up to ${maxSizeMB}MB`;

  const validate = (candidate: File): string | null => {
    const ext = `.${candidate.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (allowedExts && !allowedExts.includes(ext)) {
      return `"${ext}" isn't supported. Allowed types: ${allowedExts.join(", ")}`;
    }
    if (candidate.size > maxSizeMB * 1024 * 1024) {
      return `File is too large. Maximum size is ${maxSizeMB}MB.`;
    }
    return null;
  };

  const handleFiles = (fileList: FileList | null) => {
    if (disabled || uploading || !fileList || fileList.length === 0) return;
    const candidate = fileList[0];
    const validationError = validate(candidate);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onFileSelected(candidate);
  };

  const openBrowser = () => {
    if (disabled || uploading) return;
    inputRef.current?.click();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (uploading) return;
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
    onClear?.();
  };

  return (
    <div className={cn("w-full", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept === "*" ? undefined : accept}
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => {
          handleFiles(e.target.files);
          // allow re-selecting the same file later
          e.target.value = "";
        }}
      />

      {!file ? (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          onClick={openBrowser}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openBrowser();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors outline-none",
            "focus-visible:ring-3 focus-visible:ring-ring/50",
            disabled
              ? "cursor-not-allowed border-border bg-muted/30 opacity-50"
              : "cursor-pointer border-border hover:border-primary/50 hover:bg-muted/40",
            isDragging && "border-primary bg-primary/5",
          )}
        >
          <UploadCloud
            className={cn(
              "h-8 w-8",
              isDragging ? "text-primary" : "text-muted-foreground",
            )}
          />
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">
            {helperText ?? defaultHelperText}
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(file.size)}
            </p>
            {uploading && (
              <div className="mt-2 flex items-center gap-2">
                <Progress value={progress} className="h-1.5" />
                <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {progress}%
                </span>
              </div>
            )}
          </div>
          {uploading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              aria-label="Remove file"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

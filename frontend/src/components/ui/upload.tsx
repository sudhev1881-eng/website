"use client";

import * as React from "react";
import { UploadCloud, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface UploadProps {
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
  label?: string;
  helperText?: string;
  className?: string;
  onUpload?: (files: File[]) => void;
}

export function Upload({
  accept,
  maxSize = 10 * 1024 * 1024,
  multiple = false,
  disabled = false,
  label = "Upload file",
  helperText,
  className,
  onUpload,
}: UploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [files, setFiles] = React.useState<File[]>([]);
  const [dragOver, setDragOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const processFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const incoming = Array.from(fileList);
    const oversized = incoming.find((file) => file.size > maxSize);

    if (oversized) {
      setError(`File "${oversized.name}" exceeds ${formatFileSize(maxSize)} limit.`);
      return;
    }

    setError(null);
    const next = multiple ? [...files, ...incoming] : incoming;
    setFiles(next);
    onUpload?.(next);
  };

  const removeFile = (index: number) => {
    const next = files.filter((_, i) => i !== index);
    setFiles(next);
    onUpload?.(next);
  };

  return (
    <div className={cn("w-full space-y-3", className)}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!disabled) processFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-surface p-6 text-center transition-colors",
          dragOver && "border-primary bg-primary/5",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <UploadCloud className="h-8 w-8 text-muted-foreground" />
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Drag and drop or click to browse
          </p>
          {helperText ? (
            <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => processFiles(e.target.files)}
        />
      </div>

      {error ? (
        <p className="text-xs text-error" role="alert">
          {error}
        </p>
      ) : null}

      {files.length > 0 ? (
        <ul className="space-y-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3"
            >
              <FileText className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove ${file.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

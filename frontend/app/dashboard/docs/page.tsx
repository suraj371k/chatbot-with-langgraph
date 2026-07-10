"use client";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { FileUploader } from "@/components/file-uploader";
import { DocumentsPagination } from "@/components/documents-pagination";
import { useDocStore } from "@/store/docStore";
import React, { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow, parseISO, format } from "date-fns";
import {
  Trash2,
  Edit2,
  MessageCircle,
  FileText,
  Inbox,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/store/chatStore";
import isAuth from "@/utils/isAuth";

const statusStyles: Record<string, string> = {
  uploaded: "bg-blue-50 text-blue-700 border-blue-200",
  processing: "bg-amber-50 text-amber-700 border-amber-200",
  embedded: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-700 border-red-200",
};

const TOTAL_COLUMNS = 6;

// Keep in sync with the backend's ALLOWED_EXTENSIONS (app/routers/document.py)
const ACCEPTED_FILE_TYPES = ".pdf,.doc,.docx";
const MAX_UPLOAD_SIZE_MB = 20;

const Documents = () => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [renameTarget, setRenameTarget] = useState<{
    id: string;
    filename: string;
  } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    filename: string;
  } | null>(null);
  const [savingRename, setSavingRename] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const {
    fetchDocuments,
    loading,
    documents,
    page,
    totalPages,
    total,
    limit,
    goToPage,
    deleteDocument,
    deletingId,
    updatingId,
    updateDocumentName,
    uploadDocument,
    uploading,
    uploadProgress,
  } = useDocStore();

  const { setDocumentsIds, resetConversation } = useChatStore();

  const router = useRouter();

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handlePageChange = (nextPage: number) => {
    setSelectedIds(new Set());
    goToPage(nextPage);
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((prev) =>
      prev.size === documents.length
        ? new Set()
        : new Set(documents.map((d) => d.id)),
    );
  };

  const allSelected =
    documents.length > 0 && selectedIds.size === documents.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const openRenameDialog = (id: string, currentFilename: string) => {
    setRenameTarget({ id, filename: currentFilename });
    setRenameValue(currentFilename);
  };

  const handleRenameSubmit = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    setSavingRename(true);
    try {
      const ok = await updateDocumentName(renameTarget.id, renameValue.trim());
      if (ok) {
        toast.success("Filename updated");
        setRenameTarget(null);
      } else {
        toast.error("Failed to update filename");
      }
    } finally {
      setSavingRename(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const ok = await deleteDocument(deleteTarget.id);
    if (ok) {
      toast.success("Document deleted");
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
    } else {
      toast.error("Failed to delete document");
    }
    setDeleteTarget(null);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await deleteDocument(id);
    }
    setSelectedIds(new Set());
    toast.success(`${ids.length} document(s) deleted`);
  };

  const handleMultiDocumentChat = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setDocumentsIds(ids);
    resetConversation();
    setDocumentsIds(ids);
    router.push("/dashboard/chat");
  };

  // Selecting/dropping a valid file immediately kicks off the upload;
  // the FileUploader component only ever hands us files that already
  // passed its client-side type/size validation.
  const handleFileSelected = useCallback(
    async (file: File) => {
      setPendingFile(file);
      try {
        const result = await uploadDocument(file);
        if (result) {
          toast.success(`"${file.name}" uploaded successfully`);
          setPendingFile(null);
        } else {
          toast.error("Failed to upload document");
        }
      } catch (error) {
        console.error(`error in uploading: ${error}`);
        toast.error("Something went wrong while uploading");
      }
    },
    [uploadDocument],
  );

  const handleClearPendingFile = () => {
    if (uploading) return;
    setPendingFile(null);
  };

  return (
    <div className="rounded-lg container mx-auto max-w-5xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Upload file */}
      <div className="border-b border-border p-4">
        <FileUploader
          accept={ACCEPTED_FILE_TYPES}
          maxSizeMB={MAX_UPLOAD_SIZE_MB}
          file={pendingFile}
          onFileSelected={handleFileSelected}
          onClear={handleClearPendingFile}
          uploading={uploading}
          progress={uploadProgress}
          label="Drag & drop a document, or click to browse"
          helperText={`PDF, DOC, DOCX up to ${MAX_UPLOAD_SIZE_MB}MB`}
        />
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b border-border">
          <div className="flex items-center  gap-2 text-sm font-medium">
            <span>{selectedIds.size} selected</span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete selected
            </Button>
            <Button
              onClick={handleMultiDocumentChat}
              aria-label="chat"
              variant={"ghost"}
            >
              <MessageCircle />
            </Button>
          </div>
        </div>
      )}

      <TooltipProvider delayDuration={200}>
        <Table>
          <TableCaption className="pb-4">Your Documents</TableCaption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    allSelected ? true : someSelected ? "indeterminate" : false
                  }
                  onCheckedChange={toggleAll}
                  aria-label="Select all documents"
                />
              </TableHead>
              <TableHead className="w-[35%]">Filename</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell>
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </TableCell>
                </TableRow>
              ))}

            {!loading && documents.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={TOTAL_COLUMNS} className="p-0">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground py-16">
                    <Inbox className="h-8 w-8 opacity-40" />
                    <p className="text-sm">No documents uploaded yet</p>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              documents.map((doc) => {
                const createdDate = parseISO(doc.created_at);
                const isDeleting = deletingId === doc.id;
                const isUpdating = updatingId === doc.id;

                return (
                  <TableRow key={doc.id} className="group">
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(doc.id)}
                        onCheckedChange={() => toggleRow(doc.id)}
                        aria-label={`Select ${doc.filename}`}
                      />
                    </TableCell>

                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-70">
                          {isUpdating ? (
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Saving…
                            </span>
                          ) : (
                            doc.filename.split(".").at(0)
                          )}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="uppercase text-xs font-medium text-muted-foreground tracking-wide">
                        {doc.content_type.split("/").at(1)}
                      </span>
                    </TableCell>

                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-sm text-muted-foreground cursor-default">
                            {formatDistanceToNow(createdDate, {
                              addSuffix: true,
                            })}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {format(createdDate, "PPpp")}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "capitalize font-normal",
                          statusStyles[doc.status],
                        )}
                      >
                        {doc.status}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Button
                          onClick={() => {
                            setDocumentsIds([doc.id]);
                            router.push(`/dashboard/chat`);
                          }}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Chat with document"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Rename document"
                          onClick={() => openRenameDialog(doc.id, doc.filename)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>

                        {isDeleting ? (
                          <div className="h-8 w-8 flex items-center justify-center">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-destructive hover:bg-destructive/10"
                            aria-label="Delete document"
                            onClick={() =>
                              setDeleteTarget({
                                id: doc.id,
                                filename: doc.filename,
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>

        {/* pagination */}
        <DocumentsPagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          loading={loading}
          onPageChange={handlePageChange}
        />
      </TooltipProvider>

      {/* Rename dialog */}
      <Dialog
        open={!!renameTarget}
        onOpenChange={(open) => !open && setRenameTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename document</DialogTitle>
            <DialogDescription>
              Enter a new name for this document.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Document name"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameSubmit();
            }}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameTarget(null)}
              disabled={savingRename}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameSubmit}
              disabled={savingRename || !renameValue.trim()}
            >
              {savingRename ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.filename}
              </span>{" "}
              and its associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default isAuth(Documents);

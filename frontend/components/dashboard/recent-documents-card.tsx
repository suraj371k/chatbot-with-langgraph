"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, parseISO } from "date-fns";
import { FileText, ArrowRight, Inbox, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export interface RecentDocument {
  id: string;
  filename: string;
  content_type: string;
  status: "uploaded" | "failed" | "embedded" | "processing";
  created_at: string;
}

const statusStyles: Record<string, string> = {
  uploaded: "bg-blue-50 text-blue-700 border-blue-200",
  processing: "bg-amber-50 text-amber-700 border-amber-200",
  embedded: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-700 border-red-200",
};

interface RecentDocumentsCardProps {
  documents: RecentDocument[];
  loading: boolean;
}

/** Preview of the most recently uploaded documents, with a link through to
 * the full documents page rather than rendering every document here. */
export function RecentDocumentsCard({
  documents,
  loading,
}: RecentDocumentsCardProps) {
  const router = useRouter();

  return (
    <div className="rounded-xl border border-border bg-card ring-1 ring-foreground/5">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <p className="text-sm font-medium">Recent documents</p>
          <p className="text-xs text-muted-foreground">
            Your latest uploads across the workspace
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="gap-1 text-xs"
          onClick={() => router.push("/dashboard/docs")}
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="divide-y divide-border">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}

        {!loading && documents.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <Inbox className="h-7 w-7 opacity-40" />
            <p className="text-sm">No documents uploaded yet</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-1 gap-1.5"
              asChild
            >
              <Link href="/dashboard/docs">
                <UploadCloud className="h-3.5 w-3.5" />
                Upload your first document
              </Link>
            </Button>
          </div>
        )}

        {!loading &&
          documents.map((doc) => (
            <Link
              key={doc.id}
              href="/dashboard/docs"
              className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/40"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {doc.filename.split(".").slice(0, -1).join(".") ||
                    doc.filename}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(parseISO(doc.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "shrink-0 text-[11px] font-normal capitalize",
                  statusStyles[doc.status],
                )}
              >
                {doc.status}
              </Badge>
            </Link>
          ))}
      </div>
    </div>
  );
}

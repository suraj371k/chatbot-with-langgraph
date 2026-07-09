import { api } from "@/lib/api";
import { create } from "zustand";
import axios from "axios";

type Status = "uploaded" | "failed" | "embedded" | "processing";

interface DocumentResponse {
  id: string;
  user_id: string;
  filename: string;
  content_type: string;
  status: Status;
  size: number;
  created_at: string;
}

interface DocumentListResponse {
  documents: DocumentResponse[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_more: boolean;
}

interface UploadResponse {
  id: string;
  filename: string;
  status: Status;
  message: string;
}

interface DocumentState {
  documents: DocumentResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;

  loading: boolean;
  uploading: boolean;
  uploadProgress: number;
  deletingId: string | null;
  updatingId: string | null;
  error: null | string;

  fetchDocuments: (page?: number) => Promise<void>;
  nextPage: () => Promise<void>;
  previousPage: () => Promise<void>;
  goToPage: (page: number) => Promise<void>;

  uploadDocument: (file: File) => Promise<UploadResponse | null>;
  deleteDocument: (documentId: string) => Promise<boolean>;
  updateDocumentName: (
    documentId: string,
    filename: string,
  ) => Promise<boolean>;

  clearError: () => void;
}

export const useDocStore = create<DocumentState>((set, get) => ({
  documents: [],
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
  hasMore: false,

  loading: false,
  uploading: false,
  uploadProgress: 0,
  deletingId: null,
  updatingId: null,
  error: null,

  fetchDocuments: async (page = 1) => {
    try {
      set({ loading: true, error: null });
      const { limit } = get();

      const res = await api.get<DocumentListResponse>("/api/document", {
        params: { page, limit },
      });

      set({
        documents: res.data.documents,
        page: res.data.page,
        limit: res.data.limit,
        total: res.data.total,
        totalPages: res.data.total_pages,
        hasMore: res.data.has_more,
        loading: false,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.detail ?? "Failed to load documents.";
        set({ error: message, loading: false });
      } else {
        set({ error: "something went wrong", loading: false });
      }
    }
  },

  nextPage: async () => {
    const { page, totalPages, fetchDocuments, loading } = get();
    if (loading || page >= totalPages) return;
    await fetchDocuments(page + 1);
  },

  previousPage: async () => {
    const { page, fetchDocuments, loading } = get();
    if (loading || page <= 1) return;
    await fetchDocuments(page - 1);
  },

  goToPage: async (page: number) => {
    const { totalPages, loading } = get();
    if (loading || page < 1 || (totalPages > 0 && page > totalPages)) return;
    await get().fetchDocuments(page);
  },

  uploadDocument: async (file: File) => {
    try {
      set({ uploading: true, uploadProgress: 0, error: null });

      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post<UploadResponse>(
        "/api/document/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            const total = progressEvent.total;
            const percent = total
              ? Math.round((progressEvent.loaded * 100) / total)
              : 0;
            set({ uploadProgress: percent });
          },
        },
      );

      set({ uploading: false, uploadProgress: 100 });
      await get().fetchDocuments(1);
      return res.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.detail ?? "Failed to upload document.";
        set({ error: message, uploading: false, uploadProgress: 0 });
      } else {
        set({ error: "something went wrong", uploading: false, uploadProgress: 0 });
      }
      return null;
    }
  },

  deleteDocument: async (documentId: string) => {
    try {
      set({ deletingId: documentId, error: null });
      await api.delete(`/api/document/${documentId}`);
      set({ deletingId: null });

      const { page, documents, fetchDocuments } = get();
      if (documents.length === 1 && page > 1) {
        await fetchDocuments(page - 1);
      } else {
        await fetchDocuments(page);
      }
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.detail ?? "Failed to delete document.";
        set({ error: message, deletingId: null });
      } else {
        set({ error: "something went wrong", deletingId: null });
      }
      return false;
    }
  },

  updateDocumentName: async (documentId: string, filename: string) => {
    try {
      set({ updatingId: documentId, error: null });
      await api.put(`/api/document/${documentId}`, { filename });

      set((state) => ({
        documents: state.documents.map((doc) =>
          doc.id === documentId ? { ...doc, filename } : doc,
        ),
        updatingId: null,
      }));
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.detail ?? "Failed to update document.";
        set({ error: message, updatingId: null });
      } else {
        set({ error: "something went wrong", updatingId: null });
      }
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));

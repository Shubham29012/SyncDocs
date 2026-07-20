"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "@/lib/api/client";
import toast from "react-hot-toast";

export function useDocument(id: string) {
  return useQuery({
    queryKey: ["document", id],
    queryFn: () => documentsApi.get(id),
    enabled: !!id,
    staleTime: 30_000,
    retry: 2,
  });
}

export function useDocuments(filter?: string) {
  return useQuery({
    queryKey: ["documents", filter],
    queryFn: () => documentsApi.list({ filter }),
    staleTime: 30_000,
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title?: string) => documentsApi.create({ title: title ?? "Untitled Document" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: () => {
      toast.error("Failed to create document");
    },
  });
}

export function useUpdateDocument(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title?: string; isArchived?: boolean; isStarred?: boolean }) =>
      documentsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document", id] });
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: () => {
      toast.error("Failed to update document");
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document deleted");
    },
    onError: () => {
      toast.error("Failed to delete document");
    },
  });
}

export function useDuplicateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentsApi.duplicate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document duplicated");
    },
    onError: () => {
      toast.error("Failed to duplicate document");
    },
  });
}

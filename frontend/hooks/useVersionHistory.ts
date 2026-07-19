"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { versionsApi } from "@/lib/api/client";
import toast from "react-hot-toast";

export function useVersionHistory(docId: string) {
  return useQuery({
    queryKey: ["versions", docId],
    queryFn: () => versionsApi.list(docId),
    enabled: !!docId,
    staleTime: 60_000,
  });
}

export function useVersion(docId: string, vId: string) {
  return useQuery({
    queryKey: ["version", docId, vId],
    queryFn: () => versionsApi.get(docId, vId),
    enabled: !!docId && !!vId,
  });
}

export function useCreateVersion(docId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (label?: string) => versionsApi.create(docId, { label }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["versions", docId] });
      toast.success("Version snapshot created");
    },
    onError: () => {
      toast.error("Failed to create version");
    },
  });
}

export function useRestoreVersion(docId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vId: string) => versionsApi.restore(docId, vId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document", docId] });
      qc.invalidateQueries({ queryKey: ["versions", docId] });
      toast.success("Document restored to selected version");
    },
    onError: () => {
      toast.error("Failed to restore version");
    },
  });
}

export function useDeleteVersion(docId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vId: string) => versionsApi.delete(docId, vId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["versions", docId] });
      toast.success("Version deleted");
    },
    onError: () => {
      toast.error("Failed to delete version");
    },
  });
}

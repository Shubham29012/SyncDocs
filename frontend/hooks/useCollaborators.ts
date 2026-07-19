"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collaboratorsApi } from "@/lib/api/client";
import toast from "react-hot-toast";

export function useCollaborators(docId: string) {
  return useQuery({
    queryKey: ["collaborators", docId],
    queryFn: () => collaboratorsApi.list(docId),
    enabled: !!docId,
    staleTime: 30_000,
  });
}

export function useInviteCollaborator(docId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; role: "EDITOR" | "VIEWER" }) =>
      collaboratorsApi.invite(docId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collaborators", docId] });
      toast.success("Collaborator invited");
    },
    onError: (err: any) => {
      toast.error(err?.body?.error ?? "Failed to invite collaborator");
    },
  });
}

export function useUpdateCollaboratorRole(docId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "EDITOR" | "VIEWER" }) =>
      collaboratorsApi.updateRole(docId, userId, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collaborators", docId] });
      toast.success("Role updated");
    },
    onError: () => {
      toast.error("Failed to update role");
    },
  });
}

export function useRemoveCollaborator(docId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => collaboratorsApi.remove(docId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collaborators", docId] });
      toast.success("Collaborator removed");
    },
    onError: () => {
      toast.error("Failed to remove collaborator");
    },
  });
}

import { useState } from "react";
import { KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { Pipeline, PipelineStage, TenantProject, TenantUser } from "@/components/org-admin/org-admin.types";

export function useOrgAdminState() {
  const [activeTab, setActiveTab] = useState("team");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<TenantUser | null>(null);
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);
  const [roleChangeUser, setRoleChangeUser] = useState<{ user: TenantUser; newRole: string } | null>(null);

  const [isPipelineDialogOpen, setIsPipelineDialogOpen] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [pipelineToDelete, setPipelineToDelete] = useState<Pipeline | null>(null);
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null);
  const [stageToDelete, setStageToDelete] = useState<PipelineStage | null>(null);
  const [deletingStageId, setDeletingStageId] = useState<string | null>(null);

  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<TenantProject | null>(null);
  const [projectToArchive, setProjectToArchive] = useState<TenantProject | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<TenantProject | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return {
    activeTab,
    deletingStageId,
    editingPipeline,
    editingProject,
    editingStage,
    editingUser,
    isCreateUserDialogOpen,
    isInviteDialogOpen,
    isPipelineDialogOpen,
    isProjectDialogOpen,
    isStageDialogOpen,
    pipelineToDelete,
    projectToArchive,
    projectToDelete,
    roleChangeUser,
    selectedPipelineId,
    sensors,
    setActiveTab,
    setDeletingStageId,
    setEditingPipeline,
    setEditingProject,
    setEditingStage,
    setEditingUser,
    setIsCreateUserDialogOpen,
    setIsInviteDialogOpen,
    setIsPipelineDialogOpen,
    setIsProjectDialogOpen,
    setIsStageDialogOpen,
    setPipelineToDelete,
    setProjectToArchive,
    setProjectToDelete,
    setRoleChangeUser,
    setSelectedPipelineId,
    setStageToDelete,
    setUserToRemove,
    stageToDelete,
    userToRemove,
  };
}

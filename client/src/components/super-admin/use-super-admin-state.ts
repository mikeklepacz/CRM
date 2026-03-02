import { useState } from "react";
import type { SortDirection, SortField, Tenant, UserWithMemberships } from "@/components/super-admin/super-admin.types";

export function useSuperAdminState() {
  const [activeTab, setActiveTab] = useState("tenants");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [viewingTenantId, setViewingTenantId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithMemberships | null>(null);
  const [isAddToTenantOpen, setIsAddToTenantOpen] = useState(false);

  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [userStatusFilter, setUserStatusFilter] = useState<"active" | "inactive">("active");
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const [isEditingUser, setIsEditingUser] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [editingAllowedModules, setEditingAllowedModules] = useState<string[]>([]);

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketReplyMessage, setTicketReplyMessage] = useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>("all");
  const [ticketCategoryFilter, setTicketCategoryFilter] = useState<string>("all");
  const [ticketTenantFilter, setTicketTenantFilter] = useState<string>("all");

  const [configTenantId, setConfigTenantId] = useState<string>("all");

  return {
    activeTab,
    configTenantId,
    confirmPassword,
    editingAllowedModules,
    editingTenant,
    isAddToTenantOpen,
    isCreateDialogOpen,
    isCreateUserDialogOpen,
    isEditingUser,
    isResettingPassword,
    newPassword,
    searchQuery,
    selectedTicketId,
    selectedUser,
    setActiveTab,
    setConfigTenantId,
    setConfirmPassword,
    setEditingAllowedModules,
    setEditingTenant,
    setIsAddToTenantOpen,
    setIsCreateDialogOpen,
    setIsCreateUserDialogOpen,
    setIsEditingUser,
    setIsResettingPassword,
    setNewPassword,
    setSearchQuery,
    setSelectedTicketId,
    setSelectedUser,
    setSortDirection,
    setSortField,
    setTenantFilter,
    setTicketCategoryFilter,
    setTicketReplyMessage,
    setTicketStatusFilter,
    setTicketTenantFilter,
    setUserStatusFilter,
    setViewingTenantId,
    sortDirection,
    sortField,
    tenantFilter,
    ticketCategoryFilter,
    ticketReplyMessage,
    ticketStatusFilter,
    ticketTenantFilter,
    userStatusFilter,
    viewingTenantId,
  };
}

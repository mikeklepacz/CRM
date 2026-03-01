import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AVAILABLE_MODULES } from "@/lib/modules";
import {
  addUserToTenantSchema,
  createUserSchema,
  editUserSchema,
  tenantFormSchema,
  type AddUserToTenantFormData,
  type CreateUserFormData,
  type EditUserFormData,
  type TenantFormData,
} from "@/components/super-admin/super-admin.forms";
import type { Tenant, UserWithMemberships } from "@/components/super-admin/super-admin.types";

interface UseSuperAdminFormsProps {
  editingTenant: Tenant | null;
  isAddToTenantOpen: boolean;
  isCreateUserDialogOpen: boolean;
  isEditingUser: boolean;
  selectedUser: UserWithMemberships | null;
  setEditingAllowedModules: (modules: string[]) => void;
  setSelectedUser: (user: UserWithMemberships | null) => void;
  usersData?: { users?: UserWithMemberships[] };
}

export function useSuperAdminForms(props: UseSuperAdminFormsProps) {
  const createForm = useForm<TenantFormData>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      status: "active",
    },
  });

  const editForm = useForm<TenantFormData>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      status: "active",
    },
  });

  const addUserToTenantForm = useForm<AddUserToTenantFormData>({
    resolver: zodResolver(addUserToTenantSchema),
    defaultValues: {
      tenantId: "",
      roleInTenant: "agent",
    },
  });

  const createUserForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      agentName: "",
      password: "",
      tenantId: "",
      roleInTenant: "agent",
    },
  });

  const editUserForm = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      agentName: "",
    },
  });

  useEffect(() => {
    if (props.editingTenant) {
      editForm.reset({
        name: props.editingTenant.name,
        slug: props.editingTenant.slug,
        status: props.editingTenant.status as "active" | "trial" | "suspended",
      });
      const currentAllowed = props.editingTenant.settings?.allowedModules;
      const allModuleIds = AVAILABLE_MODULES.map((m) => m.id);
      props.setEditingAllowedModules(currentAllowed && currentAllowed.length > 0 ? currentAllowed : allModuleIds);
    }
  }, [props.editingTenant, editForm, props.setEditingAllowedModules]);

  useEffect(() => {
    if (props.isAddToTenantOpen) {
      addUserToTenantForm.reset({
        tenantId: "",
        roleInTenant: "agent",
      });
    }
  }, [props.isAddToTenantOpen, addUserToTenantForm]);

  useEffect(() => {
    if (props.selectedUser && props.usersData?.users) {
      const freshUser = props.usersData.users.find((u) => u.id === props.selectedUser?.id);
      if (freshUser && JSON.stringify(freshUser) !== JSON.stringify(props.selectedUser)) {
        props.setSelectedUser(freshUser);
      }
    }
  }, [props.usersData, props.selectedUser, props.setSelectedUser]);

  useEffect(() => {
    if (props.selectedUser && props.isEditingUser) {
      editUserForm.reset({
        email: props.selectedUser.email || "",
        firstName: props.selectedUser.firstName || "",
        lastName: props.selectedUser.lastName || "",
        agentName: props.selectedUser.agentName || "",
      });
    }
  }, [props.selectedUser, props.isEditingUser, editUserForm]);

  useEffect(() => {
    if (props.isCreateUserDialogOpen) {
      createUserForm.reset({
        email: "",
        firstName: "",
        lastName: "",
        agentName: "",
        password: "",
        tenantId: "",
        roleInTenant: "agent",
      });
    }
  }, [props.isCreateUserDialogOpen, createUserForm]);

  return {
    addUserToTenantForm,
    createForm,
    createUserForm,
    editForm,
    editUserForm,
  };
}

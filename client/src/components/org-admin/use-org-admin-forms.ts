import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createUserFormSchema,
  inviteFormSchema,
  pipelineFormSchema,
  projectFormSchema,
  settingsFormSchema,
  stageFormSchema,
  type CreateUserFormData,
  type InviteFormData,
  type PipelineFormData,
  type ProjectFormData,
  type SettingsFormData,
  type StageFormData,
} from "@/components/org-admin/org-admin-constants";

export function useOrgAdminForms(props: any) {
  const p = props;

  const inviteForm = useForm<InviteFormData>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      role: "agent",
    },
  });

  const createUserForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      password: "",
      role: "agent",
    },
  });

  const settingsForm = useForm<SettingsFormData>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      companyName: "",
      timezone: "",
    },
  });

  const pipelineForm = useForm<PipelineFormData>({
    resolver: zodResolver(pipelineFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      pipelineType: "sales",
      description: "",
      aiPromptTemplate: "",
      voiceAgentId: "",
      isActive: true,
    },
  });

  const stageForm = useForm<StageFormData>({
    resolver: zodResolver(stageFormSchema),
    defaultValues: {
      name: "",
      stageType: "action",
      isTerminal: false,
    },
  });

  const projectForm = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      projectType: "campaign",
      description: "",
      accentColor: "#6366f1",
    },
  });

  useEffect(() => {
    if (p.settingsData?.tenant?.settings) {
      settingsForm.reset({
        companyName: p.settingsData.tenant.settings.companyName || "",
        timezone: p.settingsData.tenant.settings.timezone || "",
      });
    }
  }, [p.settingsData, settingsForm]);

  return {
    createUserForm,
    inviteForm,
    pipelineForm,
    projectForm,
    settingsForm,
    stageForm,
  };
}

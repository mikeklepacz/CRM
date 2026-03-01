import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTwilioVoip } from "@/hooks/useTwilioVoip";
import { StoreDetailsHeader } from "./store-details/header";
import { StoreDetailsFooter } from "./store-details/footer";
import { BasicInformationCard } from "./store-details/basic-information-card";
import { ContactInformationCard } from "./store-details/contact-information-card";
import { LocationCard } from "./store-details/location-card";
import { AdditionalDetailsCard } from "./store-details/additional-details-card";
import { NotesCard } from "./store-details/notes-card";
import { QuickReminderCard } from "./store-details/quick-reminder-card";
import { useStoreDetailsMutations } from "./store-details/use-store-details-mutations";
import type { StoreFormData } from "./store-details/types";

export default function StoreDetails() {
  const { storeId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const voip = useTwilioVoip();

  const [formData, setFormData] = useState<StoreFormData>({
    name: "",
    type: "",
    link: "",
    about: "",
    member_since: "",
    address: "",
    city: "",
    state: "",
    phone: "",
    website: "",
    email: "",
    followers: "",
    hours: "",
    vibe_score: "",
    sales_ready_summary: "",
  });

  const [newNote, setNewNote] = useState("");
  const [isFollowUp, setIsFollowUp] = useState(false);

  const { data: storeData, isLoading } = useQuery({
    queryKey: ["store-details", storeId],
    queryFn: async () => await apiRequest("GET", `/api/store/${storeId}`),
    enabled: !!storeId,
  });

  const { data: notesData = [] } = useQuery<any[]>({
    queryKey: ["/api/clients", storeId, "notes"],
    enabled: !!storeId,
  });

  const { data: userPreferences } = useQuery<any>({ queryKey: ["/api/user/preferences"] });

  useEffect(() => {
    if (storeData) {
      setFormData({
        name: storeData.name || "",
        type: storeData.type || "",
        link: storeData.link || "",
        about: storeData.about || "",
        member_since: storeData.member_since || "",
        address: storeData.address || "",
        city: storeData.city || "",
        state: storeData.state || "",
        phone: storeData.phone || "",
        website: storeData.website || "",
        email: storeData.email || "",
        followers: storeData.followers || "",
        hours: storeData.hours || "",
        vibe_score: storeData["Vibe Score"] || "",
        sales_ready_summary: storeData["Sales-ready Summary"] || "",
      });
    }
  }, [storeData]);

  const { saveMutation, addNoteMutation, createReminderMutation } = useStoreDetailsMutations({
    storeId,
    formData,
    newNote,
    isFollowUp,
    storeData,
    toast,
    setNewNote,
    setIsFollowUp,
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleAddNote = () => {
    if (!newNote.trim()) {
      toast({ title: "Error", description: "Note cannot be empty", variant: "destructive" });
      return;
    }
    addNoteMutation.mutate();
  };

  const handleSaveReminder = (reminderData: any) => {
    createReminderMutation.mutate(reminderData);
  };

  const handleCall = () => {
    const pocPhone = storeData?.["POC Phone"] || storeData?.["poc phone"] || storeData?.["poc_phone"];
    const regularPhone = formData.phone;
    const phoneToCall = pocPhone || regularPhone;

    if (!phoneToCall) {
      toast({ title: "No Phone Number", description: "No phone number available for this store", variant: "destructive" });
      return;
    }

    voip.makeCall(phoneToCall, { storeName: formData.name || "Unknown Store", storeLink: formData.link || undefined });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <StoreDetailsHeader formData={formData} onBack={() => setLocation("/clients")} />

      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 max-w-5xl pb-32">
          <div className="grid gap-6">
            <BasicInformationCard formData={formData} onInputChange={handleInputChange} />
            <ContactInformationCard formData={formData} onInputChange={handleInputChange} />
            <LocationCard formData={formData} onInputChange={handleInputChange} />
            <AdditionalDetailsCard formData={formData} onInputChange={handleInputChange} />
            <NotesCard
              notesData={notesData}
              newNote={newNote}
              isFollowUp={isFollowUp}
              isAddingNote={addNoteMutation.isPending}
              onNewNoteChange={setNewNote}
              onFollowUpChange={setIsFollowUp}
              onAddNote={handleAddNote}
            />
            <QuickReminderCard formData={formData} storeData={storeData} userPreferences={userPreferences} isSaving={createReminderMutation.isPending} onSaveReminder={handleSaveReminder} />
          </div>
        </div>
      </div>

      <StoreDetailsFooter isSaving={saveMutation.isPending} onCancel={() => setLocation("/clients")} onCall={handleCall} onSave={handleSave} />
    </div>
  );
}

import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Save, Loader2, ExternalLink, Phone, X } from "lucide-react";
import { QuickReminder } from "@/components/quick-reminder";
import { formatDistanceToNow, format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { useTwilioVoip } from "@/hooks/useTwilioVoip";

export default function StoreDetails() {
  const { storeId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const voip = useTwilioVoip();

  const [formData, setFormData] = useState({
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

  // Fetch store data
  const { data: storeData, isLoading } = useQuery({
    queryKey: ['store-details', storeId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/store/${storeId}`);
      return response;
    },
    enabled: !!storeId,
  });

  // Fetch notes for this client
  const { data: notesData = [] } = useQuery<any[]>({
    queryKey: ['/api/clients', storeId, 'notes'],
    enabled: !!storeId,
  });

  // Fetch user preferences
  const { data: userPreferences } = useQuery<any>({
    queryKey: ["/api/user/preferences"],
  });

  // Populate form when data loads
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

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('PUT', `/api/store/${storeId}`, formData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Store information updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['store-details', storeId] });
      queryClient.invalidateQueries({ queryKey: ['merged-data'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/clients/${storeId}/notes`, {
        content: newNote,
        isFollowUp,
      });
    },
    onSuccess: () => {
      toast({
        title: "Note Added",
        description: "Your note has been saved successfully",
      });
      setNewNote("");
      setIsFollowUp(false);
      queryClient.invalidateQueries({ queryKey: ['/api/clients', storeId, 'notes'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create reminder mutation
  const createReminderMutation = useMutation({
    mutationFn: async (reminderData: any) => {
      // Transform field names to match API expectations
      const { note, date, time, ...rest } = reminderData;
      
      // Format date as date-only string (yyyy-MM-dd) - prevent timezone drift
      let reminderDate: string;
      if (date instanceof Date) {
        // Extract local components to avoid UTC conversion
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        reminderDate = `${year}-${month}-${day}`;
      } else if (typeof date === 'string') {
        reminderDate = date;
      } else {
        // Fallback for other types
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        reminderDate = `${year}-${month}-${day}`;
      }
      
      return await apiRequest('POST', '/api/reminders', {
        title: note,
        reminderDate,
        reminderTime: time,
        ...rest,
        clientId: storeId,
        storeName: formData.name,
        storeMetadata: {
          link: formData.link,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pointOfContact: storeData?.['Point of Contact'] || storeData?.['POC'],
          pocEmail: storeData?.['POC Email'] || storeData?.['poc email'],
          pocPhone: storeData?.['POC Phone'] || storeData?.['poc phone'],
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Reminder Created",
        description: "Your reminder has been saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Log call mutation
  const logCallMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      return await apiRequest("POST", "/api/call-history", {
        storeName: formData.name,
        phoneNumber,
        storeLink: formData.link || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/call-history'] });
    },
    onError: (error: Error) => {
      console.error('Failed to log call:', error);
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleAddNote = () => {
    if (!newNote.trim()) {
      toast({
        title: "Error",
        description: "Note cannot be empty",
        variant: "destructive",
      });
      return;
    }
    addNoteMutation.mutate();
  };

  const handleSaveReminder = (reminderData: any) => {
    createReminderMutation.mutate(reminderData);
  };

  const handleCall = () => {
    // Use POC phone first, fall back to regular phone
    const pocPhone = storeData?.['POC Phone'] || storeData?.['poc phone'] || storeData?.['poc_phone'];
    const regularPhone = formData.phone;
    const phoneToCall = pocPhone || regularPhone;

    if (!phoneToCall) {
      toast({
        title: "No Phone Number",
        description: "No phone number available for this store",
        variant: "destructive",
      });
      return;
    }

    // Log the call
    logCallMutation.mutate(phoneToCall);

    // Open phone dialer
    voip.makeCall(phoneToCall);
  };

  const handleCancel = () => {
    setLocation('/clients');
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
      {/* Header */}
      <div className="border-b bg-background">
        <div className="container mx-auto p-4 max-w-5xl">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation('/clients')} data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{formData.name || "Store Details"}</h1>
              <p className="text-sm text-muted-foreground">{formData.type}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 max-w-5xl pb-32">
          <div className="grid gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Core store details and identification</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Store Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter store name"
                      data-testid="input-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Input
                      id="type"
                      value={formData.type}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                      placeholder="e.g., Dispensary, Headshop"
                      data-testid="input-type"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="link">Profile Link</Label>
                  <div className="flex gap-2">
                    <Input
                      id="link"
                      value={formData.link}
                      onChange={(e) => handleInputChange('link', e.target.value)}
                      placeholder="https://..."
                      className="flex-1"
                      data-testid="input-link"
                    />
                    {formData.link && (
                      <Button variant="outline" size="icon" asChild>
                        <a href={formData.link} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="about">About</Label>
                  <Textarea
                    id="about"
                    value={formData.about}
                    onChange={(e) => handleInputChange('about', e.target.value)}
                    placeholder="Store description..."
                    rows={4}
                    data-testid="textarea-about"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="member_since">Member Since</Label>
                  <Input
                    id="member_since"
                    value={formData.member_since}
                    onChange={(e) => handleInputChange('member_since', e.target.value)}
                    placeholder="Date joined"
                    data-testid="input-member-since"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>How to reach this store</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="(555) 123-4567"
                      data-testid="input-phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="contact@store.com"
                      data-testid="input-email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <div className="flex gap-2">
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      placeholder="https://www.store.com"
                      className="flex-1"
                      data-testid="input-website"
                    />
                    {formData.website && (
                      <Button variant="outline" size="icon" asChild>
                        <a href={formData.website.startsWith('http') ? formData.website : `https://${formData.website}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle>Location</CardTitle>
                <CardDescription>Physical address details</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="123 Main St"
                    data-testid="input-address"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="City"
                      data-testid="input-city"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      placeholder="State"
                      data-testid="input-state"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Details */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Details</CardTitle>
                <CardDescription>Extra information and metadata</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hours">Hours</Label>
                  <Textarea
                    id="hours"
                    value={formData.hours}
                    onChange={(e) => handleInputChange('hours', e.target.value)}
                    placeholder="Business hours..."
                    rows={3}
                    data-testid="textarea-hours"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="followers">Followers</Label>
                    <Input
                      id="followers"
                      value={formData.followers}
                      onChange={(e) => handleInputChange('followers', e.target.value)}
                      placeholder="Number of followers"
                      data-testid="input-followers"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vibe_score">Vibe Score</Label>
                    <Input
                      id="vibe_score"
                      value={formData.vibe_score}
                      onChange={(e) => handleInputChange('vibe_score', e.target.value)}
                      placeholder="Score"
                      data-testid="input-vibe-score"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sales_ready_summary">Sales-ready Summary</Label>
                  <Textarea
                    id="sales_ready_summary"
                    value={formData.sales_ready_summary}
                    onChange={(e) => handleInputChange('sales_ready_summary', e.target.value)}
                    placeholder="Summary for sales team..."
                    rows={4}
                    data-testid="textarea-sales-ready-summary"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notes Section */}
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
                <CardDescription>Add notes and follow-up reminders for this store</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Existing Notes */}
                <div className="space-y-3">
                  {notesData.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No notes yet. Add your first note below.</p>
                  ) : (
                    notesData.map((note: any) => (
                      <div key={note.id} className="border rounded-lg p-3 space-y-2" data-testid={`note-${note.id}`}>
                        <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}</span>
                          {note.isFollowUp && (
                            <span className="text-red-600 dark:text-red-400 font-medium">Follow-up Required</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add New Note */}
                <div className="space-y-3 pt-4 border-t">
                  <Label htmlFor="new-note">Add New Note</Label>
                  <Textarea
                    id="new-note"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Enter your note..."
                    rows={3}
                    data-testid="textarea-new-note"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="follow-up"
                        checked={isFollowUp}
                        onCheckedChange={(checked) => setIsFollowUp(checked as boolean)}
                        data-testid="checkbox-follow-up"
                      />
                      <Label htmlFor="follow-up" className="text-sm font-normal cursor-pointer">
                        Mark as follow-up
                      </Label>
                    </div>
                    <Button 
                      onClick={handleAddNote} 
                      disabled={addNoteMutation.isPending || !newNote.trim()}
                      data-testid="button-add-note"
                    >
                      {addNoteMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        "Add Note"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Reminder Section */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Reminder</CardTitle>
                <CardDescription>Set a reminder for this store</CardDescription>
              </CardHeader>
              <CardContent>
                <QuickReminder
                  onSave={handleSaveReminder}
                  isSaving={createReminderMutation.isPending}
                  storeAddress={formData.address}
                  storeCity={formData.city}
                  storeState={formData.state}
                  userTimezone={userPreferences?.timezone}
                  defaultTimezoneMode={userPreferences?.timezoneMode}
                  timeFormat={userPreferences?.timeFormat}
                  pointOfContact={storeData?.['Point of Contact'] || storeData?.['POC']}
                  pocEmail={storeData?.['POC Email'] || storeData?.['poc email']}
                  pocPhone={storeData?.['POC Phone'] || storeData?.['poc phone']}
                  defaultEmail={formData.email}
                  defaultPhone={formData.phone}
                  defaultCalendarReminders={userPreferences?.calendarReminders}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="border-t bg-background">
        <div className="container mx-auto p-4 max-w-5xl">
          <div className="flex items-center justify-between gap-4">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              data-testid="button-cancel"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              <Button 
                variant="default" 
                onClick={handleCall}
                data-testid="button-call"
              >
                <Phone className="h-4 w-4 mr-2" />
                Call
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saveMutation.isPending}
                data-testid="button-save"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

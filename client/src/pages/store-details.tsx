
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
import { ArrowLeft, Save, Loader2, ExternalLink } from "lucide-react";

export default function StoreDetails() {
  const { storeId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Fetch store data
  const { data: storeData, isLoading } = useQuery({
    queryKey: ['store-details', storeId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/store/${storeId}`);
      return response;
    },
    enabled: !!storeId,
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    saveMutation.mutate();
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
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setLocation('/clients')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{formData.name || "Store Details"}</h1>
            <p className="text-muted-foreground">{formData.type}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Input
                  id="type"
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  placeholder="e.g., Dispensary, Headshop"
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="member_since">Member Since</Label>
              <Input
                id="member_since"
                value={formData.member_since}
                onChange={(e) => handleInputChange('member_since', e.target.value)}
                placeholder="Date joined"
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  placeholder="State"
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vibe_score">Vibe Score</Label>
                <Input
                  id="vibe_score"
                  value={formData.vibe_score}
                  onChange={(e) => handleInputChange('vibe_score', e.target.value)}
                  placeholder="Score"
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
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button at Bottom */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saveMutation.isPending} size="lg">
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save All Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

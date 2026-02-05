import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getProfile, updateProfile, uploadFile } from '@/integrations/firebase/services';
import { UserProfile } from '@/integrations/firebase/types';
import { Loader2, Upload, Save, X, MapPin, Award, Users, Calendar, Star, Plus, Trash2, Building, Globe, Shield } from 'lucide-react';

interface RecruiterProfileManagementProps {
  onClose?: () => void;
}

export const RecruiterProfileManagement: React.FC<RecruiterProfileManagementProps> = ({ onClose }) => {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    companyName: '',
    companyWebsite: '',
    companyDescription: '',
    industryType: '',
    city: '',
    country: '',
    bio: '',
    companySize: '',
    foundedYear: '',
    mission: '',
    values: '',
    benefits: [] as string[],
    socialLinks: {
      linkedin: '',
      twitter: '',
      facebook: '',
      instagram: ''
    },
    officeLocations: [] as Array<{ city: string; country: string; address: string }>,
    testimonials: [] as Array<{ name: string; role: string; content: string; rating: number }>,
    awards: [] as Array<{ title: string; year: string; description: string }>
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (currentUser?.uid) {
        try {
          const userProfile = await getProfile(currentUser.uid);
          if (userProfile) {
            setProfile(userProfile);
            setFormData({
              fullName: userProfile.fullName || '',
              email: userProfile.email || '',
              phone: userProfile.phone || '',
              companyName: userProfile.companyName || '',
              companyWebsite: userProfile.companyWebsite || '',
              companyDescription: userProfile.companyDescription || '',
              industryType: userProfile.industryType || '',
              city: userProfile.city || '',
              country: userProfile.country || '',
              bio: userProfile.bio || '',
              companySize: (userProfile as any).companySize || '',
              foundedYear: (userProfile as any).foundedYear || '',
              mission: (userProfile as any).mission || '',
              values: (userProfile as any).values || '',
              benefits: (userProfile as any).benefits || [],
              socialLinks: (userProfile as any).socialLinks || {
                linkedin: '',
                twitter: '',
                facebook: '',
                instagram: ''
              },
              officeLocations: (userProfile as any).officeLocations || [],
              testimonials: (userProfile as any).testimonials || [],
              awards: (userProfile as any).awards || []
            });
          }
        } catch (error) {
          console.error('Error loading profile:', error);
          toast({
            title: 'Error',
            description: 'Failed to load profile. Please try again.',
            variant: 'destructive'
          });
        } finally {
          setLoading(false);
        }
      }
    };

    loadProfile();
  }, [currentUser, t, toast]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedInputChange = (field: string, subfield: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: {
        ...prev[field as keyof typeof prev],
        [subfield]: value
      }
    }));
  };

  const addBenefit = () => {
    setFormData(prev => ({
      ...prev,
      benefits: [...prev.benefits, '']
    }));
  };

  const updateBenefit = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.map((benefit, i) => i === index ? value : benefit)
    }));
  };

  const removeBenefit = (index: number) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index)
    }));
  };

  const addOfficeLocation = () => {
    setFormData(prev => ({
      ...prev,
      officeLocations: [...prev.officeLocations, { city: '', country: '', address: '' }]
    }));
  };

  const updateOfficeLocation = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      officeLocations: prev.officeLocations.map((location, i) =>
        i === index ? { ...location, [field]: value } : location
      )
    }));
  };

  const removeOfficeLocation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      officeLocations: prev.officeLocations.filter((_, i) => i !== index)
    }));
  };

  const addTestimonial = () => {
    setFormData(prev => ({
      ...prev,
      testimonials: [...prev.testimonials, { name: '', role: '', content: '', rating: 5 }]
    }));
  };

  const updateTestimonial = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      testimonials: prev.testimonials.map((testimonial, i) =>
        i === index ? { ...testimonial, [field]: value } : testimonial
      )
    }));
  };

  const removeTestimonial = (index: number) => {
    setFormData(prev => ({
      ...prev,
      testimonials: prev.testimonials.filter((_, i) => i !== index)
    }));
  };

  const addAward = () => {
    setFormData(prev => ({
      ...prev,
      awards: [...prev.awards, { title: '', year: '', description: '' }]
    }));
  };

  const updateAward = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      awards: prev.awards.map((award, i) =>
        i === index ? { ...award, [field]: value } : award
      )
    }));
  };

  const removeAward = (index: number) => {
    setFormData(prev => ({
      ...prev,
      awards: prev.awards.filter((_, i) => i !== index)
    }));
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Invalid file type. Please upload an image file.',
        variant: 'destructive'
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'File is too large. Maximum size is 5MB.',
        variant: 'destructive'
      });
      return;
    }

    setUploadingLogo(true);
    try {
      const path = `logos/${profile.userId}/${Date.now()}_${file.name}`;
      const logoUrl = await uploadFile(file, path);

      await updateProfile(profile.id, { companyLogoUrl: logoUrl });
      setProfile(prev => prev ? { ...prev, companyLogoUrl: logoUrl } : null);

      toast({
        title: 'Success',
        description: 'Logo uploaded successfully'
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload logo. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      await updateProfile(profile.id, {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        companyName: formData.companyName,
        companyWebsite: formData.companyWebsite,
        companyDescription: formData.companyDescription,
        industryType: formData.industryType,
        city: formData.city,
        country: formData.country,
        bio: formData.bio,
        companySize: formData.companySize,
        foundedYear: formData.foundedYear,
        mission: formData.mission,
        values: formData.values,
        benefits: formData.benefits,
        socialLinks: formData.socialLinks,
        officeLocations: formData.officeLocations,
        testimonials: formData.testimonials,
        awards: formData.awards
      });

      toast({
        title: 'Success',
        description: 'Profile updated successfully'
      });

      onClose?.();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Company Profile
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="benefits">Benefits</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="recognition">Recognition</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            {/* Company Logo Upload */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                {profile?.companyLogoUrl ? (
                  <img
                    src={profile.companyLogoUrl}
                    alt="Company Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Upload className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div>
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <Button variant="outline" size="sm" disabled={uploadingLogo}>
                    {uploadingLogo ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Upload Logo
                  </Button>
                </Label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Recommended: Square image, max 5MB (PNG, JPG)
                </p>
              </div>
            </div>

            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email address"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  placeholder="Enter country"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="Enter city"
              />
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Enter bio"
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="company" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  placeholder="Enter company name"
                />
              </div>
              <div>
                <Label htmlFor="companyWebsite">Company Website</Label>
                <Input
                  id="companyWebsite"
                  value={formData.companyWebsite}
                  onChange={(e) => handleInputChange('companyWebsite', e.target.value)}
                  placeholder="Enter company website"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="industryType">Industry Type</Label>
                <Select value={formData.industryType} onValueChange={(value) => handleInputChange('industryType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="consulting">Consulting</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="companySize">Company Size</Label>
                <Select value={formData.companySize} onValueChange={(value) => handleInputChange('companySize', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1-10 employees</SelectItem>
                    <SelectItem value="11-50">11-50 employees</SelectItem>
                    <SelectItem value="51-200">51-200 employees</SelectItem>
                    <SelectItem value="201-500">201-500 employees</SelectItem>
                    <SelectItem value="501-1000">501-1000 employees</SelectItem>
                    <SelectItem value="1000+">1000+ employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="foundedYear">Founded Year</Label>
              <Input
                id="foundedYear"
                type="number"
                value={formData.foundedYear}
                onChange={(e) => handleInputChange('foundedYear', e.target.value)}
                placeholder="2020"
                min="1800"
                max={new Date().getFullYear()}
              />
            </div>

            <div>
              <Label htmlFor="companyDescription">Company Description</Label>
              <Textarea
                id="companyDescription"
                value={formData.companyDescription}
                onChange={(e) => handleInputChange('companyDescription', e.target.value)}
                placeholder="Enter company description (max 1000 characters)"
                rows={4}
                maxLength={1000}
              />
            </div>

            <div>
              <Label htmlFor="mission">Mission Statement</Label>
              <Textarea
                id="mission"
                value={formData.mission}
                onChange={(e) => handleInputChange('mission', e.target.value)}
                placeholder="Enter mission statement"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="values">Company Values</Label>
              <Textarea
                id="values"
                value={formData.values}
                onChange={(e) => handleInputChange('values', e.target.value)}
                placeholder="Enter company values"
                rows={3}
              />
            </div>

            {/* Social Links */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Social Links</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="linkedin">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    value={formData.socialLinks.linkedin}
                    onChange={(e) => handleNestedInputChange('socialLinks', 'linkedin', e.target.value)}
                    placeholder="https://linkedin.com/company/..."
                  />
                </div>
                <div>
                  <Label htmlFor="twitter">Twitter</Label>
                  <Input
                    id="twitter"
                    value={formData.socialLinks.twitter}
                    onChange={(e) => handleNestedInputChange('socialLinks', 'twitter', e.target.value)}
                    placeholder="https://twitter.com/..."
                  />
                </div>
                <div>
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    value={formData.socialLinks.facebook}
                    onChange={(e) => handleNestedInputChange('socialLinks', 'facebook', e.target.value)}
                    placeholder="https://facebook.com/..."
                  />
                </div>
                <div>
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={formData.socialLinks.instagram}
                    onChange={(e) => handleNestedInputChange('socialLinks', 'instagram', e.target.value)}
                    placeholder="https://instagram.com/..."
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="benefits" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Benefits and Perks</h3>
              <Button onClick={addBenefit} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Benefit
              </Button>
            </div>

            <div className="space-y-4">
              {formData.benefits.map((benefit, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={benefit}
                    onChange={(e) => updateBenefit(index, e.target.value)}
                    placeholder="Enter benefit or perk"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeBenefit(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {formData.benefits.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No benefits added yet
              </p>
            )}
          </TabsContent>

          <TabsContent value="locations" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Office Locations</h3>
              <Button onClick={addOfficeLocation} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Location
              </Button>
            </div>

            <div className="space-y-6">
              {formData.officeLocations.map((location, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label>City</Label>
                        <Input
                          value={location.city}
                          onChange={(e) => updateOfficeLocation(index, 'city', e.target.value)}
                          placeholder="Enter city"
                        />
                      </div>
                      <div>
                        <Label>Country</Label>
                        <Input
                          value={location.country}
                          onChange={(e) => updateOfficeLocation(index, 'country', e.target.value)}
                          placeholder="Enter country"
                        />
                      </div>
                    </div>
                    <div className="mb-4">
                      <Label>Address</Label>
                      <Textarea
                        value={location.address}
                        onChange={(e) => updateOfficeLocation(index, 'address', e.target.value)}
                        placeholder="Enter full address"
                        rows={2}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeOfficeLocation(index)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove Location
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {formData.officeLocations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No locations added yet
              </p>
            )}
          </TabsContent>

          <TabsContent value="recognition" className="space-y-6">
            {/* Testimonials */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Employee Testimonials</h3>
                <Button onClick={addTestimonial} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Testimonial
                </Button>
              </div>

              <div className="space-y-4">
                {formData.testimonials.map((testimonial, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <Label>Name</Label>
                          <Input
                            value={testimonial.name}
                            onChange={(e) => updateTestimonial(index, 'name', e.target.value)}
                            placeholder="Enter employee name"
                          />
                        </div>
                        <div>
                          <Label>Role</Label>
                          <Input
                            value={testimonial.role}
                            onChange={(e) => updateTestimonial(index, 'role', e.target.value)}
                            placeholder="Enter role/position"
                          />
                        </div>
                      </div>
                      <div className="mb-4">
                        <Label>Testimonial</Label>
                        <Textarea
                          value={testimonial.content}
                          onChange={(e) => updateTestimonial(index, 'content', e.target.value)}
                          placeholder="Enter testimonial text"
                          rows={3}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label>Rating</Label>
                          <Select
                            value={testimonial.rating.toString()}
                            onValueChange={(value) => updateTestimonial(index, 'rating', parseInt(value))}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5].map(rating => (
                                <SelectItem key={rating} value={rating.toString()}>
                                  {rating} ⭐
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeTestimonial(index)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Awards */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Awards and Recognition</h3>
                <Button onClick={addAward} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Award
                </Button>
              </div>

              <div className="space-y-4">
                {formData.awards.map((award, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <Label>Award Title</Label>
                          <Input
                            value={award.title}
                            onChange={(e) => updateAward(index, 'title', e.target.value)}
                            placeholder="Enter award title"
                          />
                        </div>
                        <div>
                          <Label>Year</Label>
                          <Input
                            type="number"
                            value={award.year}
                            onChange={(e) => updateAward(index, 'year', e.target.value)}
                            placeholder="2023"
                            min="1900"
                            max={new Date().getFullYear()}
                          />
                        </div>
                      </div>
                      <div className="mb-4">
                        <Label>Description</Label>
                        <Textarea
                          value={award.description}
                          onChange={(e) => updateAward(index, 'description', e.target.value)}
                          placeholder="Enter award description"
                          rows={2}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeAward(index)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {(formData.testimonials.length === 0 && formData.awards.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No recognition added yet
              </p>
            )}
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-6 border-t">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

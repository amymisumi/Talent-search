import { useState, useEffect } from 'react';
import { UserProfile } from '@/integrations/firebase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, X, CheckCircle, MapPin, RefreshCw, Camera, Globe, Briefcase, DollarSign, Eye, EyeOff, Plus, Minus } from 'lucide-react';
import { updateProfile, uploadFile, calculateProfileCompletion, getSkillsByProfile, getPortfoliosByProfile, getCertificatesByStatus, getProfile } from '@/integrations/firebase/services';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { useDropzone } from 'react-dropzone';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { format } from 'date-fns';
import imageCompression from 'browser-image-compression';

interface ProfileSectionProps {
  profile: UserProfile | null;
  onProfileUpdate: (updatedProfile: UserProfile) => Promise<boolean>;
}

const ProfileSection = ({ profile: initialProfile, onProfileUpdate }: ProfileSectionProps) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<UserProfile>(initialProfile || {
    id: '',
    userId: '',
    fullName: '',
    email: '',
    country: '',
    city: '',
    phone: '',
    bio: '',
    talentArea: '',
    yearsOfExperience: 0,
    profileImageUrl: '',
    coverImageUrl: '',
    dateOfBirth: '',
    nationality: '',
    location: '',
    socialLinks: {
      linkedin: '',
      github: '',
      twitter: '',
      portfolio: ''
    },
    languages: [],
    availabilityStatus: 'actively_seeking',
    preferredJobTypes: [],
    salaryExpectations: {
      amount: 0,
      currency: 'USD'
    },
    profileVisibility: 'public',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [newLanguage, setNewLanguage] = useState({ name: '', proficiency: 'intermediate' as const });

  // Load profile data independently if not provided
  useEffect(() => {
    const loadProfileData = async () => {
      if (!currentUser) return;

      setLoading(true);
      try {
        const userProfile = await getProfile(currentUser.uid);
        if (userProfile) {
          setProfile(userProfile);
          setFormData(userProfile);
          const completion = calculateProfileCompletion(userProfile);
          setProfileCompletion(completion);
        } else if (initialProfile) {
          // Fallback to prop if no profile in Firestore
          setProfile(initialProfile);
          setFormData(initialProfile);
          const completion = calculateProfileCompletion(initialProfile);
          setProfileCompletion(completion);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [currentUser, initialProfile, toast]);

  // Update completion when profile changes
  useEffect(() => {
    if (profile) {
      const completion = calculateProfileCompletion(profile);
      setProfileCompletion(completion);
    }
  }, [profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };



  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setIsUploading(true);
    try {
      const path = `profiles/${currentUser.uid}/profile-image-${Date.now()}.${file.name.split('.').pop()}`;
      const imageUrl = await uploadFile(file, path);

      await updateProfile(currentUser.uid, { profileImageUrl: imageUrl });

      setFormData(prev => ({
        ...prev,
        profileImageUrl: imageUrl
      }));

      toast({
        title: "Success",
        description: "Profile image updated successfully",
      });

      // Trigger parent update
      if (profile) {
        await onProfileUpdate({ ...profile, profileImageUrl: imageUrl });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload profile image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser) return;

    setIsSaving(true);
    try {
      // Handle cover image upload if new file selected
      let coverImageUrl = formData.coverImageUrl;
      if (coverImageFile) {
        const compressedFile = await imageCompression(coverImageFile, {
          maxSizeMB: 2,
          maxWidthOrHeight: 1200,
          useWebWorker: true
        });
        const path = `profiles/${currentUser.uid}/cover-image-${Date.now()}.${compressedFile.name.split('.').pop()}`;
        coverImageUrl = await uploadFile(compressedFile, path);
      }

      await updateProfile(currentUser.uid, {
        fullName: formData.fullName,
        country: formData.country,
        city: formData.city,
        phone: formData.phone,
        bio: formData.bio,
        talentArea: formData.talentArea,
        yearsOfExperience: formData.yearsOfExperience,
        educationLevel: formData.educationLevel,
        preferredCareerField: formData.preferredCareerField,
        cvUrl: formData.cvUrl,
        // New fields
        dateOfBirth: formData.dateOfBirth,
        nationality: formData.nationality,
        location: formData.location,
        socialLinks: formData.socialLinks,
        languages: formData.languages,
        availabilityStatus: formData.availabilityStatus,
        preferredJobTypes: formData.preferredJobTypes,
        salaryExpectations: formData.salaryExpectations,
        profileVisibility: formData.profileVisibility,
        coverImageUrl
      });

      // Reload profile data to get updated completion
      const updatedProfile = await getProfile(currentUser.uid);
      if (updatedProfile) {
        setProfile(updatedProfile);
        setFormData(updatedProfile);
        setProfileCompletion(calculateProfileCompletion(updatedProfile));

        // Trigger parent update
        await onProfileUpdate(updatedProfile);
      }

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      setEditMode(false);
      setCoverImageFile(null);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const userProfile = await getProfile(currentUser.uid);
      if (userProfile) {
        setProfile(userProfile);
        setFormData(userProfile);
        setProfileCompletion(calculateProfileCompletion(userProfile));
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
      toast({
        title: "Error",
        description: "Failed to refresh profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage your personal information and preferences
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {!editMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
          {!editMode && (
            <Button onClick={() => setEditMode(true)}>
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {editMode ? (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="mb-4 text-lg font-medium text-gray-900">Profile Picture</h3>
            <div className="flex items-center space-x-6">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={formData.profileImageUrl} alt={formData.fullName} />
                  <AvatarFallback>
                    {formData.fullName?.substring(0, 2).toUpperCase() || 'US'}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 flex items-center justify-center w-8 h-8 bg-blue-500 rounded-full cursor-pointer hover:bg-blue-600">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                  <Upload className="w-4 h-4 text-white" />
                </label>
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  Upload a square image for best results. Max file size: 5MB.
                </p>
                {isUploading && (
                  <p className="mt-1 text-sm text-blue-600">Uploading...</p>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="mb-4 text-lg font-medium text-gray-900">Personal Information</h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <Input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleInputChange}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">City</label>
                <Input
                  type="text"
                  name="city"
                  value={formData.city || ''}
                  onChange={handleInputChange}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Country</label>
                <Input
                  type="text"
                  name="country"
                  value={formData.country || ''}
                  onChange={handleInputChange}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Talent Area</label>
                <select
                  name="talentArea"
                  value={formData.talentArea || ''}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 mt-1 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Select your talent area</option>
                  <option value="Software Development">Software Development</option>
                  <option value="UI/UX Design">UI/UX Design</option>
                  <option value="Data Science">Data Science</option>
                  <option value="Digital Marketing">Digital Marketing</option>
                  <option value="Graphic Design">Graphic Design</option>
                  <option value="Content Writing">Content Writing</option>
                  <option value="Photography">Photography</option>
                  <option value="Music">Music</option>
                  <option value="Acting">Acting</option>
                  <option value="Dance">Dance</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Years of Experience</label>
                <select
                  name="yearsOfExperience"
                  value={formData.yearsOfExperience || 0}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 mt-1 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="0">Less than 1 year</option>
                  <option value="1">1 year</option>
                  <option value="2">2 years</option>
                  <option value="3">3 years</option>
                  <option value="4">4 years</option>
                  <option value="5">5+ years</option>
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700">Bio</label>
              <Textarea
                name="bio"
                value={formData.bio || ''}
                onChange={handleInputChange}
                rows={4}
                className="mt-1"
                placeholder="Tell us about yourself, your skills, and your experience..."
              />
            </div>

            <div className="grid grid-cols-1 gap-6 mt-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Education Level</label>
                <select
                  name="educationLevel"
                  value={formData.educationLevel || ''}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 mt-1 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Select education level</option>
                  <option value="High School">High School</option>
                  <option value="Diploma">Diploma</option>
                  <option value="Bachelor's Degree">Bachelor's Degree</option>
                  <option value="Master's Degree">Master's Degree</option>
                  <option value="PhD">PhD</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Preferred Career Field</label>
                <Input
                  type="text"
                  name="preferredCareerField"
                  value={formData.preferredCareerField || ''}
                  onChange={handleInputChange}
                  className="mt-1"
                  placeholder="e.g. Technology, Healthcare, Finance"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">CV URL</label>
                <Input
                  type="url"
                  name="cvUrl"
                  value={formData.cvUrl || ''}
                  onChange={handleInputChange}
                  className="mt-1"
                  placeholder="Link to your CV (Google Drive, Dropbox, etc.)"
                />
              </div>
            </div>

          </div>



          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditMode(false);
                setFormData(profile || formData);
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isUploading || isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Profile Overview Card */}
          <div className="p-6 bg-white rounded-lg shadow">
            <div className="flex flex-col md:flex-row md:items-center md:space-x-6">
              <div className="flex-shrink-0">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profile?.profileImageUrl} alt={profile?.fullName} />
                  <AvatarFallback>
                    {profile?.fullName?.substring(0, 2).toUpperCase() || 'US'}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="mt-4 md:mt-0 flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{profile?.fullName}</h3>
                    <p className="text-gray-600">{profile?.email}</p>
                    {(profile?.city || profile?.country) && (
                      <div className="flex items-center mt-1 text-gray-500">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span className="text-sm">
                          {[profile?.city, profile?.country].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500 mb-1">Profile Completion</div>
                    <div className="flex items-center space-x-2">
                      <Progress value={profileCompletion} className="w-20" />
                      <span className="text-sm font-medium text-gray-900">{profileCompletion}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-500">ABOUT</h4>
              <p className="mt-1 text-gray-700 whitespace-pre-line">
                {profile?.bio || 'No bio provided.'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 mt-6 sm:grid-cols-2">
              <div>
                <h4 className="text-sm font-medium text-gray-500">EMAIL</h4>
                <p className="mt-1 text-gray-900">{profile?.email}</p>
              </div>
              {profile?.phone && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">PHONE</h4>
                  <p className="mt-1 text-gray-900">{profile.phone}</p>
                </div>
              )}
              {(profile?.city || profile?.country) && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">LOCATION</h4>
                  <p className="mt-1 text-gray-900">
                    {[profile?.city, profile?.country].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
              <div>
                <h4 className="text-sm font-medium text-gray-500">EXPERIENCE</h4>
                <p className="mt-1 text-gray-900">
                  {profile?.yearsOfExperience || '0'} {profile?.yearsOfExperience === 1 ? 'year' : 'years'}
                </p>
              </div>
              {profile?.talentArea && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">TALENT AREA</h4>
                  <p className="mt-1 text-gray-900">{profile.talentArea}</p>
                </div>
              )}
              {profile?.educationLevel && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">EDUCATION</h4>
                  <p className="mt-1 text-gray-900">{profile.educationLevel}</p>
                </div>
              )}
            </div>


          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSection;

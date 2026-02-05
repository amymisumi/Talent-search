import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../integrations/firebase/config';
import { v4 as uuidv4 } from 'uuid';
import * as yup from 'yup';
import imageCompression from 'browser-image-compression';
import { toast } from 'sonner';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import {
  User,
  Camera,
  Plus,
  X,
  Eye,
  Linkedin,
  Github,
  Globe,
  MapPin,
  Phone,
  GraduationCap,
  Briefcase,
  Trash2,
  Save,
  ArrowLeft
} from 'lucide-react';

// Simplified validation schema to avoid TypeScript errors
const profileSchema = yup.object().shape({
  displayName: yup.string().required('Full name is required').min(2, 'Name is too short'),
  bio: yup.string().max(500, 'Bio cannot exceed 500 characters'),
  skills: yup.array().of(yup.string().required('Skill cannot be empty')),
  education: yup.array().of(
    yup.object().shape({
      institution: yup.string().required('Institution name is required'),
      degree: yup.string().required('Degree is required'),
      field: yup.string().required('Field of study is required'),
      startDate: yup.date().required('Start date is required'),
      endDate: yup.mixed().test('endDate', 'End date is required when not current', function(value) {
        const { current } = this.parent;
        if (!current && !value) return false;
        return true;
      }),
      current: yup.boolean()
    })
  ),
  experience: yup.array().of(
    yup.object().shape({
      company: yup.string().required('Company name is required'),
      position: yup.string().required('Position is required'),
      startDate: yup.date().required('Start date is required'),
      endDate: yup.mixed().test('endDate', 'End date is required when not current', function(value) {
        const { current } = this.parent;
        if (!current && !value) return false;
        return true;
      }),
      current: yup.boolean(),
      description: yup.string()
    })
  ),
  socialLinks: yup.object().shape({
    linkedin: yup.string().url('Must be a valid URL'),
    github: yup.string().url('Must be a valid URL'),
    portfolio: yup.string().url('Must be a valid URL')
  }),
  location: yup.string(),
  phone: yup.string().matches(
    /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/,
    'Invalid phone number format'
  )
});

// Define types for form data
interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  current: boolean;
}

interface Experience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

interface SocialLinks {
  linkedin: string;
  github: string;
  portfolio: string;
}

interface FormData {
  displayName: string;
  bio: string;
  skills: string[];
  education: Education[];
  experience: Experience[];
  socialLinks: SocialLinks;
  location: string;
  phone: string;
  profilePicture?: string;
  [key: string]: any; // Index signature to allow dynamic property access
}
const ProfileEditor = () => {
  const { currentUser, userData, updateUserProfile } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    displayName: '',
    bio: '',
    skills: [],
    education: [],
    experience: [],
    socialLinks: {
      linkedin: '',
      github: '',
      portfolio: ''
    },
    location: '',
    phone: ''
  });
  
  const [newSkill, setNewSkill] = useState('');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Load user data when component mounts
  useEffect(() => {
    if (userData) {
      // Only update if we have new data to prevent infinite loops
      setFormData(currentFormData => {
        if (
          currentFormData.displayName === (userData.displayName || '') &&
          currentFormData.bio === (userData.bio || '') &&
          JSON.stringify(currentFormData.skills) === JSON.stringify(userData.skills || []) &&
          JSON.stringify(currentFormData.education) === JSON.stringify(userData.education || []) &&
          JSON.stringify(currentFormData.experience) === JSON.stringify(userData.experience || []) &&
          JSON.stringify(currentFormData.socialLinks) === JSON.stringify(userData.socialLinks || {
            linkedin: '',
            github: '',
            portfolio: ''
          }) &&
          currentFormData.location === (userData.location || '') &&
          currentFormData.phone === (userData.phone || '')
        ) {
          return currentFormData; // No changes needed
        }

        // Convert skills to strings if they're objects
        const skillsArray = userData.skills || [];
        const skillsAsStrings = skillsArray.map((skill: any) => {
          if (typeof skill === 'string') {
            return skill;
          } else if (skill && typeof skill === 'object') {
            // Handle skill objects with name property
            return skill.name || skill.skillName || String(skill);
          }
          return String(skill);
        });

        return {
          displayName: userData.displayName || '',
          bio: userData.bio || '',
          skills: skillsAsStrings,
          education: userData.education || [],
          experience: userData.experience || [],
          socialLinks: userData.socialLinks || {
            linkedin: '',
            github: '',
            portfolio: ''
          },
          location: userData.location || '',
          phone: userData.phone || ''
        };
      });
      
      if (userData.profilePicture) {
        setProfilePictureUrl(userData.profilePicture);
      } else {
        setProfilePictureUrl('');
      }
    }
  }, [
    userData?.displayName,
    userData?.bio,
    userData?.skills,
    userData?.education,
    userData?.experience,
    userData?.socialLinks,
    userData?.location,
    userData?.phone,
    userData?.profilePicture
  ]);

  // Handle field blur (commented out as it's not currently used)
  // const handleBlur = (field: string) => {
  //   setTouched(prev => ({ ...prev, [field]: true }));
  //   validateField(field);
  // };

  const validateField = async (field: string) => {
    try {
      // Get the schema for the specific field
      const fieldSchema = yup.reach(profileSchema, field) as yup.AnySchema;
      // Validate the field value
      await fieldSchema.validate(formData[field]);
      // Clear error if validation passes
      setErrors(prev => ({ ...prev, [field]: '' }));
      return true;
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        // Set error message if validation fails
        setErrors(prev => ({ ...prev, [field]: err.message }));
      }
      return false;
    }
  };

  const validateForm = async () => {
    try {
      await profileSchema.validate(formData, { abortEarly: false });
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        const newErrors: Record<string, string> = {};
        err.inner.forEach(error => {
          if (error.path) {
            newErrors[error.path] = error.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    // Handle checkboxes
    const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    // Handle nested socialLinks
    if (name.startsWith('socialLinks.')) {
      const socialKey = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        socialLinks: {
          ...prev.socialLinks,
          [socialKey]: finalValue
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: finalValue
      }));
    }

    // Validate field if it's been touched
    if (touched[name]) {
      validateField(name);
    }
  };

  const handleEducationChange = (index: number, field: string, value: string | boolean) => {
    setFormData(prev => {
      const updatedEducation = [...prev.education];
      updatedEducation[index] = {
        ...updatedEducation[index],
        [field]: value
      };
      return { ...prev, education: updatedEducation };
    });
  };

  const handleExperienceChange = (index: number, field: string, value: string | boolean) => {
    setFormData(prev => {
      const updatedExperience = [...prev.experience];
      updatedExperience[index] = {
        ...updatedExperience[index],
        [field]: value
      };
      return { ...prev, experience: updatedExperience };
    });
  };

  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [
        ...prev.education,
        {
          id: uuidv4(),
          institution: '',
          degree: '',
          field: '',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          current: false
        }
      ]
    }));
  };

  const removeEducation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  };

  const addExperience = () => {
    setFormData(prev => ({
      ...prev,
      experience: [
        ...prev.experience,
        {
          id: uuidv4(),
          company: '',
          position: '',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          current: false,
          description: ''
        }
      ]
    }));
  };

  const removeExperience = (index: number) => {
    setFormData(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index)
    }));
  };

  const addSkill = () => {
    const skillToAdd = newSkill.trim();
    if (skillToAdd) {
      // Check if skill already exists (handle both string and object formats)
      const skillExists = formData.skills.some(skill => {
        if (typeof skill === 'string') {
          return skill === skillToAdd;
        } else if (skill && typeof skill === 'object') {
          return (skill.name || skill.skillName) === skillToAdd;
        }
        return String(skill) === skillToAdd;
      });
      
      if (!skillExists) {
        setFormData(prev => ({
          ...prev,
          skills: [...prev.skills, skillToAdd]
        }));
        setNewSkill('');
      }
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => {
        if (typeof skill === 'string') {
          return skill !== skillToRemove;
        } else if (skill && typeof skill === 'object') {
          return (skill.name || skill.skillName) !== skillToRemove;
        }
        return String(skill) !== skillToRemove;
      })
    }));
  };

  const optimizeImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 0.5, // Max file size in MB
      maxWidthOrHeight: 800, // Max width or height
      useWebWorker: true
    };

    try {
      const compressedFile = await imageCompression(file, options);
      return new File([compressedFile], file.name, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });
    } catch (error) {
      console.error('Error compressing image:', error);
      return file; // Return original if compression fails
    }
  };

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsLoading(true);
      try {
        // Check file type and size
        const file = e.target.files[0];
        if (!file.type.startsWith('image/')) {
          setError('Please upload an image file');
          return;
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          setError('Image must be less than 5MB');
          return;
        }

        // Optimize image
        const optimizedFile = await optimizeImage(file);
        setProfilePicture(optimizedFile);
        
        // Create preview URL
        const reader = new FileReader();
        reader.onloadend = () => {
          setProfilePictureUrl(reader.result as string);
          setIsLoading(false);
        };
        reader.readAsDataURL(optimizedFile);
      } catch (error) {
        console.error('Error processing image:', error);
        setError('Failed to process image. Please try again.');
        setIsLoading(false);
      }
    }
  };

  const uploadProfilePicture = async (file: File) => {
    if (!currentUser) return '';
    
    const storageRef = ref(storage, `profile-pictures/${currentUser.uid}/${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setTouched({
      displayName: true,
      bio: true,
      // Add other fields as needed
    });

    const isValid = await validateForm();
    if (!isValid) {
      // Scroll to first error
      const firstError = Object.keys(errors)[0];
      if (firstError) {
        const element = document.querySelector(`[name="${firstError}"]`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (isPreviewMode) {
      setIsPreviewMode(false);
      return;
    }

    setIsSubmitting(true);

    try {
      let updatedData = { ...formData };
      
      // Upload new profile picture if selected
      if (profilePicture) {
        const photoURL = await uploadProfilePicture(profilePicture);
        updatedData = { ...updatedData, profilePicture: photoURL };
      }
      
      // Update user profile
      await updateUserProfile(updatedData);
      
      // Show success message and redirect
      toast.success('Profile updated successfully!');
      navigate('/youth-dashboard');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePreview = async () => {
    if (!isPreviewMode) {
      const isValid = await validateForm();
      if (isValid) {
        setIsPreviewMode(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        // Scroll to first error
        const firstError = Object.keys(errors)[0];
        if (firstError) {
          const element = document.querySelector(`[name="${firstError}"]`);
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    } else {
      setIsPreviewMode(false);
    }
  };

  // Form field component with error message (commented out as it's not currently used)
  // const renderField = (
  //   label: string, 
  //   name: string, 
  //   children: React.ReactNode, 
  //   errorKey?: string
  // ) => (
  //   <div className={`form-group ${errors[errorKey || name] ? 'has-error' : ''}`}>
  //     <label>{label}</label>
  //     {children}
  //     {errors[errorKey || name] && (
  //       <div className="error-message">{errors[errorKey || name]}</div>
  //     )}
  //   </div>
  // );

  // Preview component
  const ProfilePreview = () => (
    <div className="space-y-6">
      <Card className="border-2">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <div className="flex items-center gap-6">
            {profilePictureUrl ? (
              <Avatar className="h-24 w-24 ring-4 ring-white dark:ring-slate-900">
                <AvatarImage src={profilePictureUrl} alt="Profile" />
                <AvatarFallback className="text-2xl">
                  {formData.displayName?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Avatar className="h-24 w-24 ring-4 ring-white dark:ring-slate-900">
                <AvatarFallback className="text-2xl">
                  {formData.displayName?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
          )}
          <div>
              <h3 className="text-2xl font-bold">{formData.displayName || 'Your Name'}</h3>
              {formData.location && (
                <p className="text-muted-foreground flex items-center gap-2 mt-1">
                  <MapPin className="h-4 w-4" />
                  {formData.location}
                </p>
              )}
          </div>
        </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
        {formData.bio && (
            <div>
              <h4 className="font-semibold mb-2">About</h4>
              <p className="text-muted-foreground">{formData.bio}</p>
          </div>
        )}
        
        {formData.skills.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Skills</h4>
              <div className="flex flex-wrap gap-2">
              {formData.skills.map((skill, index) => {
                const skillName = typeof skill === 'string' ? skill : (skill?.name || skill?.skillName || String(skill));
                return (
                    <Badge key={index} variant="secondary" className="text-sm py-1 px-3">
                      {skillName}
                    </Badge>
                );
              })}
            </div>
          </div>
        )}
        
        {formData.education.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Education
              </h4>
              <div className="space-y-4">
            {formData.education.map((edu, index) => (
                  <div key={index} className="pl-4 border-l-2 border-primary/20">
                    <h5 className="font-medium">{edu.degree} in {edu.field}</h5>
                    <p className="text-sm text-muted-foreground">{edu.institution}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                  {new Date(edu.startDate).getFullYear()} - {edu.current ? 'Present' : new Date(edu.endDate).getFullYear()}
                </p>
              </div>
            ))}
              </div>
          </div>
        )}
        
        {formData.experience.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Experience
              </h4>
              <div className="space-y-4">
            {formData.experience.map((exp, index) => (
                  <div key={index} className="pl-4 border-l-2 border-primary/20">
                    <h5 className="font-medium">{exp.position}</h5>
                    <p className="text-sm text-muted-foreground">{exp.company}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                  {new Date(exp.startDate).toLocaleDateString()} - {exp.current ? 'Present' : new Date(exp.endDate).toLocaleDateString()}
                </p>
                    {exp.description && (
                      <p className="text-sm text-muted-foreground mt-2">{exp.description}</p>
                    )}
              </div>
            ))}
              </div>
          </div>
        )}
        </CardContent>
      </Card>
    </div>
  );

  if (isPreviewMode) {
    return (
      <DashboardShell heading="Profile Preview" subheading="Review your profile before saving">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={togglePreview}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Edit
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Save className="h-4 w-4 mr-2 animate-spin" />
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
        <ProfilePreview />
      </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell heading="Edit Profile" subheading="Update your profile information">
      <div className="space-y-6">
        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}
      
        <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Picture */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Profile Picture
              </CardTitle>
              <CardDescription>Upload a professional profile picture</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24 ring-4 ring-primary/20">
              {profilePictureUrl ? (
                    <AvatarImage src={profilePictureUrl} alt="Profile" />
              ) : (
                    <AvatarFallback className="text-2xl">
                  {formData.displayName?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
              )}
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="profile-picture" className="cursor-pointer">
                    <Button variant="outline" type="button" asChild>
                      <span>
                        <Camera className="h-4 w-4 mr-2" />
                Choose File
                      </span>
                    </Button>
                  </Label>
                <input 
                    id="profile-picture"
                  type="file" 
                  onChange={handleProfilePictureChange} 
                  accept="image/*"
                    className="hidden"
                  />
                  {profilePicture && (
                    <p className="text-sm text-muted-foreground">{profilePicture.name}</p>
                  )}
                  {!profilePicture && (
                    <p className="text-sm text-muted-foreground">No file chosen</p>
                  )}
            </div>
          </div>
            </CardContent>
          </Card>

        {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>Your personal details and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName" required>
                  Full Name
                </Label>
                <Input
                  id="displayName"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
                  placeholder="John Doe"
              required
            />
                {errors.displayName && (
                  <p className="text-sm text-destructive">{errors.displayName}</p>
                )}
          </div>
          
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={4}
              placeholder="Tell us about yourself..."
                  maxLength={500}
            />
                <p className="text-xs text-muted-foreground">
                  {formData.bio.length}/500 characters
                </p>
                {errors.bio && (
                  <p className="text-sm text-destructive">{errors.bio}</p>
                )}
          </div>
          
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                  </Label>
                  <Input
                    id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="City, Country"
            />
                  {errors.location && (
                    <p className="text-sm text-destructive">{errors.location}</p>
                  )}
          </div>
          
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1234567890"
            />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone}</p>
                  )}
          </div>
        </div>
            </CardContent>
          </Card>

        {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
              <CardDescription>Add your professional skills and expertise</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                placeholder="Add a skill and press Enter"
                  className="flex-1"
              />
                <Button type="button" variant="outline" onClick={addSkill}>
                  <Plus className="h-4 w-4 mr-2" />
                Add
                </Button>
            </div>
              {formData.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
              {formData.skills.map((skill, index) => {
                const skillName = typeof skill === 'string' ? skill : (skill?.name || skill?.skillName || String(skill));
                return (
                      <Badge key={index} variant="secondary" className="text-sm py-1.5 px-3 gap-2">
                    {skillName}
                    <button 
                      type="button" 
                      onClick={() => removeSkill(skillName)}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    >
                          <X className="h-3 w-3" />
                    </button>
                      </Badge>
                );
              })}
            </div>
              )}
            </CardContent>
          </Card>

        {/* Education */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Education
                  </CardTitle>
                  <CardDescription>Add your educational background</CardDescription>
                </div>
                <Button type="button" variant="outline" onClick={addEducation}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Education
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {formData.education.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No education entries yet. Click "Add Education" to get started.
                </p>
              ) : (
                formData.education.map((edu, index) => (
                  <Card key={edu.id} className="border-2">
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold">Education Entry {index + 1}</h4>
                        <Button
              type="button" 
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEducation(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
          </div>
          
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`edu-institution-${index}`} required>
                            Institution
                          </Label>
                          <Input
                            id={`edu-institution-${index}`}
                    value={edu.institution}
                    onChange={(e) => handleEducationChange(index, 'institution', e.target.value)}
                    placeholder="University/School Name"
                    required
                  />
                </div>
                        <div className="space-y-2">
                          <Label htmlFor={`edu-degree-${index}`} required>
                            Degree
                          </Label>
                          <Input
                            id={`edu-degree-${index}`}
                    value={edu.degree}
                    onChange={(e) => handleEducationChange(index, 'degree', e.target.value)}
                    placeholder="e.g., Bachelor's in Computer Science"
                    required
                  />
                </div>
              </div>
              
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`edu-field-${index}`} required>
                            Field of Study
                          </Label>
                          <Input
                            id={`edu-field-${index}`}
                    value={edu.field}
                    onChange={(e) => handleEducationChange(index, 'field', e.target.value)}
                    placeholder="e.g., Computer Science"
                            required
                  />
                </div>
                        <div className="space-y-2 flex items-end">
                          <div className="flex items-center space-x-2 h-10">
                  <input
                    type="checkbox"
                              id={`edu-current-${index}`}
                    checked={edu.current}
                    onChange={(e) => handleEducationChange(index, 'current', e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300"
                  />
                            <Label htmlFor={`edu-current-${index}`} className="cursor-pointer">
                              Currently studying
                            </Label>
                          </div>
                </div>
              </div>
              
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`edu-start-${index}`} required>
                            Start Date
                          </Label>
                          <Input
                            id={`edu-start-${index}`}
                    type="date"
                    value={edu.startDate}
                    onChange={(e) => handleEducationChange(index, 'startDate', e.target.value)}
                    required
                  />
                </div>
                {!edu.current && (
                          <div className="space-y-2">
                            <Label htmlFor={`edu-end-${index}`} required>
                              End Date
                            </Label>
                            <Input
                              id={`edu-end-${index}`}
                      type="date"
                      value={edu.endDate}
                      onChange={(e) => handleEducationChange(index, 'endDate', e.target.value)}
                      required={!edu.current}
                      disabled={edu.current}
                    />
                  </div>
                )}
              </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>

          {/* Experience */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Experience
                  </CardTitle>
                  <CardDescription>Add your work experience</CardDescription>
            </div>
                <Button type="button" variant="outline" onClick={addExperience}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Experience
                </Button>
        </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {formData.experience.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No experience entries yet. Click "Add Experience" to get started.
                </p>
              ) : (
                formData.experience.map((exp, index) => (
                  <Card key={exp.id} className="border-2">
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold">Experience Entry {index + 1}</h4>
                        <Button
              type="button" 
                          variant="ghost"
                          size="sm"
                          onClick={() => removeExperience(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
          </div>
          
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`exp-company-${index}`} required>
                            Company
                          </Label>
                          <Input
                            id={`exp-company-${index}`}
                    value={exp.company}
                    onChange={(e) => handleExperienceChange(index, 'company', e.target.value)}
                    placeholder="Company Name"
                    required
                  />
                </div>
                        <div className="space-y-2">
                          <Label htmlFor={`exp-position-${index}`} required>
                            Position
                          </Label>
                          <Input
                            id={`exp-position-${index}`}
                    value={exp.position}
                    onChange={(e) => handleExperienceChange(index, 'position', e.target.value)}
                    placeholder="Job Title"
                    required
                  />
                </div>
              </div>
              
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                            id={`exp-current-${index}`}
                    checked={exp.current}
                    onChange={(e) => handleExperienceChange(index, 'current', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300"
                  />
                          <Label htmlFor={`exp-current-${index}`} className="cursor-pointer">
                            Currently working here
                          </Label>
                </div>
              </div>
              
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`exp-start-${index}`} required>
                            Start Date
                          </Label>
                          <Input
                            id={`exp-start-${index}`}
                    type="date"
                    value={exp.startDate}
                    onChange={(e) => handleExperienceChange(index, 'startDate', e.target.value)}
                    required
                  />
                </div>
                {!exp.current && (
                          <div className="space-y-2">
                            <Label htmlFor={`exp-end-${index}`} required>
                              End Date
                            </Label>
                            <Input
                              id={`exp-end-${index}`}
                      type="date"
                      value={exp.endDate}
                      onChange={(e) => handleExperienceChange(index, 'endDate', e.target.value)}
                      required={!exp.current}
                      disabled={exp.current}
                    />
                  </div>
                )}
              </div>
              
                      <div className="space-y-2">
                        <Label htmlFor={`exp-description-${index}`}>Description</Label>
                        <Textarea
                          id={`exp-description-${index}`}
                  value={exp.description}
                  onChange={(e) => handleExperienceChange(index, 'description', e.target.value)}
                  rows={3}
                  placeholder="Describe your role and responsibilities"
                />
              </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>

        {/* Social Links */}
          <Card>
            <CardHeader>
              <CardTitle>Social Links</CardTitle>
              <CardDescription>Connect your professional profiles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="linkedin" className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                </Label>
                <Input
                  id="linkedin"
                type="url"
                name="socialLinks.linkedin"
                value={formData.socialLinks.linkedin}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/yourprofile"
              />
                {errors['socialLinks.linkedin'] && (
                  <p className="text-sm text-destructive">{errors['socialLinks.linkedin']}</p>
                )}
          </div>
          
              <div className="space-y-2">
                <Label htmlFor="github" className="flex items-center gap-2">
                  <Github className="h-4 w-4" />
                  GitHub
                </Label>
                <Input
                  id="github"
                type="url"
                name="socialLinks.github"
                value={formData.socialLinks.github}
                onChange={handleChange}
                placeholder="https://github.com/yourusername"
              />
                {errors['socialLinks.github'] && (
                  <p className="text-sm text-destructive">{errors['socialLinks.github']}</p>
                )}
          </div>
          
              <div className="space-y-2">
                <Label htmlFor="portfolio" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Portfolio/Website
                </Label>
                <Input
                  id="portfolio"
                type="url"
                name="socialLinks.portfolio"
                value={formData.socialLinks.portfolio}
                onChange={handleChange}
                placeholder="https://yourportfolio.com"
              />
                {errors['socialLinks.portfolio'] && (
                  <p className="text-sm text-destructive">{errors['socialLinks.portfolio']}</p>
                )}
            </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
            type="button" 
              variant="outline"
            onClick={() => navigate(-1)}
              disabled={isSubmitting || isLoading}
          >
              <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel
            </Button>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={togglePreview}
                disabled={isSubmitting || isLoading}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
            type="submit" 
                disabled={isSubmitting || isLoading}
          >
                {isSubmitting || isLoading ? (
                  <>
                    <Save className="h-4 w-4 mr-2 animate-spin" />
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
        </div>
      </form>
    </div>
    </DashboardShell>
  );
};

export default ProfileEditor;

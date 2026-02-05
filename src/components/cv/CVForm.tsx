import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, storage } from '@/integrations/firebase/config';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';

// Define form schema using Zod
const cvFormSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  title: z.string().min(2, 'Title is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number is required'),
  address: z.string().min(5, 'Address is required'),
  bio: z.string().min(10, 'Bio must be at least 10 characters'),
  skills: z.array(z.string().min(1, 'Skill cannot be empty')),
  education: z.array(
    z.object({
      id: z.string(),
      institution: z.string().min(2, 'Institution name is required'),
      degree: z.string().min(2, 'Degree is required'),
      field: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      description: z.string(),
    })
  ),
  experience: z.array(
    z.object({
      id: z.string(),
      company: z.string().min(2, 'Company name is required'),
      position: z.string().min(2, 'Position is required'),
      startDate: z.string(),
      endDate: z.string(),
      current: z.boolean(),
      description: z.string(),
    })
  ),
  languages: z.array(
    z.object({
      id: z.string(),
      language: z.string().min(1, 'Language is required'),
      proficiency: z.enum(['Beginner', 'Intermediate', 'Fluent', 'Native']),
    })
  ),
  achievements: z.array(z.string().min(1, 'Achievement cannot be empty')),
  profilePhotoUrl: z.string().optional().nullable(),
});

// Infer the form values type from the schema
export type CVFormSchema = z.infer<typeof cvFormSchema>;

type FormFieldProps = {
  field: {
    value: any;
    onChange: (...event: any[]) => void;
    onBlur: () => void;
    name: string;
    ref: React.Ref<any>;
  };
  fieldState: {
    error?: {
      message?: string;
    };
  };
  formState: any;
};

type CVFormProps = {
  onSaveSuccess?: () => void;
  onChange?: (data: CVFormSchema) => void;
};

// Define the ref type for the form
export interface CVFormRef {
  triggerSubmit: () => Promise<void>;
}

const CVForm = forwardRef<CVFormRef, CVFormProps>(({ onSaveSuccess, onChange }, ref) => {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [newAchievement, setNewAchievement] = useState('');
  const skillInputRef = useRef<HTMLInputElement>(null);
  const achievementInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<CVFormSchema>({
    resolver: zodResolver(cvFormSchema),
    defaultValues: {
      fullName: '',
      title: '',
      email: '',
      phone: '',
      address: '',
      bio: '',
      skills: [],
      education: [],
      experience: [],
      languages: [],
      achievements: [],
      profilePhotoUrl: '',
    },
  });
  // Load CV data from Firestore (real-time)
  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsub = onSnapshot(
      userDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = (snap.data() as any).cv;
          if (data) {
            form.reset(data);
            onChange?.(data as CVFormSchema);
          }
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('Error listening to CV data:', error);
        toast.error('Failed to load CV data');
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [currentUser, form]);

  // Autosave: debounce changes and write to Firestore
  const saveTimeoutRef = React.useRef<number | null>(null);
  useEffect(() => {
    if (!currentUser) return;

    const subscription = form.watch((value) => {
      onChange?.(value as CVFormSchema);
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
      // debounce 1500ms
      saveTimeoutRef.current = window.setTimeout(async () => {
        try {
          setIsSaving(true);
          await updateDoc(doc(db, 'users', currentUser.uid), {
            cv: value,
            updatedAt: new Date().toISOString(),
          });
        } catch (error) {
          console.error('Auto-save CV error:', error);
        } finally {
          setIsSaving(false);
        }
      }, 1500);
    });

    return () => subscription.unsubscribe();
  }, [form, currentUser]);

  // Profile photo upload
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    const ext = file.name.split('.').pop();
    const path = `users/${currentUser.uid}/profile_${Date.now()}.${ext}`;
    const storageReference = storageRef(storage, path);
    const uploadTask = uploadBytesResumable(storageReference, file);

    setUploading(true);
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setUploadProgress(pct);
      },
      (error) => {
        console.error('Upload error:', error);
        toast.error('Failed to upload profile photo');
        setUploading(false);
        setUploadProgress(null);
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          form.setValue('profilePhotoUrl', url, { shouldValidate: true });
          // persist immediately
          await updateDoc(doc(db, 'users', currentUser.uid), {
            cv: { ...(form.getValues() as any), profilePhotoUrl: url },
            updatedAt: new Date().toISOString(),
          });
          toast.success('Profile photo uploaded');
        } catch (error) {
          console.error('Get download URL error:', error);
          toast.error('Failed to finalize upload');
        } finally {
          setUploading(false);
          setUploadProgress(null);
        }
      }
    );
  };

  const onSubmit = async (data: CVFormSchema) => {
    if (!currentUser) return;
    
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        cv: data,
        updatedAt: new Date().toISOString(),
      });
      toast.success('CV saved successfully!');
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (error) {
      console.error('Error saving CV:', error);
      toast.error('Failed to save CV');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, callback: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      callback();
    }
  };

  const addSkill = () => {
    const skill = newSkill.trim();
    if (skill) {
      const currentSkills = form.getValues('skills') || [];
      if (!currentSkills.includes(skill)) {
        form.setValue('skills', [...currentSkills, skill], { shouldValidate: true });
        setNewSkill('');
        setTimeout(() => skillInputRef.current?.focus(), 0);
      }
    }
  };

  const removeSkill = (index: number) => {
    const currentSkills = form.getValues('skills') || [];
    form.setValue(
      'skills',
      currentSkills.filter((_, i) => i !== index),
      { shouldValidate: true }
    );
  };

  const addAchievement = () => {
    const achievement = newAchievement.trim();
    if (achievement) {
      const currentAchievements = form.getValues('achievements') || [];
      if (!currentAchievements.includes(achievement)) {
        form.setValue('achievements', [...currentAchievements, achievement], { shouldValidate: true });
        setNewAchievement('');
        setTimeout(() => achievementInputRef.current?.focus(), 0);
      }
    }
  };

  const removeAchievement = (index: number) => {
    const currentAchievements = form.getValues('achievements') || [];
    form.setValue(
      'achievements',
      currentAchievements.filter((_, i) => i !== index),
      { shouldValidate: true }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading CV data...</span>
      </div>
    );
  }

  // Add form methods to the ref
  useImperativeHandle(ref, () => ({
    triggerSubmit: async () => {
      try {
        await form.handleSubmit(onSubmit)();
      } catch (error) {
        console.error('Form submission error:', error);
        throw error;
      }
    },
  }));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Professional Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Software Engineer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="your.email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Your address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Professional Summary</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A brief summary of your professional background and skills..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Profile Photo Upload (minimal UI, preserves design) */}
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                {form.watch('profilePhotoUrl') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.watch('profilePhotoUrl')} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <div className="text-muted-foreground">No photo</div>
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePhotoChange}
                  className="text-sm"
                />
                {uploading && uploadProgress !== null && (
                  <div className="text-sm text-muted-foreground mt-1">Uploading: {uploadProgress}%</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle>Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a skill"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                />
                <Button type="button" onClick={addSkill} variant="outline">
                  <Plus className="h-4 w-4 mr-2" /> Add
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {form.watch('skills')?.map((skill, index) => (
                  <div key={index} className="flex items-center gap-1 bg-muted px-3 py-1 rounded-full">
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => removeSkill(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Education */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Education</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const currentEducation = form.getValues('education') || [];
                  form.setValue('education', [
                    ...currentEducation,
                    {
                      id: Date.now().toString(),
                      institution: '',
                      degree: '',
                      field: '',
                      startDate: '',
                      endDate: '',
                      description: '',
                    },
                  ]);
                }}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Education
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {form.watch('education')?.map((edu, index) => (
              <div key={edu.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium">Education #{index + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      const currentEducation = form.getValues('education');
                      form.setValue(
                        'education',
                        currentEducation.filter((_, i) => i !== index)
                      );
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`education.${index}.institution` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Institution</FormLabel>
                        <FormControl>
                          <Input placeholder="University Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`education.${index}.degree` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Degree</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Bachelor of Science" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name={`education.${index}.field` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Field of Study</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Computer Science" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`education.${index}.startDate` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`education.${index}.endDate` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name={`education.${index}.description` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Details about your education, achievements, etc."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Work Experience */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Work Experience</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const currentExperience = form.getValues('experience') || [];
                  form.setValue('experience', [
                    ...currentExperience,
                    {
                      id: Date.now().toString(),
                      company: '',
                      position: '',
                      startDate: '',
                      endDate: '',
                      current: false,
                      description: '',
                    },
                  ]);
                }}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Experience
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {form.watch('experience')?.map((exp, index) => (
              <div key={exp.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium">Experience #{index + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      const currentExperience = form.getValues('experience');
                      form.setValue(
                        'experience',
                        currentExperience.filter((_, i) => i !== index)
                      );
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`experience.${index}.company` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company</FormLabel>
                        <FormControl>
                          <Input placeholder="Company Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`experience.${index}.position` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Position</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Software Engineer" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name={`experience.${index}.startDate` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`experience.${index}.current` as const}
                    render={({ field }) => (
                      <FormItem className="flex items-end space-x-2">
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`current-${index}`}
                              checked={field.value}
                              onChange={(e) => {
                                field.onChange(e.target.checked);
                                if (e.target.checked) {
                                  form.setValue(`experience.${index}.endDate`, '');
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <label
                              htmlFor={`current-${index}`}
                              className="text-sm font-medium leading-none cursor-pointer"
                            >
                              I currently work here
                            </label>
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  {!form.watch(`experience.${index}.current`) && (
                    <FormField
                      control={form.control}
                      name={`experience.${index}.endDate` as const}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} disabled={form.watch(`experience.${index}.current`)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                
                <FormField
                  control={form.control}
                  name={`experience.${index}.description` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your responsibilities and achievements"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Languages */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Languages</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const currentLanguages = form.getValues('languages') || [];
                  form.setValue('languages', [
                    ...currentLanguages,
                    {
                      id: Date.now().toString(),
                      language: '',
                      proficiency: 'Intermediate',
                    },
                  ]);
                }}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Language
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {form.watch('languages')?.map((lang, index) => (
              <div key={lang.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-medium">Language #{index + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      const currentLanguages = form.getValues('languages');
                      form.setValue(
                        'languages',
                        currentLanguages.filter((_, i) => i !== index)
                      );
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`languages.${index}.language` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Language</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Spanish" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`languages.${index}.proficiency` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Proficiency</FormLabel>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          {...field}
                        >
                          <option value="Beginner">Beginner</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Fluent">Fluent</option>
                          <option value="Native">Native</option>
                        </select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle>Achievements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add an achievement"
                  value={newAchievement}
                  onChange={(e) => setNewAchievement(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAchievement())}
                />
                <Button type="button" onClick={addAchievement} variant="outline">
                  <Plus className="h-4 w-4 mr-2" /> Add
                </Button>
              </div>
              
              <div className="space-y-2">
                {form.watch('achievements')?.map((achievement, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm">{achievement}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAchievement(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
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
      </form>
    </Form>
  );
};

export default CVForm;

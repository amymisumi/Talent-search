import { useState, useEffect, useMemo } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../contexts/AuthContext';
import {
  getProfile,
  createOrUpdateProfile,
  ProfileData,
  Education,
  WorkExperience,
  Language,
} from '../../integrations/firebase/profileService';
import { Timestamp } from 'firebase/firestore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Plus, X, Upload, Trash2, MapPin, Globe, DollarSign, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE_MB = 5;
const MAX_BIO_CHARS = 500;

const proficiencyOptions = ['Beginner', 'Intermediate', 'Advanced', 'Expert'] as const;
const availabilityOptions = ['Actively seeking', 'Open to opportunities', 'Not available'] as const;
const jobTypeOptions = ['Remote', 'Hybrid', 'On-site', 'Contract', 'Full-time', 'Part-time'] as const;
const currencies = ['USD', 'KES', 'ZAR', 'EUR', 'GBP'] as const;

const languageSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Language is required'),
  proficiency: z.enum(proficiencyOptions),
});

const educationSchema = z.object({
  id: z.string().optional(),
  institution: z.string().min(1, 'Institution is required'),
  degree: z.string().min(1, 'Degree is required'),
  fieldOfStudy: z.string().min(1, 'Field of study is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  isCurrent: z.boolean().default(false),
  description: z.string().optional(),
});

const experienceSchema = z.object({
  id: z.string().optional(),
  company: z.string().min(1, 'Company is required'),
  position: z.string().min(1, 'Position is required'),
  location: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  isCurrent: z.boolean().default(false),
  responsibilities: z.string().optional(),
});

const profileSchema = z.object({
  displayName: z.string().min(2, 'Full name is required'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  dob: z.string().optional(),
  nationality: z.string().optional(),
  location: z.string().optional(),
  phone: z
    .string()
    .optional()
    .refine((value) => !value || /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/.test(value), {
      message: 'Invalid phone number format',
    }),
  email: z.string().email(),
  mapLocation: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  bio: z.string().max(MAX_BIO_CHARS, `Bio cannot exceed ${MAX_BIO_CHARS} characters`).optional(),
  professionalSummary: z.string().max(MAX_BIO_CHARS).optional(),
  socialLinks: z
    .object({
      linkedin: z.string().url().optional(),
      github: z.string().url().optional(),
      twitter: z.string().url().optional(),
      portfolio: z.string().url().optional(),
    })
    .optional(),
  languages: z.array(languageSchema),
  availabilityStatus: z.enum(availabilityOptions).optional(),
  jobPreferences: z.array(z.enum(jobTypeOptions)).optional(),
  salaryExpectation: z
    .object({
      amount: z.number().min(0).optional(),
      currency: z.enum(currencies).optional(),
    })
    .optional(),
  visibility: z.enum(['public', 'private', 'recruiters']).default('public'),
  skills: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      proficiency: z.enum(proficiencyOptions),
      category: z.enum(['technical', 'soft', 'language', 'tool']),
    })
  ),
  education: z.array(educationSchema),
  experience: z.array(experienceSchema),
  certifications: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      issuer: z.string(),
      issueDate: z.string(),
      expiryDate: z.string().optional(),
      credentialId: z.string().optional(),
      credentialUrl: z.string().url().optional(),
      category: z.string(),
    })
  ),
  portfolio: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      link: z.string().url().optional(),
      techStack: z.array(z.string()).optional(),
      featured: z.boolean().optional(),
      category: z.string().optional(),
    })
  ),
  visibilitySettings: z
    .object({
      showProfile: z.boolean(),
      showContactInfo: z.boolean(),
      showPortfolio: z.boolean(),
      searchable: z.boolean(),
    })
    .default({
      showProfile: true,
      showContactInfo: true,
      showPortfolio: true,
      searchable: true,
    }),
  securityPreferences: z
    .object({
      twoFactorEnabled: z.boolean().default(false),
      suspiciousActivityAlerts: z.boolean().default(true),
    })
    .optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const defaultValues: ProfileFormValues = {
  displayName: '',
  firstName: '',
  lastName: '',
  dob: '',
  nationality: '',
  location: '',
  phone: '',
  email: '',
  mapLocation: undefined,
  bio: '',
  professionalSummary: '',
  socialLinks: {
    linkedin: '',
    github: '',
    twitter: '',
    portfolio: '',
  },
  languages: [],
  availabilityStatus: 'Open to opportunities',
  jobPreferences: [],
  salaryExpectation: {
    amount: undefined,
    currency: 'USD',
  },
  visibility: 'public',
  skills: [],
  education: [],
  experience: [],
  certifications: [],
  portfolio: [],
  visibilitySettings: {
    showProfile: true,
    showContactInfo: true,
    showPortfolio: true,
    searchable: true,
  },
  securityPreferences: {
    twoFactorEnabled: false,
    suspiciousActivityAlerts: true,
  },
};

export const ProfileForm = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
    mode: 'onChange',
  });

  const {
    fields: educationFields,
    append: appendEducation,
    remove: removeEducation,
  } = useFieldArray({
    control,
    name: 'education',
  });

  const {
    fields: experienceFields,
    append: appendExperience,
    remove: removeExperience,
  } = useFieldArray({
    control,
    name: 'experience',
  });

  const {
    fields: languageFields,
    append: appendLanguage,
    remove: removeLanguage,
  } = useFieldArray({
    control,
    name: 'languages',
  });

  const jobPreferences = watch('jobPreferences') || [];
  const selectedCurrency = watch('salaryExpectation.currency');

  const handleImageUpload = (file: File, onPreview: (url: string) => void) => {
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      alert(`File must be under ${MAX_FILE_SIZE_MB}MB`);
      return;
    }
    const url = URL.createObjectURL(file);
    onPreview(url);
  };
  
  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!currentUser) return;
      try {
        setLoading(true);
        const profileData = await getProfile(currentUser.uid);
        if (profileData) {
          reset({
            ...defaultValues,
            ...profileData,
            email: profileData.email || currentUser.email || '',
          });
          if (profileData.photoURL) {
            setPhotoPreview(profileData.photoURL);
          }
          if ((profileData as any).coverURL) {
            setCoverPreview((profileData as any).coverURL);
          }
        } else {
          reset((prev) => ({
            ...prev,
            email: currentUser.email || '',
            displayName: currentUser.displayName || '',
          }));
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [currentUser, reset]);
  
  // Handle form submission
  const onSubmit = async (values: ProfileFormValues) => {
    if (!currentUser) return;
    try {
      setSaving(true);
      await createOrUpdateProfile(currentUser.uid, {
        ...values,
        updatedAt: Timestamp.now(),
      } as Partial<ProfileData>);
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };
  
  // Array field management is handled by react-hook-form useFieldArray
  
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="space-y-3 rounded-xl border p-6 shadow-sm">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-48 w-full animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }
        
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase text-primary">Profile photo</p>
            <p className="text-sm text-muted-foreground">
              Upload a clear headshot. Max size {MAX_FILE_SIZE_MB}MB.
            </p>
            <div className="relative h-32 w-32 overflow-hidden rounded-full border">
              {photoPreview ? (
                <img src={photoPreview} alt="Profile preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                  No photo
                </div>
              )}
            </div>
            <Input
              type="file"
              accept="image/png,image/jpeg"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setPhotoFile(file);
                  handleImageUpload(file, setPhotoPreview);
                }
              }}
            />
          </div>
          <Separator orientation="vertical" className="hidden h-32 md:block" />
          <div className="flex-1 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input placeholder="Enter your full name" {...register('displayName')} />
                {errors.displayName && (
                  <p className="text-xs text-destructive">{errors.displayName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone number</label>
                <Input placeholder="+254 700 000 000" {...register('phone')} />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input placeholder="example@email.com" {...register('email')} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Nairobi, Kenya" {...register('location')} />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Professional summary</label>
              <Textarea rows={4} placeholder="Tell your story..." {...register('bio')} />
              <p className="text-xs text-muted-foreground">
                {watch('bio')?.length || 0}/{MAX_BIO_CHARS} characters
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">Availability</p>
            <h3 className="text-lg font-semibold">Work preferences</h3>
          </div>
          <Badge variant="outline">Realtime synced</Badge>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Availability status</label>
            <Select
              value={watch('availabilityStatus')}
              onValueChange={(value) => setValue('availabilityStatus', value as typeof availabilityOptions[number])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {availabilityOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Preferred job types</label>
            <div className="flex flex-wrap gap-2">
              {jobTypeOptions.map((option) => {
                const isSelected = jobPreferences.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setValue(
                          'jobPreferences',
                          jobPreferences.filter((pref) => pref !== option)
                        );
                      } else {
                        setValue('jobPreferences', [...jobPreferences, option]);
                      }
                    }}
                    className={cn(
                      'rounded-full border px-3 py-1 text-sm transition',
                      isSelected ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                    )}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Salary expectations</label>
            <div className="flex items-center space-x-2">
              <Select
                value={selectedCurrency}
                onValueChange={(value) => setValue('salaryExpectation.currency', value as typeof currencies[number])}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-1 items-center space-x-2 rounded-xl border px-3">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="50000"
                  {...register('salaryExpectation.amount', { valueAsNumber: true })}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Monthly gross or annual salary in selected currency.</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">Languages & skills</p>
            <h3 className="text-lg font-semibold">Showcase your strengths</h3>
          </div>
          <Badge variant="outline">
            <Globe className="mr-2 h-4 w-4" /> Multi-language
          </Badge>
        </div>

        <div className="mt-6 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Languages</p>
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  appendLanguage({
                    id: crypto.randomUUID(),
                    name: '',
                    proficiency: 'Intermediate',
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add language
              </Button>
            </div>
            <div className="space-y-4">
              {languageFields.length === 0 && (
                <p className="text-sm text-muted-foreground">Add languages with your fluency levels.</p>
              )}
              {languageFields.map((language, index) => (
                <div key={language.id} className="rounded-2xl border p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Language name</label>
                      <Input placeholder="e.g. English" {...register(`languages.${index}.name` as const)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Proficiency</label>
                      <Select
                        value={watch(`languages.${index}.proficiency`)}
                        onValueChange={(value) => setValue(`languages.${index}.proficiency`, value as Language['proficiency'])}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          {proficiencyOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-3 text-destructive"
                    onClick={() => removeLanguage(index)}
                  >
                    Remove language
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Skills</p>
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setValue('skills', [
                    ...watch('skills'),
                    {
                      id: crypto.randomUUID(),
                      name: '',
                      proficiency: 'Intermediate',
                      category: 'technical',
                    },
                  ])
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add skill
              </Button>
            </div>
            <div className="space-y-4">
              {watch('skills').length === 0 && (
                <p className="text-sm text-muted-foreground">Add technical and soft skills with mastery levels.</p>
              )}
              {watch('skills').map((skill, idx) => (
                <div key={skill.id} className="rounded-2xl border p-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Input
                      placeholder="Skill name"
                      value={skill.name}
                      onChange={(event) => {
                        const updated = [...watch('skills')];
                        updated[idx].name = event.target.value;
                        setValue('skills', updated);
                      }}
                    />
                    <Select
                      value={skill.category}
                      onValueChange={(value) => {
                        const updated = [...watch('skills')];
                        updated[idx].category = value as 'technical' | 'soft' | 'language' | 'tool';
                        setValue('skills', updated);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="soft">Soft skill</SelectItem>
                        <SelectItem value="language">Language</SelectItem>
                        <SelectItem value="tool">Tool</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={skill.proficiency}
                      onValueChange={(value) => {
                        const updated = [...watch('skills')];
                        updated[idx].proficiency = value as typeof proficiencyOptions[number];
                        setValue('skills', updated);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Level" />
                      </SelectTrigger>
                      <SelectContent>
                        {proficiencyOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-3 text-destructive"
                    onClick={() => {
                      setValue(
                        'skills',
                        watch('skills').filter((_, skillIndex) => skillIndex !== idx)
                      );
                    }}
                  >
                    Remove skill
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">Experience & education</p>
            <h3 className="text-lg font-semibold">Tell your journey</h3>
          </div>
          <Badge variant="outline">Drag & drop coming soon</Badge>
        </div>

        <div className="mt-6 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Experience</p>
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  appendExperience({
                    id: crypto.randomUUID(),
                    company: '',
                    position: '',
                    startDate: '',
                    endDate: '',
                    isCurrent: false,
                    responsibilities: '',
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add experience
              </Button>
            </div>

            {experienceFields.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Document your internships, jobs, and volunteer roles.
              </p>
            )}

            <div className="space-y-6">
              {experienceFields.map((exp, index) => (
                <div key={exp.id} className="rounded-2xl border p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input placeholder="Company" {...register(`experience.${index}.company` as const)} />
                    <Input placeholder="Role" {...register(`experience.${index}.position` as const)} />
                    <Input placeholder="Location" {...register(`experience.${index}.location` as const)} />
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-1 flex-col">
                        <label className="text-xs text-muted-foreground">Start date</label>
                        <Input type="date" {...register(`experience.${index}.startDate` as const)} />
                      </div>
                      {!watch(`experience.${index}.isCurrent`) && (
                        <div className="flex flex-1 flex-col">
                          <label className="text-xs text-muted-foreground">End date</label>
                          <Input type="date" {...register(`experience.${index}.endDate` as const)} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center space-x-2">
                    <Checkbox
                      checked={watch(`experience.${index}.isCurrent`)}
                      onCheckedChange={(checked) => setValue(`experience.${index}.isCurrent`, Boolean(checked))}
                      id={`experience-current-${index}`}
                    />
                    <label htmlFor={`experience-current-${index}`} className="text-sm">
                      I currently work here
                    </label>
                  </div>
                  <Textarea
                    className="mt-3"
                    rows={4}
                    placeholder="Key responsibilities and achievements"
                    {...register(`experience.${index}.responsibilities` as const)}
                  />
                  <div className="mt-3 flex justify-end">
                    <Button type="button" variant="ghost" className="text-destructive" onClick={() => removeExperience(index)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove experience
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Education</p>
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  appendEducation({
                    id: crypto.randomUUID(),
                    institution: '',
                    degree: '',
                    fieldOfStudy: '',
                    startDate: '',
                    endDate: '',
                    isCurrent: false,
                    description: '',
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add education
              </Button>
            </div>
            
            {educationFields.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Add your educational background.
              </p>
            )}

            <div className="space-y-6">
              {educationFields.map((edu, index) => (
                <div key={edu.id} className="rounded-2xl border p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input placeholder="Institution" {...register(`education.${index}.institution` as const)} />
                    <Input placeholder="Degree" {...register(`education.${index}.degree` as const)} />
                    <Input placeholder="Field of study" {...register(`education.${index}.fieldOfStudy` as const)} />
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-1 flex-col">
                        <label className="text-xs text-muted-foreground">Start date</label>
                        <Input type="date" {...register(`education.${index}.startDate` as const)} />
                      </div>
                      {!watch(`education.${index}.isCurrent`) && (
                        <div className="flex flex-1 flex-col">
                          <label className="text-xs text-muted-foreground">End date</label>
                          <Input type="date" {...register(`education.${index}.endDate` as const)} />
                        </div>
                      )}
                    </div>
                  </div>
                  <Textarea
                    className="mt-3"
                    rows={3}
                    placeholder="Description (optional)"
                    {...register(`education.${index}.description` as const)}
                  />
                  <div className="mt-3 flex justify-end">
                    <Button type="button" variant="ghost" className="text-destructive" onClick={() => removeEducation(index)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove education
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={saving || !isDirty}>
              {saving ? 'Saving…' : 'Save profile'}
            </Button>
          </div>
        </div>
      </section>
    </form>
  );
};

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm, Controller, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { auth } from "@/integrations/firebase/client";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { createProfile, setUserRole, uploadFile } from "@/integrations/firebase/services";
import { AUTH_ROLE_CACHE_KEY } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Upload, ArrowLeft } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const youthSignupSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  country: z.string().min(2, "Please enter your country"),
  city: z.string().min(2, "Please enter your city"),
  age: z.coerce.number({ invalid_type_error: "Please enter your age" }).min(16, "Must be at least 16 years old").max(100),
  talentArea: z.string().min(2, "Please specify your talent area"),
  bio: z.string().min(20, "Bio must be at least 20 characters").max(500),
  preferredCareerField: z.string().min(2, "Please select a career field"),
  termsAccepted: z.boolean().refine((val) => val === true, "You must accept the terms and conditions"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type YouthSignupForm = z.infer<typeof youthSignupSchema>;

const STEP1_FIELDS: (keyof YouthSignupForm)[] = ["fullName", "email", "password", "confirmPassword"];
const STEP2_FIELDS: (keyof YouthSignupForm)[] = ["country", "city", "age", "talentArea"];

const getSignupErrorMessage = (error: { code?: string; message?: string }) => {
  switch (error.code) {
    case "auth/email-already-in-use":
      return "This email is already registered. Please log in instead.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 8 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    default:
      return error.message || "An error occurred during sign up";
  }
};

const cacheRoleAndNavigate = (role: string, navigate: ReturnType<typeof useNavigate>, path: string) => {
  try {
    sessionStorage.setItem(AUTH_ROLE_CACHE_KEY, role);
  } catch {
    // ignore
  }
  navigate(path);
};

export default function YouthSignup() {
  const [step, setStep] = useState(1);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    trigger,
  } = useForm<YouthSignupForm>({
    resolver: zodResolver(youthSignupSchema),
    shouldUnregister: false,
    defaultValues: {
      termsAccepted: false,
      preferredCareerField: "",
    },
  });

  const progressValue = (step / 3) * 100;

  const onInvalid = (fieldErrors: FieldErrors<YouthSignupForm>) => {
    const firstError = Object.values(fieldErrors)[0];
    toast({
      title: "Please complete all required fields",
      description: firstError?.message?.toString() || "Check the form for missing or invalid information.",
      variant: "destructive",
    });
  };

  const onSubmit = async (data: YouthSignupForm) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      if (!user) throw new Error("User creation failed");
      const userId = user.uid;

      let profileImageUrl: string | undefined;
      if (profileImage) {
        try {
          const fileExt = profileImage.name.split(".").pop();
          profileImageUrl = await uploadFile(profileImage, `profile-images/${userId}/profile.${fileExt}`);
        } catch (uploadError) {
          console.warn("Profile image upload failed, continuing:", uploadError);
        }
      }

      let cvUrl: string | undefined;
      if (cvFile) {
        try {
          const fileExt = cvFile.name.split(".").pop();
          cvUrl = await uploadFile(cvFile, `cvs/${userId}/cv.${fileExt}`);
        } catch (uploadError) {
          console.warn("CV upload failed, continuing:", uploadError);
        }
      }

      await createProfile({
        userId,
        email: data.email,
        fullName: data.fullName,
        country: data.country,
        city: data.city,
        age: data.age,
        talentArea: data.talentArea,
        bio: data.bio,
        preferredCareerField: data.preferredCareerField,
        profileImageUrl,
        cvUrl,
      });
      await setUserRole(userId, "youth");

      toast({
        title: "Account created successfully!",
        description: "Welcome to Talent Search Africa!",
      });

      cacheRoleAndNavigate("youth", navigate, "/youth-dashboard");
    } catch (error: unknown) {
      console.error("Signup error:", error);
      toast({
        title: "Sign up failed",
        description: getSignupErrorMessage(error as { code?: string; message?: string }),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = async () => {
    const fields = step === 1 ? STEP1_FIELDS : STEP2_FIELDS;
    const valid = await trigger(fields);
    if (valid) {
      setStep((s) => Math.min(s + 1, 3));
    } else {
      toast({
        title: "Please complete this step",
        description: "Fill in all required fields before continuing.",
        variant: "destructive",
      });
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <div className="space-y-3">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input id="fullName" placeholder="Enter your full name" autoComplete="off" {...register("fullName")} />
              {errors.fullName && <p className="text-sm text-red-500">{errors.fullName.message}</p>}
            </div>
            <div className="space-y-3">
              <Label htmlFor="email">Email Address *</Label>
              <Input id="email" type="email" placeholder="your.email@example.com" autoComplete="new-email" {...register("email")} />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-3">
              <Label htmlFor="password">Password *</Label>
              <Input id="password" type="password" placeholder="Minimum 8 characters" autoComplete="new-password" {...register("password")} />
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>
            <div className="space-y-3">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input id="confirmPassword" type="password" placeholder="Re-enter your password" autoComplete="new-password" {...register("confirmPassword")} />
              {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>}
            </div>
            <div className="space-y-3">
              <Label>Profile Picture (Optional)</Label>
              <label htmlFor="profileImage" className="cursor-pointer border-2 border-dashed rounded-md p-4 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors">
                <Upload className="h-5 w-5 mr-2" />
                <span>{profileImage ? profileImage.name : "Upload Photo"}</span>
                <input id="profileImage" type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setProfileImage(e.target.files[0]); }} />
              </label>
            </div>
          </>
        );
      case 2:
        return (
          <>
            <div className="space-y-3">
              <Label htmlFor="country">Country *</Label>
              <Input id="country" placeholder="Enter your country" autoComplete="off" {...register("country")} />
              {errors.country && <p className="text-sm text-red-500">{errors.country.message}</p>}
            </div>
            <div className="space-y-3">
              <Label htmlFor="city">City *</Label>
              <Input id="city" placeholder="Enter your city" autoComplete="off" {...register("city")} />
              {errors.city && <p className="text-sm text-red-500">{errors.city.message}</p>}
            </div>
            <div className="space-y-3">
              <Label htmlFor="age">Age *</Label>
              <Input id="age" type="number" min="16" max="100" placeholder="Enter your age" autoComplete="off" {...register("age")} />
              {errors.age && <p className="text-sm text-red-500">{errors.age.message}</p>}
            </div>
            <div className="space-y-3">
              <Label htmlFor="talentArea">Your Talent Area *</Label>
              <Input id="talentArea" placeholder="e.g., Web Development, Graphic Design, Music" autoComplete="off" {...register("talentArea")} />
              {errors.talentArea && <p className="text-sm text-red-500">{errors.talentArea.message}</p>}
            </div>
          </>
        );
      case 3:
        return (
          <>
            <div className="space-y-3">
              <Label htmlFor="preferredCareerField">Preferred Career Field *</Label>
              <Controller
                name="preferredCareerField"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select career field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.preferredCareerField && <p className="text-sm text-red-500">{errors.preferredCareerField.message}</p>}
            </div>
            <div className="space-y-3">
              <Label htmlFor="bio">About You *</Label>
              <Textarea id="bio" placeholder="Tell us about yourself, your skills, and your aspirations..." autoComplete="off" {...register("bio")} className="min-h-[120px]" />
              <p className="text-xs text-muted-foreground">Minimum 20 characters</p>
              {errors.bio && <p className="text-sm text-red-500">{errors.bio.message}</p>}
            </div>
            <div className="space-y-3">
              <Label>Upload CV/Resume (Optional)</Label>
              <label htmlFor="cvFile" className="cursor-pointer border-2 border-dashed rounded-md p-4 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors w-full">
                <Upload className="h-5 w-5 mr-2" />
                <span>{cvFile ? cvFile.name : "Upload CV/Resume (PDF, DOC, DOCX)"}</span>
                <input id="cvFile" type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setCvFile(e.target.files[0]); }} />
              </label>
            </div>
            <div className="flex items-start space-x-2 pt-2">
              <Controller
                name="termsAccepted"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="terms"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                )}
              />
              <div className="grid gap-1.5 leading-none">
                <label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  I agree to the <a href="/terms" className="text-primary hover:underline">Terms of Service</a> and{" "}
                  <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
                </label>
                {errors.termsAccepted && <p className="text-sm text-red-500">{errors.termsAccepted.message}</p>}
              </div>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Youth Sign Up</CardTitle>
              <CardDescription>Join our talent community and showcase your skills</CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back Home</Link>
            </Button>
          </div>
          <div className="pt-2">
            <Progress value={progressValue} className="h-2" />
            <p className="text-sm text-muted-foreground mt-1">
              Step {step} of 3: {step === 1 ? "Basic Info" : step === 2 ? "Location & Skills" : "Final Details"}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6" autoComplete="off">
            {renderStep()}
            {step < 3 ? (
              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={prevStep} disabled={step === 1}>Previous</Button>
                <Button type="button" onClick={nextStep}>Next Step</Button>
              </div>
            ) : (
              <div className="pt-4">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating Account..." : "Complete Registration"}
                </Button>
                <Button type="button" variant="ghost" onClick={prevStep} className="w-full mt-2">Back</Button>
              </div>
            )}
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">Log in</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

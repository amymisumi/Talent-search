import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { auth } from "@/integrations/firebase/client";
import { createUserWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { createProfile, setUserRole, uploadFile } from "@/integrations/firebase/services";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Upload, Sparkles, ArrowLeft } from "lucide-react";
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
  age: z.number().min(16, "Must be at least 16 years old").max(100),
  talentArea: z.string().min(2, "Please specify your talent area"),
  bio: z.string().min(20, "Bio must be at least 20 characters").max(500),
  preferredCareerField: z.string().min(2, "Please select a career field"),
  termsAccepted: z.boolean().refine(val => val === true, "You must accept the terms and conditions"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type YouthSignupForm = z.infer<typeof youthSignupSchema>;

export default function YouthSignup() {
  const [step, setStep] = useState(1);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser, loading: authLoading } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<YouthSignupForm>({
    resolver: zodResolver(youthSignupSchema),
    defaultValues: {
      termsAccepted: false,
    },
  });

  const progressValue = (step / 3) * 100;

  const onSubmit = async (data: YouthSignupForm) => {
    console.log("Form submitted with data:", data);
    setIsLoading(true);
    try {
      // Sign up user
      console.log("Creating user with email:", data.email);
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      if (!user) throw new Error("User creation failed");

      const userId = user.uid;
      console.log("User created with ID:", userId);

      // Upload profile image if provided
      let profileImageUrl = null;
      if (profileImage) {
        try {
          const fileExt = profileImage.name.split('.').pop();
          const filePath = `profile-images/${userId}/profile.${fileExt}`;
          console.log("Uploading profile image:", filePath);
          profileImageUrl = await uploadFile(profileImage, filePath);
        } catch (uploadError) {
          console.warn("Profile image upload failed, continuing without it:", uploadError);
        }
      }

      // Upload CV if provided
      let cvUrl = null;
      if (cvFile) {
        try {
          const fileExt = cvFile.name.split('.').pop();
          const filePath = `cvs/${userId}/cv.${fileExt}`;
          console.log("Uploading CV:", filePath);
          cvUrl = await uploadFile(cvFile, filePath);
        } catch (uploadError) {
          console.warn("CV upload failed, continuing without it:", uploadError);
        }
      }

      // Create profile
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
        profileImageUrl: profileImageUrl || undefined,
        cvUrl: cvUrl || undefined,
      });

      // Set user role to youth
      await setUserRole(userId, 'youth');

      // Show success message
      toast({
        title: "Account created successfully!",
        description: "Welcome to Talent Search Africa!",
      });

      // Wait for auth state to be fully ready
      // Use window.location to force a hard navigation, bypassing React Router state issues
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Use window.location.href for a hard navigation to ensure auth state is recognized
      window.location.href = "/youth-dashboard";
    } catch (error: any) {
      console.error("Signup error:", error);
      toast({
        title: "Sign up failed",
        description: error.message || "An error occurred during sign up",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (step < 3) setStep(step + 1);
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
              <Input
                id="fullName"
                placeholder="Enter your full name"
                {...register("fullName")}
                className="mt-1"
              />
              {errors.fullName && (
                <p className="text-sm text-red-500 mt-1">{errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                {...register("email")}
                className="mt-1"
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 8 characters"
                {...register("password")}
                className="mt-1"
              />
              {errors.password && (
                <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                {...register("confirmPassword")}
                className="mt-1"
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500 mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label>Profile Picture (Optional)</Label>
              <div className="flex items-center space-x-4">
                <label
                  htmlFor="profileImage"
                  className="cursor-pointer border-2 border-dashed rounded-md p-4 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  <span>Upload Photo</span>
                  <input
                    id="profileImage"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setProfileImage(e.target.files[0]);
                      }
                    }}
                  />
                </label>
                {profileImage && (
                  <span className="text-sm text-gray-600">{profileImage.name}</span>
                )}
              </div>
            </div>
          </>
        );

      case 2:
        return (
          <>
            <div className="space-y-3">
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                placeholder="Enter your country"
                {...register("country")}
                className="mt-1"
              />
              {errors.country && (
                <p className="text-sm text-red-500 mt-1">{errors.country.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                placeholder="Enter your city"
                {...register("city")}
                className="mt-1"
              />
              {errors.city && (
                <p className="text-sm text-red-500 mt-1">{errors.city.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="age">Age *</Label>
              <Input
                id="age"
                type="number"
                min="16"
                max="100"
                placeholder="Enter your age"
                {...register("age", { valueAsNumber: true })}
                className="mt-1"
              />
              {errors.age && (
                <p className="text-sm text-red-500 mt-1">{errors.age.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="talentArea">Your Talent Area *</Label>
              <Input
                id="talentArea"
                placeholder="e.g., Web Development, Graphic Design, Music"
                {...register("talentArea")}
                className="mt-1"
              />
              {errors.talentArea && (
                <p className="text-sm text-red-500 mt-1">{errors.talentArea.message}</p>
              )}
            </div>
          </>
        );

      case 3:
        return (
          <>
            <div className="space-y-3">
              <Label htmlFor="preferredCareerField">Preferred Career Field *</Label>
              <Select onValueChange={(value) => setValue("preferredCareerField", value)}>
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
              {errors.preferredCareerField && (
                <p className="text-sm text-red-500 mt-1">{errors.preferredCareerField.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="bio">About You *</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself, your skills, and your aspirations..."
                {...register("bio")}
                className="mt-1 min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground">
                Minimum 20 characters
              </p>
              {errors.bio && (
                <p className="text-sm text-red-500 mt-1">{errors.bio.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label>Upload CV/Resume (Optional)</Label>
              <div className="flex items-center space-x-4">
                <label
                  htmlFor="cvFile"
                  className="cursor-pointer border-2 border-dashed rounded-md p-4 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors w-full"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  <span>Upload CV/Resume (PDF, DOC, DOCX)</span>
                  <input
                    id="cvFile"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setCvFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>
              {cvFile && (
                <p className="text-sm text-gray-600">Selected file: {cvFile.name}</p>
              )}
            </div>

            <div className="flex items-start space-x-2 pt-2">
              <Checkbox
                id="terms"
                onCheckedChange={(checked) => setValue("termsAccepted", checked === true)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="terms"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I agree to the <a href="/terms" className="text-primary hover:underline">Terms of Service</a> and{' '}
                  <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
                </label>
                {errors.termsAccepted && (
                  <p className="text-sm text-red-500">{errors.termsAccepted.message}</p>
                )}
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
              <CardDescription>
                Join our talent community and showcase your skills
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back Home
              </Link>
            </Button>
          </div>
          <div className="pt-2">
            <Progress value={progressValue} className="h-2" />
            <p className="text-sm text-muted-foreground mt-1">
              Step {step} of 3: {step === 1 ? 'Basic Info' : step === 2 ? 'Location & Skills' : 'Final Details'}
            </p>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {renderStep()}

            {step < 3 ? (
              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={step === 1}
                >
                  Previous
                </Button>
                <Button type="button" onClick={nextStep}>
                  Next Step
                </Button>
              </div>
            ) : (
              <div className="pt-4">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : 'Complete Registration'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={prevStep}
                  className="w-full mt-2"
                >
                  Back
                </Button>
              </div>
            )}
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Log in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

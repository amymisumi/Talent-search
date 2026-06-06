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

const recruiterSignupSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  recruiterName: z.string().min(2, "Recruiter name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  country: z.string().min(2, "Please enter your country"),
  industryType: z.string().min(2, "Please select an industry type"),
  companyWebsite: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  companyDescription: z.string().min(20, "Description must be at least 20 characters").max(500),
  termsAccepted: z.boolean().refine((val) => val === true, "You must accept the terms and conditions"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RecruiterSignupForm = z.infer<typeof recruiterSignupSchema>;

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

export default function RecruiterSignup() {
  const [companyLogo, setCompanyLogo] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RecruiterSignupForm>({
    resolver: zodResolver(recruiterSignupSchema),
    defaultValues: {
      termsAccepted: false,
      industryType: "",
      companyWebsite: "",
    },
  });

  const onInvalid = (fieldErrors: FieldErrors<RecruiterSignupForm>) => {
    const firstError = Object.values(fieldErrors)[0];
    toast({
      title: "Please complete all required fields",
      description: firstError?.message?.toString() || "Check the form for missing or invalid information.",
      variant: "destructive",
    });
  };

  const onSubmit = async (data: RecruiterSignupForm) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      if (!user) throw new Error("User creation failed");
      const userId = user.uid;

      let companyLogoUrl: string | undefined;
      if (companyLogo) {
        try {
          const fileExt = companyLogo.name.split(".").pop();
          companyLogoUrl = await uploadFile(companyLogo, `company-logos/${userId}/logo.${fileExt}`);
        } catch (uploadError) {
          console.warn("Company logo upload failed, continuing:", uploadError);
        }
      }

      await createProfile({
        userId,
        email: data.email,
        fullName: data.recruiterName,
        country: data.country,
        companyName: data.companyName,
        companyWebsite: data.companyWebsite || undefined,
        companyLogoUrl,
        industryType: data.industryType,
        companyDescription: data.companyDescription,
      });
      await setUserRole(userId, "recruiter");

      toast({
        title: "Account created successfully!",
        description: "Welcome to Talent Search Africa. Redirecting to your dashboard...",
      });

      cacheRoleAndNavigate("recruiter", navigate, "/recruiter-dashboard");
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="relative">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Recruiter Sign Up</CardTitle>
              <CardDescription>Create your recruiter account to find top talent</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild className="absolute right-4 top-4">
              <Link to="/" className="flex items-center">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back Home
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6" autoComplete="off">
            <div className="space-y-3">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input id="companyName" placeholder="Enter company name" autoComplete="off" {...register("companyName")} />
              {errors.companyName && <p className="text-sm text-red-500">{errors.companyName.message}</p>}
            </div>
            <div className="space-y-3">
              <Label htmlFor="recruiterName">Recruiter&apos;s Full Name *</Label>
              <Input id="recruiterName" placeholder="Enter your full name" autoComplete="off" {...register("recruiterName")} />
              {errors.recruiterName && <p className="text-sm text-red-500">{errors.recruiterName.message}</p>}
            </div>
            <div className="space-y-3">
              <Label htmlFor="email">Work Email *</Label>
              <Input id="email" type="email" autoComplete="new-email" {...register("email")} placeholder="your.email@company.com" />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-3">
              <Label htmlFor="password">Password *</Label>
              <Input id="password" type="password" autoComplete="new-password" {...register("password")} placeholder="Minimum 8 characters" />
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>
            <div className="space-y-3">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input id="confirmPassword" type="password" autoComplete="new-password" {...register("confirmPassword")} placeholder="Re-enter your password" />
              {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>}
            </div>
            <div className="space-y-3">
              <Label htmlFor="country">Country *</Label>
              <Input id="country" placeholder="Enter your country" autoComplete="off" {...register("country")} />
              {errors.country && <p className="text-sm text-red-500">{errors.country.message}</p>}
            </div>
            <div className="space-y-3">
              <Label htmlFor="industryType">Industry Type *</Label>
              <Controller
                name="industryType"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select industry type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.industryType && <p className="text-sm text-red-500">{errors.industryType.message}</p>}
            </div>
            <div className="space-y-3">
              <Label htmlFor="companyWebsite">Company Website (Optional)</Label>
              <Input id="companyWebsite" type="url" autoComplete="off" placeholder="https://example.com" {...register("companyWebsite")} />
              {errors.companyWebsite && <p className="text-sm text-red-500">{errors.companyWebsite.message}</p>}
            </div>
            <div className="space-y-3">
              <Label htmlFor="companyDescription">Company Description *</Label>
              <Textarea id="companyDescription" placeholder="Tell us about your company..." autoComplete="off" {...register("companyDescription")} className="min-h-[100px]" />
              {errors.companyDescription && <p className="text-sm text-red-500">{errors.companyDescription.message}</p>}
            </div>
            <div className="space-y-3">
              <Label>Company Logo (Optional)</Label>
              <label htmlFor="companyLogo" className="cursor-pointer border-2 border-dashed rounded-md p-4 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors">
                <Upload className="h-5 w-5 mr-2" />
                <span>{companyLogo ? companyLogo.name : "Upload Logo"}</span>
                <input id="companyLogo" type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setCompanyLogo(e.target.files[0]); }} />
              </label>
            </div>
            <div className="flex items-start space-x-2">
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
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>
            <div className="text-center text-sm">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">Sign in</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

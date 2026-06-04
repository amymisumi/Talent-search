import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

import { auth } from "@/integrations/firebase/client";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import { getUserRole, setUserRole } from "@/integrations/firebase/services";
import { useToast } from "@/hooks/use-toast";
import { Globe, ArrowRight, Home } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["youth", "recruiter", "admin"], {
    required_error: "Please select your role",
  }),
  rememberMe: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

const redirectToRole = (role: string, navigate: ReturnType<typeof useNavigate>) => {
  switch (role) {
    case 'youth':     return navigate('/youth-dashboard');
    case 'recruiter': return navigate('/recruiter-dashboard');
    case 'admin':     return navigate('/admin-dashboard');
    default:          return navigate('/');
  }
};

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { role: "youth" },
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email.trim(), data.password);
      const user = userCredential.user;
      if (!user) throw new Error('Failed to sign in. Please try again.');

      const userRole = await getUserRole(user.uid);

      if (userRole && userRole !== data.role) {
        throw new Error(`This account is registered as "${userRole}". Please select that role.`);
      }
      if (!userRole) {
        await setUserRole(user.uid, data.role);
      }

      toast({
        title: "Login successful!",
        description: `Welcome back! Redirecting to your ${data.role} dashboard...`,
      });

      redirectToRole(data.role, navigate);
    } catch (error: any) {
      let errorMessage = 'Failed to sign in. Please try again.';
      if (error.code === 'auth/user-not-found')    errorMessage = 'No account found with this email.';
      else if (error.code === 'auth/wrong-password') errorMessage = 'Incorrect password.';
      else if (error.code === 'auth/too-many-requests') errorMessage = 'Too many attempts. Try again later.';
      else if (error.code === 'auth/invalid-email') errorMessage = 'Please enter a valid email address.';
      else if (error.code === 'auth/user-disabled') errorMessage = 'This account has been disabled.';
      else if (error.message) errorMessage = error.message;

      toast({ title: 'Login failed', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if this user already has a role in Firestore
      const existingRole = await getUserRole(user.uid);

      if (existingRole) {
        // Returning user — use their stored role
        toast({
          title: "Welcome back!",
          description: `Redirecting to your ${existingRole} dashboard...`,
        });
        redirectToRole(existingRole, navigate);
      } else {
        // New user via Google — assign the role they selected on the form
        await setUserRole(user.uid, selectedRole);
        toast({
          title: "Account created!",
          description: `Welcome to Talent Search Africa!`,
        });

        // Wait for auth state to be confirmed before navigating
        await new Promise<void>((resolve) => {
          const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) { unsubscribe(); resolve(); }
          });
        });

        redirectToRole(selectedRole, navigate);
      }
    } catch (error: any) {
      // User closed the popup — don't show an error
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return;
      }
      toast({
        title: "Google sign-in failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-accent to-primary/80 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMSI+PHBhdGggZD0iTTM2IDE0YzMuMzEzIDAgNiAyLjY4NyA2IDZzLTIuNjg3IDYtNiA2LTYtMi42ODctNi02IDIuNjg3LTYgNi02ek0yNCA0MGMzLjMxMyAwIDYgMi42ODcgNiA2cy0yLjY4NyA2LTYgNi02LTIuNjg3LTYtNiAyLjY4Ny02IDYtNnoiLz48L2c+PC9nPjwvc3ZnPg==')] bg-repeat"></div>
      </div>

      <Card className="w-full max-w-md shadow-2xl relative bg-white dark:bg-slate-900 border-border">
        <CardHeader className="text-center space-y-3 pb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Globe className="h-10 w-10 text-primary animate-pulse" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Talent Search Africa
          </CardTitle>
          <CardDescription className="text-base italic text-muted-foreground">
            "Show the world your skills — log in to your future."
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Role Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground">Login as</Label>
              <div className="flex gap-3">
                {(['youth', 'recruiter', 'admin'] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setValue("role", role)}
                    className={`flex-1 py-2 px-4 rounded-md border transition-colors text-sm font-medium capitalize ${
                      selectedRole === role
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-card-foreground border-border hover:bg-secondary'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
              {errors.role && <p className="text-sm text-red-500">{errors.role.message}</p>}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" {...register("email")} placeholder="your.email@example.com" className="h-11" />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Forgot Password?
                </Link>
              </div>
              <Input id="password" type="password" {...register("password")} placeholder="Enter your password" className="h-11" />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>

            {/* Remember Me */}
            <div className="flex items-center space-x-2">
              <Checkbox id="rememberMe" onCheckedChange={(checked) => setValue("rememberMe", checked as boolean)} />
              <label htmlFor="rememberMe" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Remember me
              </label>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full h-11 text-base bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity">
              {isLoading ? "Signing in..." : "Login to Dashboard"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or continue with</span>
            </div>
          </div>

          {/* Google Sign-In */}
          {/* Hint for new users */}
          <p className="text-xs text-center text-muted-foreground -mb-2">
            New here? Select your role above first, then sign in with Google to create your account.
          </p>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full flex items-center justify-center py-2 px-4 border border-border rounded-md shadow-sm bg-card text-sm font-medium text-card-foreground hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary h-11 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isGoogleLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Signing in...
              </span>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </>
            )}
          </button>

          {/* Sign Up Links */}
          <div className="space-y-2 text-center text-sm">
            <p className="text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/youth-signup" className="text-primary hover:underline font-medium">Create Youth Account</Link>
            </p>
            <p className="text-muted-foreground">
              Recruiter?{" "}
              <Link to="/recruiter-signup" className="text-primary hover:underline font-medium">Register here</Link>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Back to Home */}
      <div className="absolute top-4 left-4 md:top-6 md:left-6 z-50">
        <Link to="/" className="group flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors bg-white/80 backdrop-blur-sm rounded-md border border-border hover:border-primary/20 shadow-sm">
          <Home className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-300" />
          <span>{t('backToHome')}</span>
        </Link>
      </div>

      {/* Language Toggle */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6 z-50">
        <LanguageToggle />
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary"></div>
    </div>
  );
}
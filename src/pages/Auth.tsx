import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth } from "../integrations/firebase/client";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged,
  AuthError,
  UserCredential
} from "firebase/auth";
import { setUserRole, getUserRole, UserRole } from "../integrations/firebase/services";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Briefcase } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { z } from "zod";

type AuthRole = 'youth' | 'recruiter' | 'admin';

const authSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Full name is required").max(100).optional(),
});

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState<AuthRole>(
    (searchParams.get('role') as AuthRole) || 'youth'
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate('/');
      }
    });
    return unsubscribe;
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;

    try {
      // Validate form data
      const validatedData = authSchema.parse({ email, password, fullName });
      
      // Create user with email and password
      let userCredential: UserCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } catch (error) {
        const authError = error as AuthError;
        throw new Error(
          authError.code === 'auth/email-already-in-use'
            ? 'This email is already registered. Please sign in instead.'
            : 'Failed to create account. Please try again.'
        );
      }

      const user = userCredential.user;
      if (!user) throw new Error('Failed to create user account');

      // Set user role
      try {
        await setUserRole(user.uid, role);
      } catch (error) {
        console.error('Failed to set user role:', error);
        // Continue even if role setting fails - we'll handle it on login
      }

      toast({
        title: "Account created!",
        description: "Welcome to Talent Search Africa. Let's set up your profile.",
      });

      // Redirect based on role
      navigate(role === 'youth' ? '/youth-dashboard' : '/recruiter-dashboard');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        variant: "destructive",
        title: "Sign up failed",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      // Validate the form data
      authSchema.omit({ fullName: true }).parse({ email, password });

      // Special handling for admin login
      if (role === 'admin') {
        if (email !== 'admin@gmail.com' || password !== 'admin23') {
          throw new Error('Invalid admin credentials. Access denied.');
        }
      }

      // Sign in the user
      let userCredential: UserCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (error) {
        const authError = error as AuthError;
        throw new Error(
          authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password'
            ? 'Invalid email or password.'
            : 'Failed to sign in. Please try again.'
        );
      }

      const user = userCredential.user;
      if (!user) throw new Error('Failed to authenticate user');

      // For admin role, ensure the role is set in Firestore
      if (role === 'admin') {
        try {
          await setUserRole(user.uid, 'admin');
        } catch (error) {
          console.error('Failed to set admin role:', error);
        }
      }

      // Get the user's role
      const userRole = await getUserRole(user.uid);
      console.log('User role after sign in:', userRole);

      toast({
        title: "Welcome back!",
        description: "Successfully logged in.",
      });

      // Redirect based on user role
      switch (userRole) {
        case 'youth':
          navigate('/youth-dashboard');
          break;
        case 'recruiter':
          navigate('/recruiter-dashboard');
          break;
        case 'admin':
          navigate('/admin-dashboard');
          break;
        default:
          console.warn('No role set for user, redirecting to home');
          navigate('/');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        variant: "destructive",
        title: "Login failed",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-accent/5 to-transparent p-4">
      <Card className="w-full max-w-md p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <Briefcase className="h-12 w-12 text-primary mb-4" />
          <h1 className="text-3xl font-bold">Talent Search Africa</h1>
          <p className="text-muted-foreground mt-2">Join as a {role}</p>
        </div>

        <div className="flex gap-2 mb-6">
          <Button
            variant={role === 'youth' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => setRole('youth')}
          >
            Youth
          </Button>
          <Button
            variant={role === 'recruiter' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => setRole('recruiter')}
          >
            Recruiter
          </Button>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-accent"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Full Name</Label>
                <Input
                  id="signup-name"
                  name="fullName"
                  type="text"
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-accent"
                disabled={isLoading}
              >
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default Auth;
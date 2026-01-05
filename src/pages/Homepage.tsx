import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link as LinkIcon, FileText, Search, Bell, Smartphone, Check, Star, Sparkles, Zap, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useLogoConfiguration } from "@/hooks/useLogoConfiguration";
import { PricingToggle } from "@/components/PricingToggle";
import { WaitlistDialog } from "@/components/WaitlistDialog";
import { FAQSection } from "@/components/FAQSection";
import { Capacitor } from "@capacitor/core";
import heroImage from "@/assets/hero1.jpg";
const Homepage = () => {
  const {
    currentLogoUrl
  } = useLogoConfiguration();
  const navigate = useNavigate();
  const location = useLocation();
  const [isYearly, setIsYearly] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [isSubmittingWaitlist, setIsSubmittingWaitlist] = useState(false);

  // Handle back button press to exit app on homepage (Android & iOS)
  useEffect(() => {
    // Only handle on native platforms (Android/iOS)
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let cleanup: (() => void) | null = null;

    // Dynamically import Capacitor App plugin only on native platforms
    import('@capacitor/app').then(({ App }) => {
      // Listen for back button press
      const listener = App.addListener('backButton', () => {
        // Check if we're on the homepage route
        if (location.pathname === '/' || location.pathname === '/home') {
          // Exit the app
          App.exitApp();
        }
      });

      cleanup = () => {
        listener.remove();
      };
    }).catch((error) => {
      console.warn('Capacitor App plugin not available:', error);
    });

    return () => {
      // Cleanup listener on unmount
      cleanup?.();
    };
  }, [location.pathname]);

  const handleSignInClick = () => {
    navigate('/auth/login');
  };
  const handleSignUpClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const {
        data,
        error
      } = await supabase.rpc('get_system_setting_bool', {
        _key: 'enable_new_user_registration'
      });
      if (error) {
        console.error('Failed to load registration setting', error);
      }
      if (data === false) {
        toast({
          title: 'Registration Disabled',
          description: 'New user registration is currently disabled by an administrator.',
          variant: 'destructive'
        });
        return;
      }
      navigate('/auth/signup');
    } catch (err) {
      console.error('Error checking registration setting', err);
      toast({
        title: 'Registration Unavailable',
        description: 'Please try again later.',
        variant: 'destructive'
      });
    }
  };
  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail || !waitlistEmail.includes('@')) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive'
      });
      return;
    }
    setIsSubmittingWaitlist(true);
    try {
      const {
        error
      } = await supabase.functions.invoke('waitlist', {
        body: {
          email: waitlistEmail,
          plan: 'gold'
        }
      });
      if (error) throw error;
      toast({
        title: 'Successfully Joined!',
        description: "You're on the Gold waitlist. We'll notify you when it launches!"
      });
      setWaitlistEmail("");
    } catch (error: any) {
      console.error('Waitlist error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to join waitlist. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmittingWaitlist(false);
    }
  };
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center">
              {currentLogoUrl && <img src={currentLogoUrl} alt="Tagmentia Logo" className="h-12 sm:h-14 md:h-16 w-auto max-w-[200px] sm:max-w-[250px]" />}
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-muted-foreground hover:text-primary transition-colors">Features</a>
              <a href="#pricing" className="text-muted-foreground hover:text-primary transition-colors">Pricing</a>
              <a href="#faq" className="text-muted-foreground hover:text-primary transition-colors">FAQ</a>
              <Button onClick={handleSignInClick} variant="ghost" className="text-muted-foreground hover:text-foreground">
                Sign In
              </Button>
            </nav>

            {/* CTA Button */}
            <div className="md:hidden">
              <Button onClick={handleSignUpClick} size="sm" className="bg-primary hover:bg-primary/90 text-white">
                Get Started Free
              </Button>
            </div>
            <div className="hidden md:block">
              <Button onClick={handleSignUpClick} className="bg-primary hover:bg-primary/90 text-white">
                Get Started Free
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6">
                <span className="text-foreground">Save smarter.</span>
                <br />
                <span className="bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
                  Organize faster.
                </span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Transform chaotic social media saving into an organized, searchable content library with visual snapshots and contextual notes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={handleSignUpClick} size="lg" className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-base font-medium rounded-lg">
                  Get Started Free
                </Button>
                <Button onClick={() => {
                document.getElementById('pricing')?.scrollIntoView({
                  behavior: 'smooth'
                });
              }} variant="outline" size="lg" className="px-8 py-6 text-base font-medium rounded-lg border-2">
                  See Pricing
                </Button>
              </div>
            </div>
            <div className="relative flex justify-center items-center">
              <div className="relative transform hover:scale-105 transition-transform duration-500 group">
                <img src={heroImage} alt="Tagmentia dashboard showing organized categories and videos" className="w-full max-w-4xl h-auto rounded-2xl shadow-elevated" loading="eager" />
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="text-sm font-medium text-foreground bg-background/95 border border-border px-3 py-2 rounded-full shadow-lg">
                    Dashboard & Mobile
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section id="features" className="py-20 px-6 bg-white">
        <div className="container mx-auto max-w-6xl text-center">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Everything You Need to Save & Organize
          </h2>
          <p className="text-xl text-muted-foreground mb-16 max-w-3xl mx-auto">
            Powerful features designed to keep your knowledge organized and accessible
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-8 text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <LinkIcon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  Save & Categorize
                </h3>
                <p className="text-muted-foreground">
                  One-tap add from YouTube, Instagram, TikTok, and more. 
                  Share directly to Tagmentia and organize instantly.
                </p>
              </CardContent>
            </Card>

            <Card className="p-8 text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Eye className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  Screenshots (Visual Notes)
                </h3>
                <p className="text-muted-foreground">
                  Attach screenshots to your saved links. 
                  Perfect for capturing key moments and diagrams.
                </p>
              </CardContent>
            </Card>

            <Card className="p-8 text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  Notes & Reminders
                </h3>
                <p className="text-muted-foreground">
                  Add context and set follow-ups for any item. 
                  Never forget to revisit important content.
                </p>
              </CardContent>
            </Card>

            <Card className="p-8 text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  Fast Search & Filters
                </h3>
                <p className="text-muted-foreground">
                  Find anything instantly by platform, category, or keyword. 
                  Your library, your way.
                </p>
              </CardContent>
            </Card>

            <Card className="p-8 text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Smartphone className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  Cross-Platform
                </h3>
                <p className="text-muted-foreground">
                  Seamless experience across web and mobile. 
                  Your content syncs everywhere.
                </p>
              </CardContent>
            </Card>

            <Card className="p-8 text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white border-2 border-primary/20">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  AI Features Coming Soon
                </h3>
                <p className="text-muted-foreground">
                  Smart summaries, auto-tags, and content recommendations coming soon.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 bg-gray-50">
        <div className="container mx-auto max-w-6xl text-center">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Flexible Plans for Every Need
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Start for free, upgrade anytime. No credit card required.
          </p>

          <PricingToggle onToggle={setIsYearly} />

          <div className="flex flex-wrap justify-center gap-8 max-w-2xl mx-auto">
            {/* Free Plan */}
            <Card className="p-8 hover:shadow-lg transition-shadow w-full sm:w-[320px]">
              <CardContent className="pt-6">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-foreground mb-2">Free</h3>
                  <div className="text-4xl font-bold text-foreground mb-2">
                    $0<span className="text-lg text-muted-foreground">/mo</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8 text-left">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-muted-foreground">Basic categories</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-muted-foreground">Limited snapshots (5)</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-muted-foreground">Notes & reminders (basic)</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-muted-foreground">Search & filters</span>
                  </li>
                </ul>
                <Button onClick={handleSignUpClick} variant="outline" className="w-full">
                  Get Started
                </Button>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card className="p-8 border-2 border-primary shadow-xl relative transform scale-105 w-full sm:w-[320px]">
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-white px-4 py-1">
                Best Value
              </Badge>
              <CardContent className="pt-6">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-foreground mb-2">Premium</h3>
                  <div className="text-4xl font-bold text-foreground mb-2">
                    ${isYearly ? '2.50' : '2.99'}
                    <span className="text-lg text-muted-foreground">Get Started</span>
                  </div>
                  {isYearly && <div className="text-sm text-green-600 font-semibold">
                      $29.99 billed yearly
                    </div>}
                </div>
                <ul className="space-y-3 mb-8 text-left">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-muted-foreground">Unlimited categories</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-muted-foreground">Unlimited videos per category</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-muted-foreground">Unlimited snapshots</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-muted-foreground">500 MB storage quota</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-muted-foreground">Share categories (view/copy)</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-muted-foreground">Priority support</span>
                  </li>
                </ul>
                <Button onClick={() => navigate('/auth/signup')} className="w-full bg-primary hover:bg-primary/90">
                  Get Started
                </Button>
              </CardContent>
            </Card>

            {/* Gold Plan - Disabled across all platforms */}
            {/* <Card className="p-8 hover:shadow-lg transition-shadow relative">
              <CardContent className="pt-6">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
                    Gold
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                  </h3>
                  <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-4 py-1">
                    Coming Soon
                  </Badge>
                </div>
                <ul className="space-y-3 mb-8 text-left">
                  <li className="flex items-center">
                    <Zap className="w-5 h-5 text-yellow-500 mr-3 flex-shrink-0" />
                    <span className="text-muted-foreground">AI-powered summaries</span>
                  </li>
                  <li className="flex items-center">
                    <Zap className="w-5 h-5 text-yellow-500 mr-3 flex-shrink-0" />
                    <span className="text-muted-foreground">Smart tags</span>
                  </li>
                  <li className="flex items-center">
                    <Zap className="w-5 h-5 text-yellow-500 mr-3 flex-shrink-0" />
                    <span className="text-muted-foreground">Recommended content</span>
                  </li>
                  <li className="flex items-center">
                    <Zap className="w-5 h-5 text-yellow-500 mr-3 flex-shrink-0" />
                    <span className="text-muted-foreground">OCR on snapshots</span>
                  </li>
                </ul>
                <Button onClick={() => setWaitlistOpen(true)} variant="outline" className="w-full border-2 border-primary text-primary hover:bg-primary hover:text-white">
                  Notify Me
                </Button>
              </CardContent>
            </Card> */}
          </div>
        </div>
      </section>

      {/* Waitlist Section - Gold Plan disabled */}
      {/* <section className="py-20 px-6 bg-gradient-to-br from-primary via-primary-glow to-primary">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Be first to experience AI-powered organization
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join the Gold plan waitlist and get early access to revolutionary AI features that will transform how you discover and organize content.
          </p> */}
          
          {/* <form onSubmit={handleWaitlistSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto mb-4">
            <Input type="email" placeholder="Enter your email" value={waitlistEmail} onChange={e => setWaitlistEmail(e.target.value)} className="flex-1 bg-white text-foreground px-6 py-6 text-base" required />
            <Button type="submit" disabled={isSubmittingWaitlist} className="bg-white text-primary hover:bg-white/90 px-8 py-6 text-base font-medium whitespace-nowrap">
              {isSubmittingWaitlist ? 'Joining...' : 'Join Waitlist'}
            </Button>
          </form>
          
          <p className="text-sm text-white/70">
            No spam, unsubscribe at any time.
          </p> */}
        {/* </div>
      </section> */}

      {/* Social Proof */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="container mx-auto max-w-6xl text-center">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Loved by Thousands
          </h2>
          <p className="text-xl text-muted-foreground mb-16">
            Real stories from people who transformed their content organization
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 bg-white hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex mb-4" role="img" aria-label="5 star rating">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-muted-foreground mb-6 italic">
                  "Tagmentia helps me keep my learning organized. I can finally find everything I saved!"
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full mr-4"></div>
                  <div className="text-left">
                    <div className="font-semibold text-foreground">Sarah K.</div>
                    <div className="text-sm text-muted-foreground bg-white">Graduate Student</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="p-8 bg-white hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex mb-4" role="img" aria-label="5 star rating">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-muted-foreground mb-6 italic">
                  "As a developer, I save tons of tutorial videos. Tagmentia keeps everything searchable."
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full mr-4 border-2 border-muted"></div>
                  <div className="text-left">
                    <div className="font-semibold text-foreground">Mike R.</div>
                    <div className="text-sm text-muted-foreground">Software Engineer</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="p-8 bg-white hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex mb-4" role="img" aria-label="5 star rating">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-muted-foreground mb-6 italic">
                  "The snapshot feature is brilliant! I capture key moments and find them instantly."
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full mr-4"></div>
                  <div className="text-left">
                    <div className="font-semibold text-foreground">Jessica L.</div>
                    <div className="text-sm text-muted-foreground">Content Creator</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQSection className="bg-white" />

      {/* Final CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-primary to-primary-glow">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Get Organized?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands who save and organize content smarter with Tagmentia.
          </p>
          <Button onClick={handleSignUpClick} size="lg" className="bg-white text-primary hover:bg-white/90 px-8 py-4 text-lg font-semibold">
            Get Started Free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="py-16 px-6 bg-gray-900 text-white">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center mb-4">
                {currentLogoUrl ? <img src={currentLogoUrl} alt="Tagmentia Logo" className="h-16 w-auto max-w-[250px] object-contain mr-2" /> : <div className="h-16 w-32 bg-muted/20 animate-pulse rounded mr-2" />}
              </div>
              <p className="text-gray-400 mb-4">
                Save smarter, organize faster with intelligent categories, 
                powerful search, and seamless syncing across all your devices.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/support" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms</Link></li>
                <li><Link to="/support" className="hover:text-white transition-colors">Help</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Disinnova Ltd. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <WaitlistDialog open={waitlistOpen} onOpenChange={setWaitlistOpen} plan="gold" />
    </div>;
};
export default Homepage;
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Mail, Instagram, Facebook, Linkedin, Target, Eye, Sparkles, Users, Building2, GraduationCap } from 'lucide-react';
import talentSearchBanner from '@/assets/talent-search-banner.jpg';
import LanguageToggle from '@/components/dashboard/LanguageToggle';
import { useLanguage } from '@/contexts/LanguageContext';

const NewAbout: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState<{ [key: string]: boolean }>({});
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Smooth scroll to sections
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash) {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible((prev) => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.1 }
    );

    const sections = document.querySelectorAll('[data-animate]');
    sections.forEach((section) => {
      if (observerRef.current) {
        observerRef.current.observe(section);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Language Toggle - Fixed Position */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageToggle />
      </div>

      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-primary/3 rounded-full blur-3xl animate-pulse-slow"></div>
      </div>

      {/* Enhanced Marquee Section */}
      <div className="relative bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 py-3 overflow-hidden border-b border-primary/20">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-shimmer"></div>
        <div className="animate-marquee whitespace-nowrap text-sm font-semibold">
          <span className="mx-8 text-primary inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4 animate-pulse" />
            Empowering African Youth
          </span>
          <span className="mx-8 text-accent">•</span>
          <span className="mx-8 text-primary">Verified Digital Talent</span>
          <span className="mx-8 text-accent">•</span>
          <span className="mx-8 text-primary">Global Career Access</span>
          <span className="mx-8 text-accent">•</span>
          <span className="mx-8 text-primary inline-flex items-center gap-2">
            Showcasing Skills Across Africa
            <Sparkles className="w-4 h-4 animate-pulse" />
          </span>
          <span className="mx-8 text-accent">•</span>
          <span className="mx-8 text-primary">Empowering African Youth</span>
          <span className="mx-8 text-accent">•</span>
          <span className="mx-8 text-primary">Verified Digital Talent</span>
          <span className="mx-8 text-accent">•</span>
          <span className="mx-8 text-primary">Global Career Access</span>
          <span className="mx-8 text-accent">•</span>
          <span className="mx-8 text-primary">Showcasing Skills Across Africa</span>
        </div>
      </div>

      {/* Hero Section with Animations */}
      <section 
        id="hero" 
        data-animate 
        className="relative py-16 md:py-24 px-4 md:px-6 max-w-7xl mx-auto"
      >
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className={`space-y-6 transition-all duration-1000 ${isVisible['hero'] ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
            <div className="inline-block">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                {t('aboutTitle')}
              </h1>
              <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-transparent rounded-full mt-2 animate-expand"></div>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              {t('aboutSubtitle')}
            </p>
            <div className="flex gap-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <span>Verified Talent</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                <span>Global Reach</span>
              </div>
            </div>
          </div>
          <div className={`relative group transition-all duration-1000 ${isVisible['hero'] ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-xl blur-lg opacity-25 group-hover:opacity-50 transition duration-500"></div>
            <div className="relative rounded-xl overflow-hidden transform group-hover:scale-[1.02] transition-transform duration-500">
              <img 
                src={talentSearchBanner} 
                alt="Talent Search Africa" 
                className="w-full h-auto rounded-xl object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section with Card Effect */}
      <section 
        id="mission" 
        data-animate 
        className="relative py-16 px-4 md:px-6"
      >
        <div className="max-w-4xl mx-auto">
          <Card className={`relative overflow-hidden border-2 border-primary/10 bg-gradient-to-br from-background via-primary/5 to-background p-8 md:p-12 shadow-xl hover:shadow-2xl transition-all duration-500 ${isVisible['mission'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative">
              <div className="flex items-center justify-center mb-6">
                <div className="p-4 bg-primary/10 rounded-full animate-pulse-slow">
                  <Target className="w-8 h-8 text-primary" />
                </div>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {t('ourMission')}
              </h2>
              <div className="h-1 w-24 bg-gradient-to-r from-primary to-accent rounded-full mx-auto mb-8"></div>
              <p className="text-lg text-center text-muted-foreground leading-relaxed">
                {t('missionText')}
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Vision Section with Card Effect */}
      <section 
        id="vision" 
        data-animate 
        className="relative py-16 px-4 md:px-6"
      >
        <div className="max-w-4xl mx-auto">
          <Card className={`relative overflow-hidden border-2 border-accent/10 bg-gradient-to-br from-background via-accent/5 to-background p-8 md:p-12 shadow-xl hover:shadow-2xl transition-all duration-500 ${isVisible['vision'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
            <div className="relative">
              <div className="flex items-center justify-center mb-6">
                <div className="p-4 bg-accent/10 rounded-full animate-pulse-slow" style={{ animationDelay: '0.5s' }}>
                  <Eye className="w-8 h-8 text-accent" />
                </div>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                {t('ourVision')}
              </h2>
              <div className="h-1 w-24 bg-gradient-to-r from-accent to-primary rounded-full mx-auto mb-8"></div>
              <p className="text-lg text-center text-muted-foreground leading-relaxed">
                {t('visionText')}
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Why Us Section */}
      <section 
        id="why-us" 
        data-animate 
        className="relative py-16 px-4 md:px-6 bg-gradient-to-b from-transparent via-muted/30 to-transparent"
      >
        <div className="max-w-5xl mx-auto">
          <div className={`text-center mb-12 transition-all duration-1000 ${isVisible['why-us'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              {t('whyUsTitle')}
            </h2>
            <div className="h-1 w-32 bg-gradient-to-r from-primary via-accent to-primary rounded-full mx-auto"></div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className={`group relative overflow-hidden p-6 border-2 border-primary/10 bg-gradient-to-br from-background to-primary/5 hover:border-primary/30 transition-all duration-500 hover:shadow-xl hover:-translate-y-1 ${isVisible['why-us'] ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors duration-500"></div>
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg group-hover:scale-110 transition-transform duration-300">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">{t('builtForAfricanYouth')}</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {t('builtForAfricanYouthText')}
                </p>
              </div>
            </Card>
            <Card className={`group relative overflow-hidden p-6 border-2 border-accent/10 bg-gradient-to-br from-background to-accent/5 hover:border-accent/30 transition-all duration-500 hover:shadow-xl hover:-translate-y-1 ${isVisible['why-us'] ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`} style={{ transitionDelay: '0.2s' }}>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/10 rounded-full blur-2xl group-hover:bg-accent/20 transition-colors duration-500"></div>
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-accent/10 rounded-lg group-hover:scale-110 transition-transform duration-300">
                    <Target className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="text-xl font-semibold">{t('simpleEffective')}</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {t('simpleEffectiveText')}
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Who We Serve Section with Interactive Cards */}
      <section 
        id="who-we-serve" 
        data-animate 
        className="relative py-16 px-4 md:px-6"
      >
        <div className="max-w-6xl mx-auto">
          <div className={`text-center mb-12 transition-all duration-1000 ${isVisible['who-we-serve'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              {t('whoWeServe')}
            </h2>
            <div className="h-1 w-32 bg-gradient-to-r from-primary via-accent to-primary rounded-full mx-auto"></div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Youth Card */}
            <Card className={`group relative overflow-hidden p-8 border-2 border-primary/10 bg-gradient-to-br from-background via-primary/5 to-background hover:border-primary/30 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 ${isVisible['who-we-serve'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors duration-300">{t('youthGraduates')}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t('youthGraduatesText')}
                </p>
              </div>
            </Card>

            {/* Recruiters Card */}
            <Card className={`group relative overflow-hidden p-8 border-2 border-accent/10 bg-gradient-to-br from-background via-accent/5 to-background hover:border-accent/30 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 ${isVisible['who-we-serve'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} style={{ transitionDelay: '0.1s' }}>
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-accent/10 rounded-full mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <Building2 className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-accent transition-colors duration-300">{t('recruitersEmployers')}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t('recruitersEmployersText')}
                </p>
              </div>
            </Card>

            {/* Institutions Card */}
            <Card className={`group relative overflow-hidden p-8 border-2 border-primary/10 bg-gradient-to-br from-background via-primary/5 to-background hover:border-primary/30 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 ${isVisible['who-we-serve'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} style={{ transitionDelay: '0.2s' }}>
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <GraduationCap className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors duration-300">{t('universitiesInstitutions')}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t('universitiesInstitutionsText')}
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section 
        id="our-story" 
        data-animate 
        className="relative py-16 px-4 md:px-6 bg-gradient-to-b from-transparent via-muted/30 to-transparent"
      >
        <div className="max-w-4xl mx-auto">
          <Card className={`relative overflow-hidden border-2 border-primary/10 bg-gradient-to-br from-background via-primary/5 to-background p-8 md:p-12 shadow-xl hover:shadow-2xl transition-all duration-500 ${isVisible['our-story'] ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-primary/5 to-accent/5 rounded-full blur-3xl"></div>
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {t('ourStory')}
              </h2>
              <div className="h-1 w-24 bg-gradient-to-r from-primary to-accent rounded-full mx-auto mb-8"></div>
              <p className="text-lg text-muted-foreground leading-relaxed text-center">
                {t('storyText')}
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Contact Section */}
      <section 
        id="contact" 
        data-animate 
        className="relative py-16 px-4 md:px-6"
      >
        <div className={`max-w-4xl mx-auto text-center transition-all duration-1000 ${isVisible['contact'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {t('getInTouch')}
          </h2>
          <div className="h-1 w-24 bg-gradient-to-r from-primary to-accent rounded-full mx-auto mb-8"></div>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t('contactText')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8">
            <a 
              href="mailto:info@talentsearchafrica.com" 
              className="flex items-center gap-2 text-primary hover:text-accent transition-all duration-300 hover:scale-105"
            >
              <Mail className="w-5 h-5" />
              info@talentsearchafrica.com
            </a>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-125 hover:-translate-y-1">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-125 hover:-translate-y-1">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-125 hover:-translate-y-1">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="mx-auto group relative overflow-hidden border-2 hover:border-primary transition-all duration-300"
            onClick={() => navigate('/')}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform duration-300" />
            <span className="relative">{t('backToHome')}</span>
          </Button>
        </div>
      </section>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee 30s linear infinite;
          white-space: nowrap;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 8s ease-in-out infinite;
          animation-delay: 1s;
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 3s ease-in-out infinite;
        }
        
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
        
        @keyframes expand {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-expand {
          animation: expand 1s ease-out forwards;
        }
        
        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};

export default NewAbout;

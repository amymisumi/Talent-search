import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight, Award, Briefcase, Globe, Shield, Star, Users } from "lucide-react";
import talentSearchBanner from "@/assets/talent-search-banner.jpg";
import TalentMarquee from "@/components/TalentMarquee";
import { useLanguage } from "@/contexts/LanguageContext";

const Index = () => {
  const { t } = useLanguage();
  
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Talent Search Banner with Marquee - No Text */}
      <section className="relative w-full overflow-hidden">
        <div className="relative h-[400px] overflow-hidden">
          <div className="absolute inset-0 flex banner-marquee">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="relative h-full flex-shrink-0" style={{ width: '100vw' }}>
                <img 
                  src={talentSearchBanner} 
                  alt="Talent Search" 
                  className="w-full h-full object-cover"
                  style={{ minWidth: '100%' }}
                />
              </div>
            ))}
          </div>
        </div>
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes slide {
              0% { transform: translateX(0); }
              100% { transform: translateX(-66.6666%); }
            }
            .banner-marquee {
              animation: slide 30s linear infinite;
              width: 300%;
              display: flex;
              will-change: transform;
              backface-visibility: hidden;
            }
            @media (max-width: 768px) {
              .banner-marquee {
                animation-duration: 20s;
              }
            }
          `
        }} />
      </section>
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent" />
        <div className="container mx-auto px-4 py-20 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-scale-in">
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              {t('showcaseYourTalent')}
              <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                {t('globalOpportunities')}
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('africaPremierPlatform')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="bg-gradient-to-r from-primary to-accent text-lg">
                <Link to="/youth-signup">
                  {t('getStartedFree')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-lg">
                <Link to="/recruiter-signup">{t('imARecruiter')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/40">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">{t('features')}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 hover:shadow-xl transition-shadow bg-card border-border">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">{t('verifiedSkills')}</h3>
              <p className="text-muted-foreground">
                {t('verifiedSkillsDesc')}
              </p>
            </Card>

            <Card className="p-8 hover:shadow-xl transition-shadow bg-card border-border">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <Globe className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">{t('globalReach')}</h3>
              <p className="text-muted-foreground">
                {t('globalReachDesc')}
              </p>
            </Card>

            <Card className="p-8 hover:shadow-xl transition-shadow bg-card border-border">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">{t('professionalReviews')}</h3>
              <p className="text-muted-foreground">
                {t('professionalReviewsDesc')}
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Talent Marquee Section */}
      <TalentMarquee />

      {/* Stats Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-12 text-center">
            <div>
              <div className="flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-accent" />
              </div>
              <div className="text-4xl font-bold mb-2 text-primary">10,000+</div>
              <div className="text-muted-foreground">{t('talentedYouth')}</div>
            </div>
            <div>
              <div className="flex items-center justify-center mb-4">
                <Award className="h-8 w-8 text-accent" />
              </div>
              <div className="text-4xl font-bold mb-2 text-primary">5,000+</div>
              <div className="text-muted-foreground">{t('verifiedSkills')}</div>
            </div>
            <div>
              <div className="flex items-center justify-center mb-4">
                <Globe className="h-8 w-8 text-accent" />
              </div>
              <div className="text-4xl font-bold mb-2 text-primary">50+</div>
              <div className="text-muted-foreground">{t('countries')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">{t('ctaTitle')}</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t('ctaSubtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="px-8" asChild>
              <Link to="/youth-signup">
                {t('joinAsTalent')}
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="px-8" asChild>
              <Link to="/recruiter-signup">
                {t('joinAsRecruiter')}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Briefcase className="h-6 w-6" />
                <span className="text-xl font-bold">Talent Search Africa</span>
              </div>
              <p className="text-primary-foreground/80">
                Connecting African talent with global opportunities
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t('forYouth')}</h4>
              <ul className="space-y-2 text-primary-foreground/80">
                <li><Link to="/youth-signup" className="hover:text-primary-foreground">{t('createProfile')}</Link></li>
                <li><Link to="/youth-signup" className="hover:text-primary-foreground">{t('uploadPortfolio')}</Link></li>
                <li><Link to="/youth-signup" className="hover:text-primary-foreground">{t('verifySkills')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t('forRecruiters')}</h4>
              <ul className="space-y-2 text-primary-foreground/80">
                <li><Link to="/recruiter-signup" className="hover:text-primary-foreground">{t('findTalent')}</Link></li>
                <li><Link to="/recruiter-signup" className="hover:text-primary-foreground">{t('postReviews')}</Link></li>
                <li><Link to="/recruiter-signup" className="hover:text-primary-foreground">{t('searchProfiles')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t('contact')}</h4>
              <ul className="space-y-2 text-primary-foreground/80">
                <li>admin@gmail.com</li>
                <li>{t('termsOfService')}</li>
                <li>{t('privacyPolicy')}</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-primary-foreground/20 text-center text-primary-foreground/60">
            <p>&copy; 2025 Talent Search Africa. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
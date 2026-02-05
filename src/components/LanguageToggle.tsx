import { Button } from "./ui/button";
import { Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export const LanguageToggle = () => {
  const { language, toggleLanguage, t } = useLanguage();
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleLanguage}
      className="relative"
      aria-label={t('language')}
    >
      <Globe className="h-5 w-5" />
      <span className="absolute -bottom-1 -right-1 text-xs font-mono bg-primary text-primary-foreground rounded-full h-4 w-4 flex items-center justify-center">
        {language.toUpperCase()}
      </span>
    </Button>
  );
};

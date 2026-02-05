import { memo } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import type { CVFormSchema } from './CVForm';

export type TemplateId = 'modern' | 'classic' | 'creative' | 'minimal';

const templateTokens: Record<
  TemplateId,
  {
    accent: string;
    background: string;
    text: string;
    subText: string;
  }
> = {
  modern: {
    accent: 'from-blue-500/10 to-indigo-500/10',
    background: 'bg-white dark:bg-slate-950',
    text: 'text-slate-900 dark:text-slate-50',
    subText: 'text-slate-500 dark:text-slate-400',
  },
  classic: {
    accent: 'from-amber-500/10 to-orange-500/10',
    background: 'bg-[#fdf8f3] dark:bg-[#22160d]',
    text: 'text-[#2c1a0f] dark:text-amber-50',
    subText: 'text-[#6b4a35] dark:text-amber-200',
  },
  creative: {
    accent: 'from-fuchsia-500/10 to-emerald-500/10',
    background: 'bg-gradient-to-br from-white to-fuchsia-50 dark:from-slate-900 dark:to-slate-950',
    text: 'text-slate-900 dark:text-slate-50',
    subText: 'text-slate-600 dark:text-slate-300',
  },
  minimal: {
    accent: 'from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900',
    background: 'bg-slate-50 dark:bg-slate-900',
    text: 'text-slate-900 dark:text-slate-50',
    subText: 'text-slate-500 dark:text-slate-400',
  },
};

const sectionLabels: Record<string, string> = {
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  languages: 'Languages',
  achievements: 'Achievements',
};

type CVPreviewProps = {
  data: CVFormSchema | null;
  template: TemplateId;
  sections: string[];
};

export const CVPreview = memo(({ data, template, sections }: CVPreviewProps) => {
  if (!data) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed p-6 text-center">
        <FilePlaceholder />
        <p className="mt-4 text-sm text-muted-foreground">
          Start editing your CV on the left to see a live preview here.
        </p>
      </div>
    );
  }

  const tokens = templateTokens[template];

  const renderSection = (section: string) => {
    switch (section) {
      case 'summary':
        return (
          <div key="summary" className="space-y-2">
            <h3 className="text-base font-semibold uppercase tracking-wide">{sectionLabels.summary}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{data.bio}</p>
          </div>
        );
      case 'experience':
        return (
          <div key="experience" className="space-y-3">
            <h3 className="text-base font-semibold uppercase tracking-wide">{sectionLabels.experience}</h3>
            {data.experience?.map((item) => (
              <div key={item.id} className="rounded-xl border border-border/50 p-3 text-sm">
                <p className="font-semibold">{item.position}</p>
                <p className="text-muted-foreground">{item.company}</p>
                <p className="text-xs text-muted-foreground">
                  {item.startDate} — {item.current ? 'Present' : item.endDate}
                </p>
                <p className="mt-2 text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        );
      case 'education':
        return (
          <div key="education" className="space-y-3">
            <h3 className="text-base font-semibold uppercase tracking-wide">{sectionLabels.education}</h3>
            {data.education?.map((item) => (
              <div key={item.id} className="rounded-xl border border-border/50 p-3 text-sm">
                <p className="font-semibold">{item.degree}</p>
                <p className="text-muted-foreground">{item.institution}</p>
                <p className="text-xs text-muted-foreground">
                  {item.startDate} — {item.endDate}
                </p>
                <p className="mt-2 text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        );
      case 'skills':
        return (
          <div key="skills" className="space-y-2">
            <h3 className="text-base font-semibold uppercase tracking-wide">{sectionLabels.skills}</h3>
            <div className="flex flex-wrap gap-2">
              {data.skills?.map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        );
      case 'languages':
        return (
          <div key="languages" className="space-y-2">
            <h3 className="text-base font-semibold uppercase tracking-wide">{sectionLabels.languages}</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {data.languages?.map((lang) => (
                <div key={lang.id} className="rounded-xl border border-border/50 p-3 text-sm">
                  <p className="font-medium">{lang.language}</p>
                  <p className="text-xs text-muted-foreground">{lang.proficiency}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'achievements':
        return (
          <div key="achievements" className="space-y-2">
            <h3 className="text-base font-semibold uppercase tracking-wide">{sectionLabels.achievements}</h3>
            <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
              {data.achievements?.map((achievement, index) => (
                <li key={`${achievement}-${index}`}>{achievement}</li>
              ))}
            </ul>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      layout
      className={`h-full overflow-hidden rounded-[32px] border bg-gradient-to-br ${tokens.background} ${tokens.accent} ${tokens.text}`}
    >
      <div className="space-y-6 p-8">
        <div className="space-y-1">
          <p className="text-3xl font-bold">{data.fullName}</p>
          <p className={`text-sm uppercase tracking-[0.3em] ${tokens.subText}`}>{data.title}</p>
          <div className="mt-4 text-xs text-muted-foreground">
            <p>{data.email}</p>
            <p>{data.phone}</p>
            <p>{data.address}</p>
          </div>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <motion.div key={section} layout>
              {renderSection(section)}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
});

CVPreview.displayName = 'CVPreview';

const FilePlaceholder = () => (
  <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="72" height="72" rx="16" fill="currentColor" className="text-muted-foreground/10" />
    <path
      d="M24 48H48M24 36H48M24 24H36M48 21.75V23C48 24.1046 47.1046 25 46 25H40C38.8954 25 38 24.1046 38 23V17C38 15.8954 38.8954 15 40 15H41.25M48 21.75L41.25 15M48 21.75H43C41.8954 21.75 41 20.8546 41 19.75V15"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-muted-foreground"
    />
  </svg>
);

export default CVPreview;


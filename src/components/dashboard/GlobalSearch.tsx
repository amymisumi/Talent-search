import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Briefcase, Users, Calendar, MessageSquare, BarChart3 } from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'job' | 'candidate' | 'application' | 'interview' | 'message' | 'analytics';
  title: string;
  subtitle?: string;
  path: string;
  icon: React.ReactNode;
}

export const GlobalSearch: React.FC<{ open: boolean; onOpenChange: (open: boolean) => void }> = ({
  open,
  onOpenChange
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setResults([]);
      return;
    }

    // Mock search results - in production, would search Firebase
    const mockResults: SearchResult[] = [
      {
        id: '1',
        type: 'job',
        title: 'Senior Software Engineer',
        subtitle: 'Technology Department',
        path: '/recruiter/jobs',
        icon: <Briefcase className="h-4 w-4" />
      },
      {
        id: '2',
        type: 'candidate',
        title: 'John Doe',
        subtitle: 'Software Developer',
        path: '/recruiter/candidates/123',
        icon: <Users className="h-4 w-4" />
      },
      {
        id: '3',
        type: 'application',
        title: 'Application for Senior Software Engineer',
        subtitle: 'From John Doe',
        path: '/recruiter/applications',
        icon: <FileText className="h-4 w-4" />
      }
    ].filter(result =>
      result.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.subtitle?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setResults(mockResults);
  }, [searchTerm]);

  const handleResultClick = (result: SearchResult) => {
    navigate(result.path);
    onOpenChange(false);
    setSearchTerm('');
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'job': return 'Job';
      case 'candidate': return 'Candidate';
      case 'application': return 'Application';
      case 'interview': return 'Interview';
      case 'message': return 'Message';
      case 'analytics': return 'Analytics';
      default: return 'Result';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search jobs, candidates, applications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  onOpenChange(false);
                }
                if (e.key === 'Enter' && results.length > 0) {
                  handleResultClick(results[0]);
                }
              }}
            />
          </div>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {results.length === 0 && searchTerm.length >= 2 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No results found</p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>Start typing to search...</p>
            </div>
          ) : (
            <div className="p-2">
              {results.map((result) => (
                <div
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                >
                  <div className="text-muted-foreground">{result.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{result.title}</p>
                    {result.subtitle && (
                      <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {getTypeLabel(result.type)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Press Enter to select, Esc to close</span>
            <span>⌘K to open search</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};


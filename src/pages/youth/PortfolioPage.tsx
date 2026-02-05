import React, { useState, useCallback, useRef } from 'react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import PortfolioSection from '@/pages/dashboard/sections/PortfolioSection';
import { Button } from '@/components/ui/button';
import { Plus, Video, Upload, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

const PortfolioPage = () => {
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [fileType, setFileType] = useState<'image' | 'video' | 'pdf' | undefined>(undefined);
  const formStateChangeRef = useRef(false);

  const handleAddProject = () => {
    setFileType(undefined); // Let user choose
    setShowForm(true);
  };

  const handleAddVideo = () => {
    setFileType('video');
    setShowForm(true);
  };

  const handleUploadImage = () => {
    setFileType('image');
    setShowForm(true);
  };

  // Memoize the callback to prevent infinite loops
  const handleFormStateChange = useCallback((isOpen: boolean) => {
    // Only update if the state actually changed to prevent loops
    if (formStateChangeRef.current && !isOpen) {
      formStateChangeRef.current = false;
      setShowForm(false);
      setFileType(undefined);
    } else if (isOpen) {
      formStateChangeRef.current = true;
    }
  }, []);

  if (!currentUser) {
    return (
      <DashboardShell heading="Portfolio" subheading="Showcase your work and projects">
        <div className="text-center py-8">
          <p>Please log in to view your portfolio</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell heading="Portfolio" subheading="Showcase your work and projects">
      <div className="space-y-6">
        {/* Contextual Action Bar */}
        <div className="flex justify-end gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleAddProject}
          >
            <Plus className="h-4 w-4 mr-2" />
            {language === 'sw' ? 'Ongeza Mradi' : 'Add Project'}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleAddVideo}
          >
            <Video className="h-4 w-4 mr-2" />
            {language === 'sw' ? 'Ongeza Video' : 'Add Video'}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleUploadImage}
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            {language === 'sw' ? 'Pakia Picha' : 'Upload Image'}
          </Button>
        </div>

        {/* Portfolio Content */}
        <PortfolioSection 
          userId={currentUser.uid}
          initialFileType={fileType}
          showFormInitially={showForm}
          onFormStateChange={handleFormStateChange}
        />
      </div>
    </DashboardShell>
  );
};

export default PortfolioPage;

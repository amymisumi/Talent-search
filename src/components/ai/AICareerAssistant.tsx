import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  doc, 
  getDoc, 
  collection, 
  getDocs, 
  query, 
  where
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { getProfile } from '@/integrations/firebase/services';
import {
  generateAIResponse,
  saveChatMessage,
  getChatHistory,
  clearChatHistory,
  subscribeToChatMessages,
  pinMessage,
  deleteMessage,
  searchChatHistory,
} from '@/services/aiService';
import jsPDF from 'jspdf';
import {
  MessageSquare,
  Bot,
  User as UserIcon,
  BookOpen,
  Send,
  X,
  FileText,
  GraduationCap,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  Download,
  Trash2,
  Briefcase,
  DollarSign,
  Lightbulb,
  Target,
  Search,
  Pin,
  PinOff,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

// Types
type Message = {
  id: string;
  messageId?: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  type?: 'suggestion' | 'response' | 'error' | 'job_match' | 'learning_resource' | 'profile_analysis' | 'cv_improvement';
  data?: any;
  language?: 'en' | 'sw' | 'mixed';
  pinned?: boolean;
};

type UserSettings = {
  preferredLanguage: 'en' | 'sw' | 'auto';
  voiceEnabled: boolean;
  voiceSpeed: number;
  voiceVolume: number;
  textSize: 'small' | 'medium' | 'large';
  theme: 'light' | 'dark';
  notifications: boolean;
};

const AICareerAssistant: React.FC = () => {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [userName, setUserName] = useState('');
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  
  // Settings state
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('aiAssistantSettings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback to defaults
      }
    }
    return {
      preferredLanguage: 'auto',
      voiceEnabled: true,
      voiceSpeed: 0.9,
      voiceVolume: 1,
      textSize: 'medium',
      theme: 'light',
      notifications: true,
    };
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  const scrollButtonRef = useRef<HTMLButtonElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { currentUser } = useAuth();
  const { language, setLanguage } = useLanguage();

  // Quick action buttons
  const QUICK_ACTIONS = [
    {
      icon: FileText,
      label: { en: 'Review My CV', sw: 'Kagua CV Yangu' },
      action: 'improve my cv',
    },
    {
      icon: Target,
      label: { en: 'Interview Tips', sw: 'Vidokezo vya Mahojiano' },
      action: 'help me prepare for an interview',
    },
    {
      icon: Briefcase,
      label: { en: 'Find Jobs', sw: 'Tafuta Kazi' },
      action: 'recommend jobs',
    },
    {
      icon: Lightbulb,
      label: { en: 'Improve Profile', sw: 'Boresha Wasifu' },
      action: 'analyze my profile',
    },
    {
      icon: MessageSquare,
      label: { en: 'Career Advice', sw: 'Ushauri wa Kazi' },
      action: 'give me career advice',
    },
    {
      icon: DollarSign,
      label: { en: 'Salary Guide', sw: 'Mwongozo wa Mshahara' },
      action: 'help with salary negotiation',
    },
    {
      icon: GraduationCap,
      label: { en: 'Learn New Skills', sw: 'Jifunze Ujuzi Mpya' },
      action: 'what skills should I learn',
    },
  ];

  // Detect language from settings
  const getEffectiveLanguage = (): 'en' | 'sw' => {
    if (settings.preferredLanguage === 'auto') {
      return language;
    }
    return settings.preferredLanguage;
  };

  // Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load user profile and skills
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!currentUser) return;

      try {
        // Load profile from profiles collection
        const profile = await getProfile(currentUser.uid);
        if (profile) {
          setUserName(profile.fullName || '');
          setUserProfile(profile);
          
          // Extract skills - handle both string[] and {skillName, proficiencyLevel}[] formats
          const extractedSkills: string[] = [];
          if (profile.skills && Array.isArray(profile.skills)) {
            profile.skills.forEach(skill => {
              if (typeof skill === 'string') {
                extractedSkills.push(skill);
              } else if (skill && typeof skill === 'object' && 'skillName' in skill) {
                extractedSkills.push(skill.skillName);
              }
            });
          }
          setUserSkills(extractedSkills);
          
          console.log('[AICareerAssistant] Loaded profile:', {
            fullName: profile.fullName,
            skillsCount: extractedSkills.length,
            skills: extractedSkills
          });
        } else {
          // Fallback to users collection if profile not found
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserName(userData.firstName || userData.displayName || '');
            setUserSkills(userData.skills || []);
            setUserProfile(userData);
          }
        }

        // Load portfolios
        const portfoliosQuery = query(
          collection(db, 'portfolios'),
          where('userId', '==', currentUser.uid)
        );
        const portfoliosSnapshot = await getDocs(portfoliosQuery);
        const portfoliosData = portfoliosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPortfolios(portfoliosData);

        // Load certificates
        const certificatesQuery = query(
          collection(db, 'certificates'),
          where('userId', '==', currentUser.uid)
        );
        const certificatesSnapshot = await getDocs(certificatesQuery);
        const certificatesData = certificatesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCertificates(certificatesData);

        // Load reviews
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('revieweeId', '==', currentUser.uid)
        );
        const reviewsSnapshot = await getDocs(reviewsQuery);
        const reviewsData = reviewsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setReviews(reviewsData);
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };

    loadUserProfile();
  }, [currentUser]);

  // Load chat history from Firebase
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!currentUser) return;

      try {
        const history = await getChatHistory(currentUser.uid);
        if (history.length > 0) {
          const messagesWithDates = history.map((msg: any) => ({
            id: msg.id || msg.messageId,
            messageId: msg.messageId,
            content: msg.content,
            sender: msg.sender,
            timestamp: msg.timestamp instanceof Date ? msg.timestamp : msg.timestamp?.toDate() || new Date(),
            type: msg.type,
            data: msg.data,
            language: msg.language,
            pinned: msg.pinned,
          }));
          setMessages(messagesWithDates);
          
          // Build conversation history for Claude
          const historyForClaude: Array<{ role: 'user' | 'assistant'; content: string }> = messagesWithDates
            .slice(-10) // Last 10 messages for context
            .map(msg => ({
              role: (msg.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
              content: msg.content,
            }));
          setConversationHistory(historyForClaude);
        } else {
          // Add welcome message if no history
          const welcomeMessage: Message = {
            id: 'welcome',
            content: getEffectiveLanguage() === 'sw'
              ? `👋 Habari ${userName || 'rafiki'}! Mimi ni Msaidizi wako wa Kazi wa AI. Nipo hapa kukusaidia na: Maandalizi ya CV, mikakati ya kazi, ujuzi, mipango ya kazi, vidokezo vya mishahara. Zungumza nami kwa Kiingereza au Kiswahili!`
              : `👋 Hello ${userName || 'there'}! I'm your AI Career Assistant. I'm here to help you with: CV prep, job search, skill development, career guidance, salary tips. I speak English & Swahili. Start typing to get guidance!`,
            sender: 'assistant',
            timestamp: new Date(),
            type: 'suggestion',
          };
          setMessages([welcomeMessage]);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
        // Show welcome message even on error
        const welcomeMessage: Message = {
          id: 'welcome',
          content: getEffectiveLanguage() === 'sw'
            ? `👋 Habari! Mimi ni Msaidizi wako wa Kazi wa AI. Nipo hapa kukusaidia!`
            : `👋 Hello! I'm your AI Career Assistant. I'm here to help you!`,
          sender: 'assistant',
          timestamp: new Date(),
          type: 'suggestion',
        };
        setMessages([welcomeMessage]);
      }
    };

    loadChatHistory();
  }, [currentUser, userName]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToChatMessages(currentUser.uid, (newMessages) => {
      const messagesWithDates: Message[] = newMessages.map((msg: any) => ({
        id: msg.id || msg.messageId,
        messageId: msg.messageId,
        content: msg.content,
        sender: msg.sender as 'user' | 'assistant',
        timestamp: msg.timestamp instanceof Date ? msg.timestamp : msg.timestamp?.toDate() || new Date(),
        type: msg.type,
        data: msg.data,
        language: msg.language,
        pinned: msg.pinned,
      }));
      setMessages(messagesWithDates);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Scroll detection for floating button
  useEffect(() => {
    const handleScroll = () => {
      if (scrollAreaRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShowScrollButton(!isNearBottom);
      }
    };

    const scrollElement = scrollAreaRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = getEffectiveLanguage() === 'sw' ? 'sw-KE' : 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast.error(getEffectiveLanguage() === 'sw' ? 'Kosa la kutambua sauti' : 'Speech recognition error');
      };
    }

    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      speechSynthesisRef.current = window.speechSynthesis;
    }
  }, [getEffectiveLanguage()]);

  // Save settings
  useEffect(() => {
    localStorage.setItem('aiAssistantSettings', JSON.stringify(settings));
  }, [settings]);

  // Handle sending a message
  const handleSendMessage = async (messageText: string = input) => {
    if (!messageText.trim() || messageText.length > 2000) {
      if (messageText.length > 2000) {
        toast.error(getEffectiveLanguage() === 'sw' ? 'Ujumbe ni mrefu sana (upeo: herufi 2000)' : 'Message too long (max: 2000 characters)');
      }
      return;
    }

    if (isOffline) {
      toast.error(getEffectiveLanguage() === 'sw' ? 'Huna muunganisho wa intaneti' : 'No internet connection');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Update conversation history
    setConversationHistory(prev => [...prev, { role: 'user', content: messageText }]);

    try {
      const effectiveLang = getEffectiveLanguage();
      
      // Debug logging
      console.log('[AICareerAssistant] Sending message:', messageText);
      console.log('[AICareerAssistant] User skills:', userSkills);
      console.log('[AICareerAssistant] User profile:', userProfile ? { fullName: userProfile.fullName, skills: userProfile.skills } : 'null');
      
      const response = await generateAIResponse(
        messageText,
        userSkills,
        userProfile,
        portfolios,
        certificates,
        reviews,
        effectiveLang,
        conversationHistory
      );
      
      // Ensure we have content
      if (!response.content || response.content.trim() === '') {
        console.error('[AICareerAssistant] Empty response received!', response);
        throw new Error('Empty response from AI service');
      }
      
      console.log('[AICareerAssistant] Response received:', {
        type: response.type,
        contentLength: response.content.length,
        contentPreview: response.content.substring(0, 100),
        hasData: !!response.data
      });

      const aiMessage: Message = {
        id: Date.now().toString() + '_ai',
        content: response.content,
        sender: 'assistant',
        timestamp: new Date(),
        type: response.type,
        data: response.data,
        language: effectiveLang,
      };

      setMessages(prev => [...prev, aiMessage]);
      setConversationHistory(prev => [...prev, { role: 'assistant', content: response.content }]);

      // Save to Firebase
      if (currentUser) {
        try {
          await saveChatMessage({
            userId: currentUser.uid,
            content: messageText,
            sender: 'user',
            type: 'user_message',
            language: effectiveLang,
          });

          await saveChatMessage({
            userId: currentUser.uid,
            content: response.content,
            sender: 'assistant',
            type: response.type,
            data: response.data,
            language: effectiveLang,
          });
        } catch (firebaseError) {
          console.error('[AICareerAssistant] Error saving to Firebase:', firebaseError);
          console.error('Error saving to Firebase:', firebaseError);
          // Continue even if Firebase save fails (offline mode)
        }
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: getEffectiveLanguage() === 'sw'
          ? 'Samahani, nimepata kosa. Tafadhali jaribu tena.'
          : 'Sorry, I encountered an error. Please try again.',
        sender: 'assistant',
        type: 'error',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error(getEffectiveLanguage() === 'sw' ? 'Kosa la kuzalisha jibu' : 'Error generating response');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle quick action
  const handleQuickAction = (action: string) => {
    setInput(action);
    setTimeout(() => handleSendMessage(action), 100);
  };

  // Handle voice input
  const handleVoiceInput = () => {
    if (!settings.voiceEnabled) {
      toast.error(getEffectiveLanguage() === 'sw' ? 'Sauti imezimwa' : 'Voice is disabled');
      return;
    }

    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.lang = getEffectiveLanguage() === 'sw' ? 'sw-KE' : 'en-US';
      recognitionRef.current.start();
    }
  };

  // Handle text-to-speech
  const handleTextToSpeech = (text: string) => {
    if (!settings.voiceEnabled || !speechSynthesisRef.current) return;

    if (isSpeaking) {
      speechSynthesisRef.current.cancel();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getEffectiveLanguage() === 'sw' ? 'sw-KE' : 'en-US';
    utterance.rate = settings.voiceSpeed;
    utterance.volume = settings.voiceVolume;

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    speechSynthesisRef.current.speak(utterance);
  };

  // Stop speech
  const stopSpeech = () => {
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  // Pin/unpin message
  const handlePinMessage = async (messageId: string, pinned: boolean) => {
    if (!currentUser) return;
    try {
      await pinMessage(currentUser.uid, messageId, !pinned);
      toast.success(getEffectiveLanguage() === 'sw' ? 'Ujumbe umeonyeshwa' : 'Message pinned');
    } catch (error) {
      toast.error(getEffectiveLanguage() === 'sw' ? 'Kosa la kuonyesha ujumbe' : 'Error pinning message');
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    if (!currentUser) return;
    if (!confirm(getEffectiveLanguage() === 'sw' ? 'Je, una uhakika unataka kufuta ujumbe huu?' : 'Are you sure you want to delete this message?')) {
      return;
    }
    try {
      await deleteMessage(currentUser.uid, messageId);
      toast.success(getEffectiveLanguage() === 'sw' ? 'Ujumbe umefutwa' : 'Message deleted');
    } catch (error) {
      toast.error(getEffectiveLanguage() === 'sw' ? 'Kosa la kufuta ujumbe' : 'Error deleting message');
    }
  };

  // Clear chat history
  const handleClearChat = async () => {
    if (!currentUser) return;
    if (!confirm(getEffectiveLanguage() === 'sw' ? 'Je, una uhakika unataka kufuta mazungumzo yote? Hii haitaweza kutenguliwa.' : 'Are you sure you want to clear all chat history? This cannot be undone.')) {
      return;
    }
    try {
      await clearChatHistory(currentUser.uid);
      setMessages([]);
      setConversationHistory([]);
      toast.success(getEffectiveLanguage() === 'sw' ? 'Mazungumzo yamefutwa' : 'Chat history cleared');
      setShowSettings(false);
    } catch (error) {
      toast.error(getEffectiveLanguage() === 'sw' ? 'Kosa la kufuta mazungumzo' : 'Error clearing chat');
    }
  };

  // Export chat as TXT
  const handleExportTXT = () => {
    const chatText = messages.map(msg =>
      `[${msg.timestamp.toLocaleString()}] ${msg.sender.toUpperCase()}: ${msg.content}`
    ).join('\n\n');

    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `career-assistant-chat-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(getEffectiveLanguage() === 'sw' ? 'Mazungumzo yamehamishwa' : 'Chat exported');
    setShowSettings(false);
  };

  // Export chat as PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.text('AI Career Assistant - Chat History', 14, 20);
    doc.setFontSize(10);

    let y = 30;
    messages.forEach((msg) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      const sender = msg.sender.toUpperCase();
      const timestamp = msg.timestamp.toLocaleString();
      const content = `${sender} (${timestamp}): ${msg.content}`;
      const lines = doc.splitTextToSize(content, 180);
      doc.text(lines, 14, y);
      y += lines.length * 5 + 5;
    });

    doc.save(`career-assistant-chat-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success(getEffectiveLanguage() === 'sw' ? 'Mazungumzo yamehamishwa kwa PDF' : 'Chat exported as PDF');
    setShowSettings(false);
  };

  // Search chat history
  const handleSearch = async () => {
    if (!searchTerm.trim() || !currentUser) return;
    try {
      const results = await searchChatHistory(currentUser.uid, searchTerm);
      const messageResults: Message[] = results.map((msg: any) => ({
        id: msg.id || msg.messageId,
        messageId: msg.messageId,
        content: msg.content,
        sender: msg.sender as 'user' | 'assistant',
        timestamp: msg.timestamp instanceof Date ? msg.timestamp : msg.timestamp?.toDate() || new Date(),
        type: msg.type,
        data: msg.data,
        language: msg.language,
        pinned: msg.pinned,
      }));
      setSearchResults(messageResults);
      if (messageResults.length === 0) {
        toast.info(getEffectiveLanguage() === 'sw' ? 'Hakuna matokeo' : 'No results found');
      }
    } catch (error) {
      toast.error(getEffectiveLanguage() === 'sw' ? 'Kosa la kutafuta' : 'Error searching');
    }
  };

  // Format time for display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Render message content based on type
  const renderMessageContent = (message: Message) => {
    const contentWithLinks = message.content.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline dark:text-blue-400">$1</a>'
    );

    // Render job matches
    if (message.type === 'job_match' && message.data?.jobs) {
      return (
        <div className="space-y-3">
          <div
            className="whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: contentWithLinks }}
          />
          <div className="space-y-2">
            {message.data.jobs.slice(0, 3).map((job: any) => (
              <div key={job.id} className="border rounded-lg p-3 bg-muted/20 dark:bg-muted/10">
                <h4 className="font-semibold">{job.title} at {job.company}</h4>
                <p className="text-sm text-muted-foreground">{job.location} • {job.type}</p>
                <p className="mt-1 text-sm">
                  {job.description?.substring(0, 120)}...
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {job.requiredSkills?.slice(0, 3).map((skill: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Render learning resources
    if (message.type === 'learning_resource' && message.data?.resources) {
      return (
        <div className="space-y-3">
          <div
            className="whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: contentWithLinks }}
          />
          <div className="space-y-2">
            {message.data.resources.slice(0, 3).map((resource: any, i: number) => (
              <div key={i} className="border rounded-lg p-3 bg-muted/20 dark:bg-muted/10">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    {resource.type === 'course' ? (
                      <GraduationCap className="h-4 w-4 text-primary" />
                    ) : resource.type === 'article' ? (
                      <FileText className="h-4 w-4 text-primary" />
                    ) : (
                      <BookOpen className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      {resource.title}
                    </a>
                    <p className="text-sm text-muted-foreground">{resource.platform}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Default message rendering
    return (
      <div
        className="whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: contentWithLinks }}
      />
    );
  };

  // Render minimized view
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="rounded-full h-14 w-14 p-0 shadow-lg"
          size="lg"
          aria-label={getEffectiveLanguage() === 'sw' ? 'Fungua msaidizi' : 'Open assistant'}
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  // Render full chat interface
  return (
    <div className="fixed bottom-4 right-4 w-full max-w-md z-50 flex flex-col h-[85vh] max-h-[700px]">
      <Card className="shadow-2xl border-0 flex flex-col h-full">
        {/* Header */}
        <CardHeader className="bg-primary text-primary-foreground p-4 rounded-t-lg flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-foreground/20 rounded-full">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">{getEffectiveLanguage() === 'sw' ? 'Msaidizi wa Kazi' : 'Career Assistant'}</h3>
                <p className="text-xs opacity-80">
                  {getEffectiveLanguage() === 'sw' ? 'Ninazungumza Kiingereza na Kiswahili' : 'I speak English & Swahili'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {isOffline && (
                <AlertCircle className="h-4 w-4 text-yellow-300" aria-label={getEffectiveLanguage() === 'sw' ? 'Hakuna muunganisho' : 'Offline'} />
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={() => setShowSearch(!showSearch)}
                aria-label={getEffectiveLanguage() === 'sw' ? 'Tafuta' : 'Search'}
              >
                <Search className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={() => setShowSettings(true)}
                aria-label={getEffectiveLanguage() === 'sw' ? 'Mipangilio' : 'Settings'}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={() => setIsMinimized(true)}
                aria-label={getEffectiveLanguage() === 'sw' ? 'Funga' : 'Close'}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Search Bar */}
        {showSearch && (
          <div className="p-3 border-b bg-muted/30 flex-shrink-0">
            <div className="flex gap-2">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={getEffectiveLanguage() === 'sw' ? 'Tafuta mazungumzo...' : 'Search conversations...'}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 max-h-32 overflow-y-auto">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="text-sm p-2 hover:bg-muted rounded cursor-pointer"
                    onClick={() => {
                      // Scroll to message
                      const element = document.getElementById(`message-${result.id}`);
                      element?.scrollIntoView({ behavior: 'smooth' });
                      setShowSearch(false);
                    }}
                  >
                    {result.content.substring(0, 50)}...
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages Area */}
        <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  id={`message-${message.id}`}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 ${
                      message.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted dark:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Avatar className="h-6 w-6 flex-shrink-0">
                        {message.sender === 'user' ? (
                          <UserIcon className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        {renderMessageContent(message)}
                        <div className="flex items-center justify-between mt-2 gap-2">
                          <p className="text-xs opacity-70">
                            {formatTime(message.timestamp)}
                          </p>
                          <div className="flex items-center gap-1">
                            {message.pinned && (
                              <Pin className="h-3 w-3 opacity-70" />
                            )}
                            {message.sender === 'assistant' && settings.voiceEnabled && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-70 hover:opacity-100"
                                onClick={() => isSpeaking ? stopSpeech() : handleTextToSpeech(message.content)}
                                aria-label={getEffectiveLanguage() === 'sw' ? 'Sikiza' : 'Listen'}
                              >
                                {isSpeaking ? (
                                  <VolumeX className="h-3 w-3" />
                                ) : (
                                  <Volume2 className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                            {currentUser && message.messageId && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-70 hover:opacity-100"
                                  onClick={() => handlePinMessage(message.messageId!, message.pinned || false)}
                                  aria-label={getEffectiveLanguage() === 'sw' ? 'Onyesha' : 'Pin'}
                                >
                                  {message.pinned ? (
                                    <PinOff className="h-3 w-3" />
                                  ) : (
                                    <Pin className="h-3 w-3" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-70 hover:opacity-100 text-destructive"
                                  onClick={() => handleDeleteMessage(message.messageId!)}
                                  aria-label={getEffectiveLanguage() === 'sw' ? 'Futa' : 'Delete'}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center space-x-2 p-2">
                  <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
                  <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.4s' }} />
                  <span className="text-sm text-muted-foreground">
                    {getEffectiveLanguage() === 'sw' ? 'Msaidizi anaandika...' : 'Assistant is typing...'}
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Floating scroll to bottom button */}
          {showScrollButton && (
            <Button
              ref={scrollButtonRef}
              onClick={scrollToBottom}
              className="absolute bottom-20 right-6 rounded-full h-10 w-10 p-0 shadow-lg"
              size="icon"
              aria-label={getEffectiveLanguage() === 'sw' ? 'Nenda chini' : 'Scroll to bottom'}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          )}

          {/* Quick actions - Always visible */}
          <div className="p-4 border-t flex-shrink-0">
            <h4 className="text-sm font-medium mb-3 text-muted-foreground">
              {getEffectiveLanguage() === 'sw' ? 'Vitendo vya haraka' : 'Quick Actions'}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((action, i) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="h-auto py-2 px-3 text-xs flex flex-col items-center gap-1"
                    onClick={() => handleQuickAction(action.action)}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-center">{getEffectiveLanguage() === 'sw' ? action.label.sw : action.label.en}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Message input */}
          <div className="p-4 border-t flex-shrink-0">
            <div className="flex items-end gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={getEffectiveLanguage() === 'sw' ? 'Niulize chochote kuhusu kazi yako...' : 'Ask me anything about your career...'}
                className="flex-1 min-h-[44px] max-h-32 resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isLoading || isOffline}
                rows={1}
              />
              <Button
                size="icon"
                variant="outline"
                onClick={handleVoiceInput}
                disabled={isLoading || isListening || !settings.voiceEnabled || isOffline}
                className={isListening ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300' : ''}
                aria-label={getEffectiveLanguage() === 'sw' ? 'Sauti' : 'Voice input'}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="icon"
                onClick={() => handleSendMessage()}
                disabled={isLoading || !input.trim() || isOffline}
                aria-label={getEffectiveLanguage() === 'sw' ? 'Tuma' : 'Send'}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {isOffline && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {getEffectiveLanguage() === 'sw' ? 'Hakuna muunganisho wa intaneti' : 'No internet connection'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{getEffectiveLanguage() === 'sw' ? 'Mipangilio' : 'Settings'}</DialogTitle>
            <DialogDescription>
              {getEffectiveLanguage() === 'sw' ? 'Badilisha mipangilio ya msaidizi' : 'Customize your assistant settings'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Language Settings */}
            <div className="space-y-2">
              <Label>{getEffectiveLanguage() === 'sw' ? 'Lugha' : 'Language'}</Label>
              <Select
                value={settings.preferredLanguage}
                onValueChange={(value: 'en' | 'sw' | 'auto') => {
                  setSettings(prev => ({ ...prev, preferredLanguage: value }));
                  if (value !== 'auto') {
                    setLanguage(value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">{getEffectiveLanguage() === 'sw' ? 'Onyesha kiotomatiki' : 'Auto-detect'}</SelectItem>
                  <SelectItem value="en">🇬🇧 English</SelectItem>
                  <SelectItem value="sw">🇰🇪 Kiswahili</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Voice Settings */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{getEffectiveLanguage() === 'sw' ? 'Sauti' : 'Voice'}</Label>
                <Switch
                  checked={settings.voiceEnabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, voiceEnabled: checked }))}
                />
              </div>
              {settings.voiceEnabled && (
                <div className="space-y-2 pl-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">{getEffectiveLanguage() === 'sw' ? 'Kasi' : 'Speed'}</Label>
                    <Input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.1"
                      value={settings.voiceSpeed}
                      onChange={(e) => setSettings(prev => ({ ...prev, voiceSpeed: parseFloat(e.target.value) }))}
                      className="w-32"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">{getEffectiveLanguage() === 'sw' ? 'Kiasi cha sauti' : 'Volume'}</Label>
                    <Input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.voiceVolume}
                      onChange={(e) => setSettings(prev => ({ ...prev, voiceVolume: parseFloat(e.target.value) }))}
                      className="w-32"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Text Size */}
            <div className="space-y-2">
              <Label>{getEffectiveLanguage() === 'sw' ? 'Ukubwa wa maandishi' : 'Text Size'}</Label>
              <Select
                value={settings.textSize}
                onValueChange={(value: 'small' | 'medium' | 'large') => {
                  setSettings(prev => ({ ...prev, textSize: value }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">{getEffectiveLanguage() === 'sw' ? 'Ndogo' : 'Small'}</SelectItem>
                  <SelectItem value="medium">{getEffectiveLanguage() === 'sw' ? 'Kati' : 'Medium'}</SelectItem>
                  <SelectItem value="large">{getEffectiveLanguage() === 'sw' ? 'Kubwa' : 'Large'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Export Options */}
            <div className="space-y-2 border-t pt-4">
              <Label>{getEffectiveLanguage() === 'sw' ? 'Hamisha Mazungumzo' : 'Export Chat'}</Label>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportTXT} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  TXT
                </Button>
                <Button variant="outline" onClick={handleExportPDF} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </div>
            </div>

            {/* Clear Chat */}
            <div className="space-y-2 border-t pt-4">
              <Button
                variant="destructive"
                onClick={handleClearChat}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {getEffectiveLanguage() === 'sw' ? 'Futa Mazungumzo Yote' : 'Clear All Chat History'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AICareerAssistant;

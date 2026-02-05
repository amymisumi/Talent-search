import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { generateAIResponse, saveChatMessage, getChatHistory, clearChatHistory } from '@/services/aiService';
import {
  Send,
  Bot,
  User as UserIcon,
  BookOpen,
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
  Heart,
  Lightbulb,
  Target
} from 'lucide-react';

// Types
type Message = {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'suggestion' | 'response' | 'error' | 'job_match' | 'learning_resource' | 'profile_analysis' | 'cv_improvement';
  data?: any;
};

type JobPosting = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  description: string;
  requiredSkills: string[];
  postedAt: Date;
};

type ResourceType = 'course' | 'article' | 'video' | 'book';

interface LearningResource {
  id: string;
  name: string;
  description: string;
  url: string;
  type: ResourceType;
  skills: string[];
};

interface ChatbotSectionProps {
  userId?: string;
}

const ChatbotSection = ({ userId }: ChatbotSectionProps) => {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  const { currentUser } = useAuth();
  const { language, t } = useLanguage();

  // Suggested questions
  const SUGGESTED_QUESTIONS = [
    {
      en: 'What career paths match my skills?',
      sw: 'Njia zipi za kazi zinaendana na ujuzi wangu?'
    },
    {
      en: 'How can I improve my CV?',
      sw: 'Naweza kuboresha vipi CV yangu?'
    },
    {
      en: 'What skills should I learn next?',
      sw: 'Ujuzi gani nifunze baadaye?'
    },
    {
      en: 'Find jobs that match my profile',
      sw: 'Tafuta kazi zinazoendana na wasifu wangu'
    },
    {
      en: 'Help me prepare for an interview',
      sw: 'Nisaidie kujiandaa mahojiano'
    }
  ];

  // Quick action buttons
  const QUICK_ACTIONS = [
    {
      icon: Briefcase,
      label: { en: 'Find Jobs', sw: 'Tafuta Kazi' },
      action: 'recommend jobs'
    },
    {
      icon: FileText,
      label: { en: 'Improve CV', sw: 'Boresha CV' },
      action: 'improve my cv'
    },
    {
      icon: GraduationCap,
      label: { en: 'Learn Skills', sw: 'Jifunze Ujuzi' },
      action: 'what skills should I learn'
    },
    {
      icon: Target,
      label: { en: 'Career Advice', sw: 'Ushauri wa Kazi' },
      action: 'give me career advice'
    },
    {
      icon: DollarSign,
      label: { en: 'Salary Guide', sw: 'Mwongozo wa Mshahara' },
      action: 'help with salary negotiation'
    },
    {
      icon: Heart,
      label: { en: 'Motivation', sw: 'Motisha' },
      action: 'motivate me'
    }
  ];

  // Load chat history from Firebase
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!currentUser) return;

      try {
        const history = await getChatHistory(currentUser.uid);
        const messagesWithDates = history.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          sender: msg.sender === 'assistant' ? 'ai' : msg.sender,
          timestamp: msg.timestamp,
          type: msg.type,
          data: msg.data
        }));
        setMessages(messagesWithDates);
        
        // Build conversation history for context
        const historyForContext = history
          .filter((msg: any) => msg.sender === 'user' || msg.sender === 'assistant')
          .map((msg: any) => ({
            role: msg.sender === 'assistant' ? 'assistant' : 'user',
            content: msg.content
          }));
        setConversationHistory(historyForContext);
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    };

    loadChatHistory();
  }, [currentUser]);

  // Load user profile and skills
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!currentUser) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserName(userData.firstName || userData.displayName || '');
          setUserSkills(userData.skills || []);
          setUserProfile(userData);

          // Load portfolios
          const portfoliosQuery = query(
            collection(db, 'portfolios'),
            where('userId', '==', currentUser.uid)
          );
          const portfoliosSnapshot = await getDocs(portfoliosQuery);
          const portfoliosData = portfoliosSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
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
            ...doc.data()
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
            ...doc.data()
          }));
          setReviews(reviewsData);

          // Add welcome message if it's the first time
          if (messages.length === 0) {
            const welcomeMessage: Message = {
              id: 'welcome',
              content: language === 'sw'
                ? `Habari ${userData.firstName || 'rafiki'}! Mimi ni Msaidizi wako wa Kazi wa AI. Niko hapa kukusaidia katika safari yako ya kazi. Unaweza kuuliza kuhusu kazi, ujuzi, CV, mahojiano, au chochote kingine kinachohusu kazi yako.`
                : `Hi ${userData.firstName || 'there'}! I'm your AI Career Assistant. I'm here to help you with your career journey. You can ask me about jobs, skills, CVs, interviews, or anything else related to your career.`,
              sender: 'ai',
              timestamp: new Date(),
              type: 'suggestion'
            };
            setMessages([welcomeMessage]);
          }
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };

    loadUserProfile();
  }, [currentUser, language]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = language === 'sw' ? 'sw-KE' : 'en-US';

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
      };
    }

    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      speechSynthesisRef.current = window.speechSynthesis;
    }
  }, [language]);

  // Handle sending a message
  const handleSendMessage = async (messageText: string = input) => {
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await generateAIResponse(
        messageText,
        userSkills,
        userProfile,
        portfolios,
        certificates,
        reviews,
        language,
        conversationHistory
      );

      const aiMessage: Message = {
        id: Date.now().toString() + '_ai',
        content: response.content,
        sender: 'ai',
        timestamp: new Date(),
        type: response.type,
        data: response.data
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Update conversation history for context
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: messageText },
        { role: 'assistant', content: response.content }
      ]);

      // Save to Firebase
      if (currentUser) {
        await saveChatMessage({
          userId: currentUser.uid,
          content: messageText,
          sender: 'user',
          type: 'user_message'
        });

        await saveChatMessage({
          userId: currentUser.uid,
          content: response.content,
          sender: 'ai',
          type: response.type,
          data: response.data
        });
      }

    } catch (error) {
      console.error('Error generating AI response:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: language === 'sw'
          ? 'Samahani, nimepata kosa. Tafadhali jaribu tena.'
          : 'Sorry, I encountered an error. Please try again.',
        sender: 'ai',
        type: 'error',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle quick question selection
  const handleQuickQuestion = (question: { en: string; sw: string }) => {
    const messageText = language === 'sw' ? question.sw : question.en;
    setInput(messageText);
    setTimeout(() => handleSendMessage(messageText), 100);
  };

  // Handle quick action
  const handleQuickAction = (action: string) => {
    setInput(action);
    setTimeout(() => handleSendMessage(action), 100);
  };

  // Handle voice input
  const handleVoiceInput = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  // Handle text-to-speech
  const handleTextToSpeech = (text: string) => {
    if (speechSynthesisRef.current && !isSpeaking) {
      setIsSpeaking(true);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'sw' ? 'sw-KE' : 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1;

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
      };

      speechSynthesisRef.current.speak(utterance);
    }
  };

  // Stop speech
  const stopSpeech = () => {
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  // Clear chat history
  const handleClearChat = async () => {
    if (currentUser) {
      await clearChatHistory(currentUser.uid);
    }
    setMessages([]);
    setShowSettings(false);
  };

  // Export chat history
  const handleExportChat = () => {
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
    setShowSettings(false);
  };

  // Format time for display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render message content based on type
  const renderMessageContent = (message: Message) => {
    // Render markdown-like links
    const contentWithLinks = message.content.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>'
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
            {message.data.jobs.slice(0, 3).map((job: JobPosting) => (
              <div key={job.id} className="border rounded-lg p-3 bg-muted/20">
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
            {message.data.resources.slice(0, 3).map((resource: LearningResource, i: number) => (
              <div key={i} className="border rounded-lg p-3 bg-muted/20">
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
                  <div>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      {resource.name}
                    </a>
                    <p className="text-sm text-muted-foreground">{resource.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {resource.skills?.slice(0, 3).map((skill: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
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

  // Render settings menu
  if (showSettings) {
    return (
      <div className="fixed bottom-4 right-4 w-full max-w-md z-50">
        <Card className="shadow-xl border-0 h-[400px] flex flex-col">
          <CardHeader className="bg-primary text-primary-foreground p-4 rounded-t-lg">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">{language === 'sw' ? 'Mipangilio' : 'Settings'}</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={() => setShowSettings(false)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleExportChat}
            >
              <Download className="h-4 w-4 mr-2" />
              {language === 'sw' ? 'Hamisha Mazungumzo' : 'Export Chat'}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={handleClearChat}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {language === 'sw' ? 'Futa Mazungumzo' : 'Clear Chat'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render full chat interface
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{language === 'sw' ? 'Msaidizi wa Kazi wa AI' : 'AI Career Assistant'}</h2>
          <p className="text-sm text-gray-600">{language === 'sw' ? 'Pata mwongozo maalum wa kazi' : 'Get personalized career guidance'}</p>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">{language === 'sw' ? 'Msaidizi wa Kazi' : 'Career Assistant'}</h3>
              <p className="text-xs text-muted-foreground">
                {language === 'sw' ? 'Ninazungumza Kiingereza na Kiswahili' : 'I speak English and Swahili'}
              </p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Avatar className="h-6 w-6">
                      {message.sender === 'user' ? (
                        <UserIcon className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </Avatar>
                    <div className="flex-1">
                      {renderMessageContent(message)}
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs opacity-70">
                          {formatTime(message.timestamp)}
                        </p>
                        {message.sender === 'ai' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-70 hover:opacity-100"
                            onClick={() => isSpeaking ? stopSpeech() : handleTextToSpeech(message.content)}
                          >
                            {isSpeaking ? (
                              <VolumeX className="h-3 w-3" />
                            ) : (
                              <Volume2 className="h-3 w-3" />
                            )}
                          </Button>
                        )}
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
                  {language === 'sw' ? 'Msaidizi anaandika...' : 'Assistant is typing...'}
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Quick actions - Always visible */}
        <div className="p-4 border-t">
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">
            {language === 'sw' ? 'Vitendo vya haraka' : 'Quick Actions'}
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map((action, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="h-auto py-2 px-3 text-xs flex flex-col items-center gap-1"
                onClick={() => handleQuickAction(action.action)}
              >
                <action.icon className="h-4 w-4" />
                <span className="text-center">{language === 'sw' ? action.label.sw : action.label.en}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Suggested questions */}
        {messages.length <= 1 && (
          <div className="p-4 border-t">
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">
              {language === 'sw' ? 'Maswali ya kawaida' : 'Suggested Questions'}
            </h4>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((question, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-1 px-2"
                  onClick={() => handleQuickQuestion(question)}
                >
                  {language === 'sw' ? question.sw : question.en}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Message input */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                language === 'sw'
                  ? 'Andika ujumbe wako...'
                  : 'Type your message...'
              }
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              disabled={isLoading}
            />
            <Button
              size="icon"
              variant="outline"
              onClick={handleVoiceInput}
              disabled={isLoading || isListening}
              className={isListening ? 'bg-red-100 text-red-600' : ''}
            >
              {isListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="icon"
              onClick={() => setShowSettings(true)}
              disabled={isLoading}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              onClick={() => handleSendMessage()}
              disabled={isLoading || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ChatbotSection;

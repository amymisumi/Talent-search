import Anthropic from '@anthropic-ai/sdk';

export type Language = 'en' | 'sw' | 'auto';

interface UserProfile {
  name?: string;
  skills?: string[];
  experience?: string;
  location?: string;
  careerGoals?: string[];
  preferredLanguage?: 'en' | 'sw' | 'auto';
  [key: string]: any;
}

class ClaudeService {
  private client: Anthropic | null = null;
  private apiKey: string;

  constructor() {
    // Get API key from environment or use a placeholder
    this.apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY || '';
    
    if (!this.apiKey || this.apiKey.trim() === '') {
      console.warn('⚠️ Anthropic API key not found. Please set VITE_ANTHROPIC_API_KEY in your .env file');
      console.warn('📝 Create a .env file in the root directory with: VITE_ANTHROPIC_API_KEY=your_api_key_here');
      console.warn('🔗 Get your API key from: https://console.anthropic.com/');
      // Initialize with empty key - will be handled in generateResponse
      this.apiKey = '';
      this.client = null;
    } else {
      // Initialize client with API key
      // Note: dangerouslyAllowBrowser is required for browser environments
      // Make sure to secure your API key and never commit it to version control
      this.client = new Anthropic({
        apiKey: this.apiKey,
        // Required for browser environments - ensure API key is properly secured
        dangerouslyAllowBrowser: true,
      });
    }
  }

  /**
   * Detect language from text
   */
  private detectLanguage(text: string): 'en' | 'sw' | 'mixed' {
    const swahiliWords = [
      'na', 'ya', 'wa', 'kwa', 'ni', 'za', 'la', 'ku', 'ma', 'ha',
      'habari', 'asante', 'karibu', 'pole', 'sawa', 'hapana', 'ndiyo',
      'jambo', 'mambo', 'sasa', 'leo', 'kesho', 'jana', 'kazi', 'mtu',
      'watu', 'mimi', 'wewe', 'yeye', 'sisi', 'nyinyi', 'wao'
    ];

    const words = text.toLowerCase().split(/\s+/);
    const swahiliCount = words.filter(word => 
      swahiliWords.some(sw => word.includes(sw))
    ).length;
    
    const swahiliRatio = swahiliCount / words.length;
    
    if (swahiliRatio > 0.3) {
      return swahiliRatio > 0.7 ? 'sw' : 'mixed';
    }
    return 'en';
  }

  /**
   * Get system prompt based on language
   */
  private getSystemPrompt(language: Language, detectedLang: 'en' | 'sw' | 'mixed'): string {
    const finalLang = language === 'auto' ? detectedLang : language;

    if (finalLang === 'sw' || finalLang === 'mixed') {
      return `Wewe ni Msaidizi wa Kazi wa AI wa kitaalamu kwa jukwaa la Talent Search Africa. 
Jukumu lako ni kusaidia vijana wa Afrika katika safari zao za kazi. 

MISINGI:
1. Jibu KWA KISWAHILI tu (unaweza kutumia istilahi za Kiingereza kama "CV", "LinkedIn" kama ni lazima)
2. Toa mwongozo unaoweza kutekelezwa kwa soko la kazi la Kenya na Afrika
3. Rejea wasifu wa mtumiaji (ujuzi, uzoefu, malengo) wakati wowote unaweza
4. Toa ushauri unaojumuisha mifano halisi na miongozo ya hatua kwa hatua
5. Kuwa na ufahamu wa kitamaduni na uelewe mazingira ya kazi ya Afrika

HUDUMA ZAKO:
- Maandalizi ya CV: Uboreshaji wa ATS, mbinu ya STAR, mifano halisi
- Maandalizi ya Mahojiano: Maswali ya kawaida, mbinu ya STAR, mazoezi
- Ujuzi: Miongozo ya kujifunza, rasilimali (Coursera, Udemy, freeCodeCamp), ratiba za kila wiki
- Utafutaji wa Kazi: Mikakati ya Kenya (BrighterMonday, Fuzu) na kimataifa, networking
- Mwongozo wa Mshahara: Maslahi halisi ya Kenya, mikakati ya mazungumzo
- Usaidizi wa Kihisia: Ushauri wa kiroho, kukabiliana na kukataliwa, mikakati ya kujirudisha

JIBU kwa Kiswahili kwa ujuzi, ufahamu, na ukarimu.`;
    }

    return `You are a professional AI Career Assistant for the Talent Search Africa platform.
Your role is to help African youth navigate their career journeys.

CORE PRINCIPLES:
1. Provide actionable guidance tailored to African job markets (especially Kenya)
2. Reference user profile (skills, experience, location, career goals) whenever possible
3. Give practical, step-by-step advice with real examples
4. Be culturally aware and understand African work contexts
5. Be warm, encouraging, and supportive

YOUR SERVICES:
- CV Assistance: ATS optimization, STAR method, actionable formatting, live examples
- Interview Preparation: Common questions, STAR method guidance, virtual interview best practices, follow-up templates
- Skill Development: Coursera, Udemy, freeCodeCamp roadmaps, week-by-week breakdown, daily practice schedules
- Job Search Strategies: Kenyan (BrighterMonday, Fuzu) + international, networking guidance (Design Community Kenya, Nairobi Creative Business Community)
- Salary Guide: Realistic Kenyan salary ranges, negotiation strategies, benefits advice
- Platform Guidance: Profile completeness, portfolio suggestions, certificate verification, engagement tips, milestone encouragement
- Emotional Support: Application stress, rejection framing, reset strategies, mental health advice

Respond professionally, warmly, and with actionable insights.`;
  }

  /**
   * Build context from user profile
   */
  private buildUserContext(userProfile?: UserProfile): string {
    if (!userProfile) return '';

    const context: string[] = [];
    
    // Name (check multiple fields)
    const name = userProfile.fullName || userProfile.name || '';
    if (name) context.push(`Name: ${name}`);
    
    // Talent Area / Career Field (CRITICAL for personalization - check multiple fields)
    const talentArea = userProfile.talentArea || userProfile.preferredCareerField || userProfile.industryType || '';
    if (talentArea) {
      context.push(`Talent/Career Field: ${talentArea} (THIS IS THE USER'S PRIMARY FIELD - ALL ADVICE MUST BE TAILORED TO THIS)`);
    }
    
    // Bio/Description
    if (userProfile.bio) context.push(`Bio: ${userProfile.bio}`);
    
    // Skills (handle both string[] and object[] formats)
    if (userProfile.skills && userProfile.skills.length > 0) {
      const skillsList = userProfile.skills.map((skill: string | { skillName: string; proficiencyLevel?: string }) => 
        typeof skill === 'string' ? skill : (skill && typeof skill === 'object' && 'skillName' in skill ? skill.skillName : '')
      ).filter((s: string) => s.length > 0);
      if (skillsList.length > 0) {
        context.push(`Skills: ${skillsList.join(', ')}`);
      }
    }
    
    if (userProfile.experience) context.push(`Experience: ${userProfile.experience}`);
    if (userProfile.location || userProfile.city) {
      context.push(`Location: ${userProfile.location || userProfile.city}`);
    }
    if (userProfile.careerGoals && userProfile.careerGoals.length > 0) {
      context.push(`Career Goals: ${userProfile.careerGoals.join(', ')}`);
    }
    if (userProfile.yearsOfExperience) {
      context.push(`Years of Experience: ${userProfile.yearsOfExperience}`);
    }
    if (userProfile.educationLevel) {
      context.push(`Education: ${userProfile.educationLevel}`);
    }

    return context.length > 0 
      ? `\n\nUSER PROFILE (USE THIS TO PERSONALIZE ALL RESPONSES):\n${context.join('\n')}\n\nIMPORTANT: All advice, recommendations, and responses MUST be tailored to the user's Talent/Career Field. If the user is a swimmer, provide swimming-specific advice. If they're in tech, provide tech-specific advice. Always reference their specific field in your responses.\n`
      : '';
  }

  /**
   * Generate AI response using Claude API
   */
  async generateResponse(
    message: string,
    userProfile?: UserProfile,
    language: Language = 'auto',
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<string> {
    if (!this.apiKey || this.apiKey.trim() === '') {
      const errorMsg = language === 'sw' 
        ? 'Samahani, huduma ya AI haipo kwa sasa. Tafadhali weka VITE_ANTHROPIC_API_KEY katika faili ya .env na uanze tena.'
        : 'Sorry, AI service is currently unavailable. Please set VITE_ANTHROPIC_API_KEY in your .env file and restart the application.';
      console.error('Anthropic API key is missing. Please set VITE_ANTHROPIC_API_KEY in your .env file.');
      return errorMsg;
    }

    try {
      // Detect language if auto
      const detectedLang = this.detectLanguage(message);
      const systemPrompt = this.getSystemPrompt(language, detectedLang);
      const userContext = this.buildUserContext(userProfile);

      // Build messages array
      const messages: Anthropic.MessageParam[] = [
        ...conversationHistory.map(msg => ({
          role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: msg.content,
        })),
        {
          role: 'user' as const,
          content: `${userContext}${message}`,
        },
      ];

      // Check if client is initialized
      if (!this.client) {
        throw new Error('Anthropic client not initialized. Please set VITE_ANTHROPIC_API_KEY in your .env file.');
      }

      // Call Claude API
      // Use current available models - try claude-3-5-sonnet-20240620 first, then fallback to claude-3-5-haiku-20241022
      let response;
      const modelsToTry = [
        'claude-3-5-sonnet-20240620',  // Current stable model
        'claude-3-5-haiku-20241022',   // Faster, cheaper alternative
        'claude-3-opus-20240229',      // Fallback (deprecated but still works)
      ];
      
      let lastError: any = null;
      for (const model of modelsToTry) {
        try {
          console.log(`[ClaudeService] Trying model: ${model}`);
          response = await this.client.messages.create({
            model: model,
            max_tokens: 2048,
            system: systemPrompt,
            messages: messages as Anthropic.MessageParam[],
          });
          console.log(`[ClaudeService] Successfully used model: ${model}`);
          break; // Success, exit loop
        } catch (modelError: any) {
          lastError = modelError;
          console.warn(`[ClaudeService] Model ${model} failed:`, modelError?.message || modelError?.status);
          
          // If it's a 404 (model not found), try next model
          if (modelError?.status === 404 || modelError?.statusCode === 404 || 
              modelError?.message?.includes('not_found') || 
              modelError?.message?.includes('model')) {
            continue; // Try next model
          } else {
            // For other errors (auth, rate limit, etc.), throw immediately
            throw modelError;
          }
        }
      }
      
      // If all models failed, throw the last error
      if (!response) {
        throw lastError || new Error('All Claude models failed');
      }

      // Extract text content
      const content = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === 'text'
      );

      if (!content) {
        throw new Error('No text content in response');
      }

      return content.text;
    } catch (error: any) {
      console.error('Claude API error:', error);
      console.error('Error details:', {
        status: error?.status,
        statusCode: error?.statusCode,
        message: error?.message,
        error: error
      });
      
      // Handle specific error types
      if (error?.status === 401 || error?.statusCode === 401 || error?.message?.includes('api key') || error?.message?.includes('authentication')) {
        const errorMsg = language === 'sw'
          ? 'Samahani, ufunguo wa API haujafungwa sawa. Tafadhali angalia VITE_ANTHROPIC_API_KEY katika faili ya .env na uanze tena programu.'
          : 'Sorry, API key is not configured correctly. Please check VITE_ANTHROPIC_API_KEY in your .env file and restart the application.';
        console.error('API Key Error:', errorMsg);
        return errorMsg;
      }
      
      if (error?.status === 429 || error?.statusCode === 429 || error?.message?.includes('rate limit')) {
        const errorMsg = language === 'sw'
          ? 'Samahani, umefikia kikomo cha matumizi. Tafadhali jaribu tena baadaye (baada ya dakika chache).'
          : 'Sorry, rate limit exceeded. Please try again later (after a few minutes).';
        return errorMsg;
      }
      
      if (error?.status === 400 || error?.statusCode === 400) {
        const errorMsg = language === 'sw'
          ? 'Samahani, ombi lako halikukubalika. Tafadhali jaribu kuandika tena kwa njia tofauti.'
          : 'Sorry, your request was invalid. Please try rephrasing your question.';
        return errorMsg;
      }
      
      // Return friendly error message
      if (language === 'sw') {
        return 'Samahani, nimepata kosa wakati wa kuchakata ombi lako. Tafadhali jaribu tena baadaye.';
      }
      return 'Sorry, I encountered an error processing your request. Please try again later.';
    }
  }

  /**
   * Generate response with retry logic
   */
  async generateResponseWithRetry(
    message: string,
    userProfile?: UserProfile,
    language: Language = 'auto',
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    maxRetries: number = 3
  ): Promise<string> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.generateResponse(message, userProfile, language, conversationHistory);
      } catch (error: any) {
        console.error(`Attempt ${attempt}/${maxRetries} failed:`, error);
        
        // Exponential backoff
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Last attempt failed, return error message
          const errorMsg = language === 'sw'
            ? 'Samahani, nimepata kosa baada ya kurudia mara kadhaa. Tafadhali jaribu tena baadaye.'
            : 'Sorry, I encountered an error after multiple retries. Please try again later.';
          return errorMsg;
        }
      }
    }

    // This should never be reached, but TypeScript requires it
    const errorMsg = language === 'sw'
      ? 'Samahani, nimepata kosa. Tafadhali jaribu tena baadaye.'
      : 'Sorry, I encountered an error. Please try again later.';
    
    return errorMsg;
  }
}

export const claudeService = new ClaudeService();


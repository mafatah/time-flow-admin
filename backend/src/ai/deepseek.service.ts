import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export interface DeepSeekAnalysisResult {
  isWorking: boolean;
  workingScore: number; // 0-100
  workingReason: string;
  detectedActivity: string;
  productivityLevel: 'high' | 'medium' | 'low' | 'none';
  categories: string[];
  concerns: string[];
  recommendations: string[];
  confidence: number;
  timestamp: string;
}

export interface ScreenshotAnalysis {
  screenshot_id: string;
  analysis: DeepSeekAnalysisResult;
  visual_elements: string[];
  text_detected: string;
  applications_identified: string[];
  suspicious_indicators: string[];
}

export interface URLAnalysis {
  url: string;
  domain: string;
  category: string;
  workRelated: boolean;
  productivityScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  analysis: string;
}

export interface AppAnalysis {
  app_name: string;
  category: string;
  workRelated: boolean;
  productivityScore: number;
  usagePattern: string;
  analysis: string;
}

export interface DailyAnalysisReport {
  user_id: string;
  date: string;
  overall_productivity_score: number;
  working_hours: number;
  distraction_time: number;
  focus_periods: number;
  top_distractions: string[];
  productivity_trend: 'improving' | 'stable' | 'declining';
  key_insights: string[];
  recommendations: string[];
  detailed_analysis: string;
  screenshot_analysis: ScreenshotAnalysis[];
  url_analysis: URLAnalysis[];
  app_analysis: AppAnalysis[];
}

@Injectable()
export class DeepSeekService {
  private readonly logger = new Logger(DeepSeekService.name);
  private readonly apiClient: AxiosInstance;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('DEEPSEEK_API_KEY') || 'demo-key';
    this.baseUrl = this.configService.get<string>('DEEPSEEK_BASE_URL') || 'https://api.deepseek.com';
    
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async analyzeScreenshot(screenshotPath: string, context?: any): Promise<ScreenshotAnalysis> {
    try {
      this.logger.debug(`Analyzing screenshot: ${screenshotPath}`);
      
      // Convert image to base64
      const imageBuffer = fs.readFileSync(screenshotPath);
      const base64Image = imageBuffer.toString('base64');
      
      const prompt = this.buildScreenshotAnalysisPrompt(context);
      
      const response = await this.apiClient.post('/v1/chat/completions', {
        model: 'deepseek-vl-7b-chat',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant specialized in analyzing employee work productivity through screenshots. 
            Your task is to determine if the employee is working productively and provide detailed analysis.
            Always respond in JSON format with the required fields.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1,
      });

      const analysis = this.parseAnalysisResponse(response.data.choices[0].message.content);
      
      return {
        screenshot_id: path.basename(screenshotPath),
        analysis,
        visual_elements: analysis.categories || [],
        text_detected: '',
        applications_identified: [],
        suspicious_indicators: analysis.concerns || []
      };
    } catch (error) {
      this.logger.error(`Error analyzing screenshot: ${error.message}`);
      return this.getFallbackScreenshotAnalysis(screenshotPath);
    }
  }

  async analyzeURL(url: string, visitDuration: number, context?: any): Promise<URLAnalysis> {
    try {
      this.logger.debug(`Analyzing URL: ${url}`);
      
      const prompt = this.buildURLAnalysisPrompt(url, visitDuration, context);
      
      const response = await this.apiClient.post('/v1/chat/completions', {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant specialized in analyzing website URLs for employee productivity monitoring.
            Determine if the URL is work-related and assess productivity impact.
            Always respond in JSON format.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.1,
      });

      return this.parseURLAnalysisResponse(response.data.choices[0].message.content, url);
    } catch (error) {
      this.logger.error(`Error analyzing URL: ${error.message}`);
      return this.getFallbackURLAnalysis(url);
    }
  }

  async analyzeApplication(appName: string, usageDuration: number, context?: any): Promise<AppAnalysis> {
    try {
      this.logger.debug(`Analyzing application: ${appName}`);
      
      const prompt = this.buildAppAnalysisPrompt(appName, usageDuration, context);
      
      const response = await this.apiClient.post('/v1/chat/completions', {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant specialized in analyzing application usage for employee productivity monitoring.
            Determine if the application is work-related and assess productivity impact.
            Always respond in JSON format.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.1,
      });

      return this.parseAppAnalysisResponse(response.data.choices[0].message.content, appName);
    } catch (error) {
      this.logger.error(`Error analyzing application: ${error.message}`);
      return this.getFallbackAppAnalysis(appName);
    }
  }

  async generateDailyReport(
    userId: string,
    date: string,
    screenshots: ScreenshotAnalysis[],
    urls: URLAnalysis[],
    apps: AppAnalysis[],
    context?: any
  ): Promise<DailyAnalysisReport> {
    try {
      this.logger.debug(`Generating daily report for user: ${userId}, date: ${date}`);
      
      const prompt = this.buildDailyReportPrompt(userId, date, screenshots, urls, apps, context);
      
      const response = await this.apiClient.post('/v1/chat/completions', {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant specialized in generating comprehensive daily productivity reports for employees.
            Analyze all provided data and generate insights, recommendations, and detailed analysis.
            Always respond in JSON format with the required fields.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.2,
      });

      return this.parseDailyReportResponse(response.data.choices[0].message.content, userId, date, screenshots, urls, apps);
    } catch (error) {
      this.logger.error(`Error generating daily report: ${error.message}`);
      return this.getFallbackDailyReport(userId, date, screenshots, urls, apps);
    }
  }

  private buildScreenshotAnalysisPrompt(context?: any): string {
    return `
    Analyze this screenshot to determine if the employee is working productively.
    
    Please analyze the screenshot and provide a detailed assessment:
    
    1. Is the employee working? (true/false)
    2. Working score (0-100, where 100 is highly productive work)
    3. What specific activity is being performed?
    4. Productivity level (high/medium/low/none)
    5. Categories of content visible (e.g., "development", "email", "social media", "entertainment")
    6. Any concerns or red flags
    7. Recommendations for improvement
    8. Confidence level (0-100)
    
    Look for indicators such as:
    - Work-related applications (IDEs, email, spreadsheets, presentations)
    - Social media platforms (Facebook, Instagram, Twitter, TikTok)
    - Entertainment sites (YouTube, Netflix, gaming platforms)
    - News websites
    - Shopping sites
    - Productivity tools vs. distraction sites
    - Multiple tabs/windows and their content
    - Time-wasting activities
    
    Respond in JSON format:
    {
      "isWorking": boolean,
      "workingScore": number,
      "workingReason": "detailed explanation",
      "detectedActivity": "description of main activity",
      "productivityLevel": "high|medium|low|none",
      "categories": ["category1", "category2"],
      "concerns": ["concern1", "concern2"],
      "recommendations": ["recommendation1", "recommendation2"],
      "confidence": number,
      "timestamp": "${new Date().toISOString()}"
    }
    `;
  }

  private buildURLAnalysisPrompt(url: string, visitDuration: number, context?: any): string {
    return `
    Analyze this URL to determine if it's work-related and assess productivity impact:
    
    URL: ${url}
    Visit Duration: ${visitDuration} seconds
    
    Please provide:
    1. Domain categorization (work, social media, entertainment, news, shopping, etc.)
    2. Is this work-related? (true/false)
    3. Productivity score (0-100)
    4. Risk level (low/medium/high) for productivity
    5. Analysis and reasoning
    
    Consider:
    - Work domains (company sites, professional tools, documentation)
    - Social media platforms
    - Entertainment and streaming sites
    - News and information sites
    - Shopping and e-commerce
    - Gaming and recreational sites
    - Visit duration impact
    
    Respond in JSON format:
    {
      "domain": "extracted domain",
      "category": "category name",
      "workRelated": boolean,
      "productivityScore": number,
      "riskLevel": "low|medium|high",
      "analysis": "detailed analysis"
    }
    `;
  }

  private buildAppAnalysisPrompt(appName: string, usageDuration: number, context?: any): string {
    return `
    Analyze this application to determine if it's work-related and assess productivity impact:
    
    Application: ${appName}
    Usage Duration: ${usageDuration} seconds
    
    Please provide:
    1. Application category (productivity, development, communication, entertainment, etc.)
    2. Is this work-related? (true/false)
    3. Productivity score (0-100)
    4. Usage pattern assessment
    5. Analysis and reasoning
    
    Consider:
    - Development tools (IDEs, terminals, Git clients)
    - Productivity apps (Office suite, note-taking, project management)
    - Communication tools (email, messaging, video conferencing)
    - Entertainment apps (games, media players, streaming)
    - Social media applications
    - Usage duration appropriateness
    
    Respond in JSON format:
    {
      "category": "category name",
      "workRelated": boolean,
      "productivityScore": number,
      "usagePattern": "pattern description",
      "analysis": "detailed analysis"
    }
    `;
  }

  private buildDailyReportPrompt(
    userId: string,
    date: string,
    screenshots: ScreenshotAnalysis[],
    urls: URLAnalysis[],
    apps: AppAnalysis[],
    context?: any
  ): string {
    const screenshotSummary = screenshots.map(s => `Score: ${s.analysis.workingScore}, Activity: ${s.analysis.detectedActivity}`).join('; ');
    const urlSummary = urls.map(u => `${u.domain}: ${u.productivityScore}% productive`).join('; ');
    const appSummary = apps.map(a => `${a.app_name}: ${a.productivityScore}% productive`).join('; ');
    
    return `
    Generate a comprehensive daily productivity report for employee ${userId} on ${date}.
    
    Screenshot Analysis Summary: ${screenshotSummary}
    URL Analysis Summary: ${urlSummary}
    Application Analysis Summary: ${appSummary}
    
    Please provide:
    1. Overall productivity score (0-100)
    2. Estimated working hours vs total hours
    3. Distraction time calculation
    4. Number of focus periods identified
    5. Top 3 distractions
    6. Productivity trend (improving/stable/declining)
    7. Key insights (3-5 bullet points)
    8. Recommendations for improvement
    9. Detailed analysis paragraph
    
    Respond in JSON format:
    {
      "overall_productivity_score": number,
      "working_hours": number,
      "distraction_time": number,
      "focus_periods": number,
      "top_distractions": ["distraction1", "distraction2", "distraction3"],
      "productivity_trend": "improving|stable|declining",
      "key_insights": ["insight1", "insight2", "insight3"],
      "recommendations": ["recommendation1", "recommendation2"],
      "detailed_analysis": "comprehensive analysis paragraph"
    }
    `;
  }

  private parseAnalysisResponse(content: string): DeepSeekAnalysisResult {
    try {
      const cleanContent = content.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanContent);
      
      return {
        isWorking: parsed.isWorking || false,
        workingScore: parsed.workingScore || 0,
        workingReason: parsed.workingReason || '',
        detectedActivity: parsed.detectedActivity || '',
        productivityLevel: parsed.productivityLevel || 'none',
        categories: parsed.categories || [],
        concerns: parsed.concerns || [],
        recommendations: parsed.recommendations || [],
        confidence: parsed.confidence || 0,
        timestamp: parsed.timestamp || new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error parsing analysis response: ${error.message}`);
      return this.getFallbackAnalysisResult();
    }
  }

  private parseURLAnalysisResponse(content: string, url: string): URLAnalysis {
    try {
      const cleanContent = content.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanContent);
      
      return {
        url,
        domain: parsed.domain || new URL(url).hostname,
        category: parsed.category || 'unknown',
        workRelated: parsed.workRelated || false,
        productivityScore: parsed.productivityScore || 0,
        riskLevel: parsed.riskLevel || 'low',
        analysis: parsed.analysis || ''
      };
    } catch (error) {
      this.logger.error(`Error parsing URL analysis response: ${error.message}`);
      return this.getFallbackURLAnalysis(url);
    }
  }

  private parseAppAnalysisResponse(content: string, appName: string): AppAnalysis {
    try {
      const cleanContent = content.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanContent);
      
      return {
        app_name: appName,
        category: parsed.category || 'unknown',
        workRelated: parsed.workRelated || false,
        productivityScore: parsed.productivityScore || 0,
        usagePattern: parsed.usagePattern || 'normal',
        analysis: parsed.analysis || ''
      };
    } catch (error) {
      this.logger.error(`Error parsing app analysis response: ${error.message}`);
      return this.getFallbackAppAnalysis(appName);
    }
  }

  private parseDailyReportResponse(
    content: string,
    userId: string,
    date: string,
    screenshots: ScreenshotAnalysis[],
    urls: URLAnalysis[],
    apps: AppAnalysis[]
  ): DailyAnalysisReport {
    try {
      const cleanContent = content.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanContent);
      
      return {
        user_id: userId,
        date,
        overall_productivity_score: parsed.overall_productivity_score || 0,
        working_hours: parsed.working_hours || 0,
        distraction_time: parsed.distraction_time || 0,
        focus_periods: parsed.focus_periods || 0,
        top_distractions: parsed.top_distractions || [],
        productivity_trend: parsed.productivity_trend || 'stable',
        key_insights: parsed.key_insights || [],
        recommendations: parsed.recommendations || [],
        detailed_analysis: parsed.detailed_analysis || '',
        screenshot_analysis: screenshots,
        url_analysis: urls,
        app_analysis: apps
      };
    } catch (error) {
      this.logger.error(`Error parsing daily report response: ${error.message}`);
      return this.getFallbackDailyReport(userId, date, screenshots, urls, apps);
    }
  }

  private getFallbackAnalysisResult(): DeepSeekAnalysisResult {
    return {
      isWorking: false,
      workingScore: 0,
      workingReason: 'Analysis failed - using fallback',
      detectedActivity: 'Unknown',
      productivityLevel: 'none',
      categories: [],
      concerns: ['Analysis system error'],
      recommendations: ['Please check system configuration'],
      confidence: 0,
      timestamp: new Date().toISOString()
    };
  }

  private getFallbackScreenshotAnalysis(screenshotPath: string): ScreenshotAnalysis {
    return {
      screenshot_id: path.basename(screenshotPath),
      analysis: this.getFallbackAnalysisResult(),
      visual_elements: [],
      text_detected: '',
      applications_identified: [],
      suspicious_indicators: []
    };
  }

  private getFallbackURLAnalysis(url: string): URLAnalysis {
    return {
      url,
      domain: new URL(url).hostname,
      category: 'unknown',
      workRelated: false,
      productivityScore: 0,
      riskLevel: 'low',
      analysis: 'Analysis failed - using fallback'
    };
  }

  private getFallbackAppAnalysis(appName: string): AppAnalysis {
    return {
      app_name: appName,
      category: 'unknown',
      workRelated: false,
      productivityScore: 0,
      usagePattern: 'unknown',
      analysis: 'Analysis failed - using fallback'
    };
  }

  private getFallbackDailyReport(
    userId: string,
    date: string,
    screenshots: ScreenshotAnalysis[],
    urls: URLAnalysis[],
    apps: AppAnalysis[]
  ): DailyAnalysisReport {
    return {
      user_id: userId,
      date,
      overall_productivity_score: 0,
      working_hours: 0,
      distraction_time: 0,
      focus_periods: 0,
      top_distractions: [],
      productivity_trend: 'stable',
      key_insights: ['Analysis system error'],
      recommendations: ['Please check system configuration'],
      detailed_analysis: 'Daily analysis failed - using fallback data',
      screenshot_analysis: screenshots,
      url_analysis: urls,
      app_analysis: apps
    };
  }
}
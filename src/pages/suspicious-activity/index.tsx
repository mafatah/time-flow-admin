import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/providers/auth-provider';
import { toast } from 'sonner';
import { AlertTriangle, Eye, Clock, Smartphone, Globe, TrendingDown, User, Shield, Search, Activity, Copy, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface Employee {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface SuspiciousActivity {
  user_id: string;
  risk_score: number;
  social_media_usage: number;
  news_consumption: number;
  idle_time_hours: number;
  unproductive_websites: number;
  entertainment_apps: number;
  low_focus_periods: number;
  duplicate_screenshots: number;
  low_activity_periods: number;
  screenshot_analysis: {
    total_screenshots: number;
    suspicious_screenshots: number;
    duplicate_screenshots: number;
    static_screen_periods: number;
    entertainment_count: number;
    social_media_count: number;
    news_count: number;
    gaming_count: number;
    avg_activity_level: number;
    low_activity_count: number;
  };
  productivity_metrics: {
    avg_activity_level: number;
    productive_hours: number;
    total_hours: number;
    efficiency_rating: number;
    focus_consistency: number;
    work_pattern_score: number;
  };
  suspicious_patterns: {
    social_media_during_work: boolean;
    entertainment_heavy_usage: boolean;
    static_screen_syndrome: boolean;
    low_activity_with_tracking: boolean;
    suspicious_timing_patterns: boolean;
    minimal_productivity_signs: boolean;
  };
  flags: string[];
  last_analyzed: string;
}

// Enhanced suspicious domain patterns
const SUSPICIOUS_PATTERNS = {
  social_media: [
    'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com', 'tiktok.com',
    'snapchat.com', 'reddit.com', 'pinterest.com', 'whatsapp.com', 'telegram.org',
    'discord.com', 'slack.com', 'teams.microsoft.com'
  ],
  news: [
    'cnn.com', 'bbc.com', 'fox.com', 'reuters.com', 'ap.org', 'news.google.com',
    'yahoo.com/news', 'msn.com/news', 'nytimes.com', 'washingtonpost.com',
    'theguardian.com', 'huffpost.com', 'buzzfeed.com', 'dailymail.co.uk'
  ],
  entertainment: [
    'youtube.com', 'netflix.com', 'hulu.com', 'disney.com', 'twitch.tv',
    'spotify.com', 'soundcloud.com', 'tiktok.com', 'vine.co', 'primevideo.com',
    'hbomax.com', 'peacocktv.com', 'paramountplus.com', 'crunchyroll.com'
  ],
  gaming: [
    'steam.com', 'epic.com', 'epicgames.com', 'battlenet.com', 'blizzard.com', 'origin.com', 'uplay.com',
    'minecraft.net', 'roblox.com', 'twitch.tv/games', 'itch.io', 'gog.com'
  ],
  shopping: [
    'amazon.com', 'ebay.com', 'walmart.com', 'target.com', 'alibaba.com',
    'aliexpress.com', 'etsy.com', 'shopify.com', 'bestbuy.com', 'newegg.com'
  ]
};

// Enhanced risk scoring weights
const RISK_WEIGHTS = {
  social_media: 3,
  news: 1,
  entertainment: 4,
  gaming: 5,
  shopping: 2,
  duplicate_screenshots: 8,
  low_activity: 6,
  static_screen: 7,
  idle_time: 4,
  unproductive_combo: 10 // When multiple factors combine
};

export default function SuspiciousActivityPage() {
  const { userDetails } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [suspiciousActivities, setSuspiciousActivities] = useState<SuspiciousActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [dateRange, setDateRange] = useState<number>(7); // days
  const [riskThreshold, setRiskThreshold] = useState<number>(15); // Lowered from 20 to catch more cases
  const [detailsEmployee, setDetailsEmployee] = useState<SuspiciousActivity | null>(null);

  useEffect(() => {
    if (userDetails?.role === 'admin') {
      fetchEmployees();
    }
  }, [userDetails]);

  useEffect(() => {
    if (userDetails?.role === 'admin' && employees.length > 0) {
      analyzeSuspiciousActivity();
    }
  }, [userDetails, selectedEmployee, dateRange, employees]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role')
        .in('role', ['employee', 'admin', 'manager'])
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch employees');
    }
  };

  const analyzeSuspiciousActivity = async () => {
    setAnalyzing(true);
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, dateRange);

      const employeesToAnalyze = selectedEmployee === 'all' 
        ? employees 
        : employees.filter(e => e.id === selectedEmployee);

      const activities: SuspiciousActivity[] = [];

      for (const employee of employeesToAnalyze) {
        const activity = await analyzeEmployeeActivity(employee.id, startDate, endDate);
        if (activity) {
          activities.push(activity);
        }
      }

      // Sort by risk score descending
      activities.sort((a, b) => b.risk_score - a.risk_score);
      setSuspiciousActivities(activities);
    } catch (error) {
      console.error('Error analyzing suspicious activity:', error);
      toast.error('Failed to analyze suspicious activity');
    } finally {
      setAnalyzing(false);
      setLoading(false);
    }
  };

  const analyzeEmployeeActivity = async (userId: string, startDate: Date, endDate: Date): Promise<SuspiciousActivity | null> => {
    try {
      // Fetch screenshots with enhanced fields
      const { data: screenshots, error: screenshotError } = await supabase
        .from('screenshots')
        .select('*')
        .eq('user_id', userId)
        .gte('captured_at', startDate.toISOString())
        .lte('captured_at', endDate.toISOString())
        .order('captured_at', { ascending: true });

      if (screenshotError) throw screenshotError;

      // Fetch URL logs
      const { data: urlLogs, error: urlError } = await supabase
        .from('url_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      if (urlError) throw urlError;

      // Fetch app logs
      const { data: appLogs, error: appError } = await supabase
        .from('app_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      if (appError) throw appError;

      // Fetch idle logs
      const { data: idleLogs, error: idleError } = await supabase
        .from('idle_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('idle_start', startDate.toISOString())
        .lte('idle_start', endDate.toISOString());

      if (idleError) throw idleError;

      // Analyze the data with enhanced logic
      return performEnhancedSuspiciousAnalysis(
        userId,
        screenshots || [],
        urlLogs || [],
        appLogs || [],
        idleLogs || []
      );
    } catch (error) {
      console.error(`Error analyzing activity for user ${userId}:`, error);
      return null;
    }
  };

  // Enhanced analysis function with advanced detection
  const performEnhancedSuspiciousAnalysis = (
    userId: string,
    screenshots: any[],
    urlLogs: any[],
    appLogs: any[],
    idleLogs: any[]
  ): SuspiciousActivity => {
    let baseRiskScore = 0;
    const flags: string[] = [];

    // DEBUG: Log data availability (remove after fixing)
    const debugMode = true; // Set to false to disable debug logging
    if (debugMode) {
      console.log('🔍 Analysis Debug:', {
        screenshots: screenshots.length,
        urlLogs: urlLogs.length,
        appLogs: appLogs.length,
        idleLogs: idleLogs.length,
        sampleScreenshot: screenshots[0] ? {
          url: screenshots[0].url,
          window_title: screenshots[0].window_title,
          active_window_title: screenshots[0].active_window_title,
          app_name: screenshots[0].app_name
        } : null,
        sampleUrlLog: urlLogs[0] ? {
          url: urlLogs[0].url,
          site_url: urlLogs[0].site_url,
          domain: urlLogs[0].domain,
          title: urlLogs[0].title
        } : null
      });
    }

    // 1. ENHANCED URL ANALYSIS
    let socialMediaUsage = 0;
    let newsConsumption = 0;
    let unproductiveWebsites = 0;
    let entertainmentUsage = 0;
    let gamingUsage = 0;
    let shoppingUsage = 0;

    urlLogs.forEach(log => {
      // Check multiple possible URL fields
      const url = (log.site_url || log.url || log.domain || '').toLowerCase();
      const title = (log.title || '').toLowerCase();
      
      // Also check window title from URL logs if available
      const windowTitle = (log.window_title || '').toLowerCase();
      
      const allText = `${url} ${title} ${windowTitle}`.toLowerCase();
      
      if (SUSPICIOUS_PATTERNS.social_media.some(domain => allText.includes(domain) || allText.includes(domain.split('.')[0]))) {
        socialMediaUsage++;
        baseRiskScore += RISK_WEIGHTS.social_media;
        if (debugMode) console.log('🔍 Social media detected in URL:', allText);
      }
      
      if (SUSPICIOUS_PATTERNS.news.some(domain => allText.includes(domain) || allText.includes(domain.split('.')[0]))) {
        newsConsumption++;
        baseRiskScore += RISK_WEIGHTS.news;
      }
      
      if (SUSPICIOUS_PATTERNS.entertainment.some(domain => allText.includes(domain) || allText.includes(domain.split('.')[0]))) {
        entertainmentUsage++;
        unproductiveWebsites++;
        baseRiskScore += RISK_WEIGHTS.entertainment;
      }
      
      if (SUSPICIOUS_PATTERNS.gaming.some(domain => allText.includes(domain) || allText.includes(domain.split('.')[0]))) {
        gamingUsage++;
        unproductiveWebsites++;
        baseRiskScore += RISK_WEIGHTS.gaming;
      }
      
      if (SUSPICIOUS_PATTERNS.shopping.some(domain => allText.includes(domain) || allText.includes(domain.split('.')[0]))) {
        shoppingUsage++;
        unproductiveWebsites++;
        baseRiskScore += RISK_WEIGHTS.shopping;
      }
    });

    // 2. ENHANCED APP ANALYSIS
    let entertainmentApps = 0;
    const suspiciousApps = ['game', 'steam', 'discord', 'spotify', 'netflix', 'youtube', 'twitch', 'safari', 'chrome', 'firefox', 'edge'];
    const socialMediaApps = ['facebook', 'instagram', 'twitter', 'tiktok', 'linkedin', 'reddit', 'whatsapp', 'telegram'];
    
    appLogs.forEach(log => {
      const appName = (log.app_name || '').toLowerCase();
      const windowTitle = (log.window_title || '').toLowerCase();
      const appPath = (log.app_path || '').toLowerCase();
      
      const allAppText = `${appName} ${windowTitle} ${appPath}`.toLowerCase();
      
      // Check for social media in app data
      if (socialMediaApps.some(app => allAppText.includes(app))) {
        socialMediaUsage++;
        baseRiskScore += RISK_WEIGHTS.social_media;
        if (debugMode) console.log('🔍 Social media detected in app:', allAppText);
      }
      
      // Check for entertainment apps
      if (suspiciousApps.some(app => allAppText.includes(app))) {
        entertainmentApps++;
        baseRiskScore += RISK_WEIGHTS.entertainment;
      }
    });

    // 3. ENHANCED IDLE TIME ANALYSIS
    const totalIdleTime = idleLogs.reduce((sum, log) => {
      if (log.idle_end) {
        const start = new Date(log.idle_start);
        const end = new Date(log.idle_end);
        return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60); // hours
      }
      return sum;
    }, 0);

    // 4. ADVANCED SCREENSHOT ANALYSIS
    const screenshotAnalysis = analyzeScreenshotsAdvanced(screenshots, debugMode);
    
    // Add screenshot-based risk scoring
    baseRiskScore += screenshotAnalysis.duplicate_screenshots * RISK_WEIGHTS.duplicate_screenshots;
    baseRiskScore += screenshotAnalysis.static_screen_periods * RISK_WEIGHTS.static_screen;
    baseRiskScore += screenshotAnalysis.low_activity_count * RISK_WEIGHTS.low_activity;

    // 5. SUSPICIOUS PATTERN DETECTION
    const suspiciousPatterns = {
      social_media_during_work: socialMediaUsage > 3 && screenshotAnalysis.social_media_count > 2,
      entertainment_heavy_usage: entertainmentUsage > 5 || entertainmentApps > 2,
      static_screen_syndrome: screenshotAnalysis.duplicate_screenshots > 3 || screenshotAnalysis.static_screen_periods > 2,
      low_activity_with_tracking: screenshotAnalysis.avg_activity_level < 30 && screenshotAnalysis.total_screenshots > 10,
      suspicious_timing_patterns: detectSuspiciousTimingPatterns(screenshots, urlLogs, appLogs),
      minimal_productivity_signs: screenshotAnalysis.avg_activity_level < 20 && socialMediaUsage > 5
    };

    // 6. COMPOSITE RISK MULTIPLIERS
    let riskMultiplier = 1;
    
    // Multiple unproductive activities happening together
    if (socialMediaUsage > 2 && entertainmentUsage > 2 && screenshotAnalysis.low_activity_count > 3) {
      riskMultiplier += 0.5;
      flags.push('Multiple unproductive activities detected');
    }
    
    // Static screen with social media/entertainment
    if (screenshotAnalysis.duplicate_screenshots > 2 && (socialMediaUsage > 3 || entertainmentUsage > 3)) {
      riskMultiplier += 0.7;
      flags.push('Static screen with entertainment usage');
    }
    
    // Low activity with high idle time
    if (screenshotAnalysis.avg_activity_level < 25 && totalIdleTime > dateRange * 2) {
      riskMultiplier += 0.6;
      flags.push('Consistently low activity levels');
    }

    // 7. PRODUCTIVITY METRICS CALCULATION
    const totalHours = Math.max(1, dateRange * 8); // Assume 8 hour work days
    const productiveHours = Math.max(0, totalHours - totalIdleTime);
    const avgActivityLevel = screenshotAnalysis.avg_activity_level;
    const focusConsistency = calculateFocusConsistency(screenshots);
    const workPatternScore = calculateWorkPatternScore(screenshots, urlLogs, appLogs);
    const efficiencyRating = Math.max(0, 100 - (baseRiskScore * riskMultiplier) / 2);

    // 8. FLAG GENERATION WITH ENHANCED THRESHOLDS
    if (socialMediaUsage > 3) flags.push('High social media usage');
    if (newsConsumption > 8) flags.push('Excessive news consumption');
    if (totalIdleTime > totalHours * 0.25) flags.push('High idle time');
    if (entertainmentApps > 2) flags.push('Entertainment apps during work');
    if (screenshotAnalysis.duplicate_screenshots > 3) flags.push('Multiple duplicate screenshots detected');
    if (screenshotAnalysis.static_screen_periods > 2) flags.push('Static screen periods detected');
    if (screenshotAnalysis.low_activity_count > 5) flags.push('Frequent low activity periods');
    if (screenshotAnalysis.suspicious_screenshots / screenshotAnalysis.total_screenshots > 0.25) {
      flags.push('High ratio of suspicious screenshots');
    }
    if (avgActivityLevel < 40) flags.push('Consistently low activity level');
    if (unproductiveWebsites > 8) flags.push('Excessive unproductive website usage');
    if (focusConsistency < 30) flags.push('Poor focus consistency');
    if (workPatternScore < 40) flags.push('Irregular work patterns');
    
    // Check for missing metadata
    const metadataAvailable = screenshots.some(s => s.url || s.active_window_title || s.window_title || s.app_name);
    if (!metadataAvailable && screenshots.length > 0) {
      flags.push('Limited monitoring - missing window/app metadata');
      baseRiskScore += 10; // Add some base risk when we can't properly detect activities
    }
    
    // Combination flags
    if (suspiciousPatterns.social_media_during_work) flags.push('Social media during productive hours');
    if (suspiciousPatterns.entertainment_heavy_usage) flags.push('Heavy entertainment usage');
    if (suspiciousPatterns.static_screen_syndrome) flags.push('Static screen syndrome');
    if (suspiciousPatterns.low_activity_with_tracking) flags.push('Low activity despite tracking');
    if (suspiciousPatterns.suspicious_timing_patterns) flags.push('Suspicious timing patterns');
    if (suspiciousPatterns.minimal_productivity_signs) flags.push('Minimal productivity indicators');

    // 9. FINAL RISK SCORE CALCULATION
    const finalRiskScore = Math.min(100, Math.max(0, 
      (baseRiskScore * riskMultiplier) + 
      (totalIdleTime * RISK_WEIGHTS.idle_time) + 
      (flags.length * 8) + 
      (Object.values(suspiciousPatterns).filter(Boolean).length * RISK_WEIGHTS.unproductive_combo)
    ));

    return {
      user_id: userId,
      risk_score: Math.round(finalRiskScore),
      social_media_usage: socialMediaUsage,
      news_consumption: newsConsumption,
      idle_time_hours: Math.round(totalIdleTime * 10) / 10,
      unproductive_websites: unproductiveWebsites,
      entertainment_apps: entertainmentApps,
      low_focus_periods: idleLogs.length,
      duplicate_screenshots: screenshotAnalysis.duplicate_screenshots,
      low_activity_periods: screenshotAnalysis.low_activity_count,
      screenshot_analysis: screenshotAnalysis,
      productivity_metrics: {
        avg_activity_level: Math.round(avgActivityLevel),
        productive_hours: Math.round(productiveHours * 10) / 10,
        total_hours: Math.round(totalHours * 10) / 10,
        efficiency_rating: Math.round(efficiencyRating),
        focus_consistency: Math.round(focusConsistency),
        work_pattern_score: Math.round(workPatternScore)
      },
      suspicious_patterns: suspiciousPatterns,
      flags,
      last_analyzed: new Date().toISOString()
    };
  };

  // Advanced screenshot analysis function
  const analyzeScreenshotsAdvanced = (screenshots: any[], debugMode: boolean = false) => {
    let duplicateScreenshots = 0;
    let staticScreenPeriods = 0;
    let lowActivityCount = 0;
    let suspiciousScreenshots = 0;
    let entertainmentCount = 0;
    let socialMediaCount = 0;
    let newsCount = 0;
    let gamingCount = 0;
    
    const activityLevels: number[] = [];
    const consecutiveLowActivity: number[] = [];
    const duplicateGroups: any[] = [];
    
    // Group screenshots by similarity indicators
    for (let i = 0; i < screenshots.length; i++) {
      const screenshot = screenshots[i];
      const activityLevel = screenshot.activity_percent || 0;
      activityLevels.push(activityLevel);
      
      // Check for low activity
      if (activityLevel < 15) {
        lowActivityCount++;
        consecutiveLowActivity.push(i);
      }
      
      // Check for duplicate indicators
      if (i > 0) {
        const prevScreenshot = screenshots[i - 1];
        const timeDiff = new Date(screenshot.captured_at).getTime() - new Date(prevScreenshot.captured_at).getTime();
        
        // If screenshots are close in time and both have very low activity, consider as potential duplicates
        if (timeDiff < 300000 && // Within 5 minutes
            activityLevel < 10 && 
            (prevScreenshot.activity_percent || 0) < 10 &&
            screenshot.active_window_title === prevScreenshot.active_window_title) {
          duplicateScreenshots++;
        }
      }
      
      // Analyze content - check multiple title fields
      const title = (screenshot.active_window_title || screenshot.window_title || '').toLowerCase();
      const url = (screenshot.url || '').toLowerCase();
      const appName = (screenshot.app_name || '').toLowerCase();
      
      // Combine all available text for analysis
      const allText = `${title} ${url} ${appName}`.toLowerCase();
      
      let isSuspicious = false;
      
      if (SUSPICIOUS_PATTERNS.social_media.some(domain => 
        allText.includes(domain) || 
        allText.includes(domain.split('.')[0]) ||
        title.includes(domain.split('.')[0]) ||
        url.includes(domain)
      )) {
        socialMediaCount++;
        isSuspicious = true;
        if (debugMode) console.log('🔍 Social media detected in screenshot:', allText);
      }
      
      if (SUSPICIOUS_PATTERNS.entertainment.some(domain => 
        allText.includes(domain) || 
        allText.includes(domain.split('.')[0]) ||
        title.includes(domain.split('.')[0]) ||
        url.includes(domain)
      )) {
        entertainmentCount++;
        isSuspicious = true;
      }
      
      if (SUSPICIOUS_PATTERNS.news.some(domain => 
        allText.includes(domain) || 
        allText.includes(domain.split('.')[0]) ||
        title.includes(domain.split('.')[0]) ||
        url.includes(domain)
      )) {
        newsCount++;
        isSuspicious = true;
      }
      
      if (SUSPICIOUS_PATTERNS.gaming.some(domain => 
        allText.includes(domain) || 
        allText.includes(domain.split('.')[0]) ||
        title.includes(domain.split('.')[0]) ||
        url.includes(domain)
      )) {
        gamingCount++;
        isSuspicious = true;
      }
      
      if (isSuspicious) {
        suspiciousScreenshots++;
      }
    }
    
    // Detect static screen periods (consecutive low activity)
    let currentStaticPeriod = 0;
    for (let i = 0; i < consecutiveLowActivity.length; i++) {
      if (i === 0 || consecutiveLowActivity[i] === consecutiveLowActivity[i-1] + 1) {
        currentStaticPeriod++;
      } else {
        if (currentStaticPeriod >= 3) { // 3 or more consecutive low activity screenshots
          staticScreenPeriods++;
        }
        currentStaticPeriod = 1;
      }
    }
    if (currentStaticPeriod >= 3) {
      staticScreenPeriods++;
    }
    
    const avgActivityLevel = activityLevels.length > 0 ? 
      activityLevels.reduce((sum, level) => sum + level, 0) / activityLevels.length : 0;
    
    return {
      total_screenshots: screenshots.length,
      suspicious_screenshots: suspiciousScreenshots,
      duplicate_screenshots: duplicateScreenshots,
      static_screen_periods: staticScreenPeriods,
      entertainment_count: entertainmentCount,
      social_media_count: socialMediaCount,
      news_count: newsCount,
      gaming_count: gamingCount,
      avg_activity_level: avgActivityLevel,
      low_activity_count: lowActivityCount
    };
  };

  // Detect suspicious timing patterns
  const detectSuspiciousTimingPatterns = (screenshots: any[], urlLogs: any[], appLogs: any[]): boolean => {
    // Check if social media/entertainment usage correlates with screenshot timing
    const screenshotTimes = screenshots.map(s => new Date(s.captured_at).getTime());
    const suspiciousUrlTimes = urlLogs.filter(url => {
      const urlStr = (url.site_url || url.url || '').toLowerCase();
      return SUSPICIOUS_PATTERNS.social_media.some(domain => urlStr.includes(domain)) ||
             SUSPICIOUS_PATTERNS.entertainment.some(domain => urlStr.includes(domain));
    }).map(url => new Date(url.timestamp).getTime());
    
    // Check if suspicious URLs happen right after screenshots (indicating possible evasion)
    let suspiciousTimingCount = 0;
    for (const screenshotTime of screenshotTimes) {
      const nearbyUrls = suspiciousUrlTimes.filter(urlTime => 
        Math.abs(urlTime - screenshotTime) < 60000 // Within 1 minute
      );
      if (nearbyUrls.length > 0) {
        suspiciousTimingCount++;
      }
    }
    
    return suspiciousTimingCount > 3; // More than 3 suspicious timing correlations
  };

  // Calculate focus consistency
  const calculateFocusConsistency = (screenshots: any[]): number => {
    if (screenshots.length < 2) return 50;
    
    const focusLevels = screenshots.map(s => s.focus_percent || 0);
    const mean = focusLevels.reduce((sum, level) => sum + level, 0) / focusLevels.length;
    const variance = focusLevels.reduce((sum, level) => sum + Math.pow(level - mean, 2), 0) / focusLevels.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower standard deviation means more consistent focus
    return Math.max(0, 100 - stdDev);
  };

  // Calculate work pattern score
  const calculateWorkPatternScore = (screenshots: any[], urlLogs: any[], appLogs: any[]): number => {
    let score = 50; // Base score
    
    // Check for productive apps
    const productiveApps = ['code', 'vscode', 'intellij', 'eclipse', 'atom', 'sublime', 'vim', 'notepad++', 'excel', 'word', 'powerpoint'];
    const productiveAppCount = appLogs.filter(app => 
      productiveApps.some(productive => app.app_name.toLowerCase().includes(productive))
    ).length;
    
    // Check for productive URLs
    const productiveUrls = ['github.com', 'stackoverflow.com', 'docs.google.com', 'office.com', 'notion.so'];
    const productiveUrlCount = urlLogs.filter(url => 
      productiveUrls.some(productive => (url.site_url || url.url || '').toLowerCase().includes(productive))
    ).length;
    
    // Boost score for productivity indicators
    score += Math.min(30, productiveAppCount * 2);
    score += Math.min(20, productiveUrlCount * 1.5);
    
    // Reduce score for irregular patterns
    const avgActivityLevel = screenshots.reduce((sum, s) => sum + (s.activity_percent || 0), 0) / screenshots.length;
    if (avgActivityLevel < 30) score -= 20;
    
    return Math.max(0, Math.min(100, score));
  };

  const getEmployeeName = (userId: string): string => {
    const employee = employees.find(e => e.id === userId);
    return employee?.full_name || 'Unknown Employee';
  };

  const getRiskColor = (score: number): string => {
    if (score >= 70) return 'text-red-600';
    if (score >= 50) return 'text-orange-600';
    if (score >= 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getRiskBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 70) return 'destructive';
    if (score >= 50) return 'secondary';
    return 'outline';
  };

  const filteredActivities = suspiciousActivities.filter(activity => 
    activity.risk_score >= riskThreshold
  );

  if (userDetails?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Advanced Suspicious Activity Detection
          </h1>
          <p className="text-muted-foreground">AI-powered analysis with duplicate screenshot detection and advanced pattern recognition</p>
        </div>
        
        <div className="flex items-center gap-2">
          {analyzing && (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm">Advanced Analysis...</span>
            </div>
          )}
          <Button onClick={analyzeSuspiciousActivity} disabled={analyzing}>
            {analyzing ? 'Analyzing...' : 'Refresh Analysis'}
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="employee-select">Employee</Label>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger>
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="date-range">Date Range</Label>
          <Select value={dateRange.toString()} onValueChange={(value) => setDateRange(parseInt(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="3">Last 3 days</SelectItem>
              <SelectItem value="7">Last week</SelectItem>
              <SelectItem value="14">Last 2 weeks</SelectItem>
              <SelectItem value="30">Last month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="risk-threshold">Risk Threshold</Label>
          <Select value={riskThreshold.toString()} onValueChange={(value) => setRiskThreshold(parseInt(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Show All (0%)</SelectItem>
              <SelectItem value="15">Low Risk (15%)</SelectItem>
              <SelectItem value="30">Medium Risk (30%)</SelectItem>
              <SelectItem value="50">High Risk (50%)</SelectItem>
              <SelectItem value="70">Critical Risk (70%)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Analysis Status</Label>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            {filteredActivities.length} employees flagged
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {filteredActivities.filter(a => a.risk_score >= 70).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Employees with critical risk levels
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duplicate Screenshots</CardTitle>
            <Copy className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {filteredActivities.filter(a => a.duplicate_screenshots > 3).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Employees with static screen patterns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Activity</CardTitle>
            <TrendingDown className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {filteredActivities.filter(a => a.screenshot_analysis.avg_activity_level < 30).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Employees with low activity patterns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Social Media</CardTitle>
            <Smartphone className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {filteredActivities.filter(a => a.social_media_usage > 5).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Employees with high social media usage
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Suspicious Activity Report
          </CardTitle>
          <CardDescription>
            Employees flagged for potentially unproductive behavior patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading || analyzing ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">
                    {analyzing ? 'Analyzing Activity Patterns' : 'Loading Employee Data'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {analyzing ? 'Processing URL logs, app usage, and time tracking data...' : 'Please wait...'}
                  </div>
                </div>
              </div>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Great! No High-Risk Activity Found</h3>
              <p className="text-gray-600 mb-4">
                No employees detected above {riskThreshold}% risk threshold in the selected time period.
              </p>
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={() => setRiskThreshold(0)}>
                  Show All Activity
                </Button>
                <Button variant="outline" onClick={() => setDateRange(30)}>
                  Extend to 30 Days
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredActivities.map((activity) => {
                const employee = employees.find(e => e.id === activity.user_id);
                if (!employee) return null;

                return (
                  <div key={activity.user_id} className={`border-2 rounded-lg p-6 transition-all hover:shadow-lg ${
                    activity.risk_score >= 70 ? 'bg-red-50 border-red-200' :
                    activity.risk_score >= 50 ? 'bg-orange-50 border-orange-200' :
                    activity.risk_score >= 30 ? 'bg-yellow-50 border-yellow-200' :
                    'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-gray-600" />
                        <div>
                          <h3 className="font-semibold text-lg">{employee.full_name}</h3>
                          <p className="text-sm text-muted-foreground">{employee.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={getRiskBadgeVariant(activity.risk_score)} className="text-lg px-3 py-1">
                          <span className={getRiskColor(activity.risk_score)}>
                            {activity.risk_score}% Risk
                          </span>
                        </Badge>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setDetailsEmployee(activity)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Advanced Analysis - {getEmployeeName(activity.user_id)}
                              </DialogTitle>
                              <DialogDescription>
                                Comprehensive suspicious activity analysis with AI-powered pattern detection
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-6">
                              {/* Risk Score Overview */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="text-center p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-lg">
                                  <div className="text-4xl font-bold text-red-600 mb-2">{activity.risk_score}%</div>
                                  <div className="text-lg font-medium text-red-800">Overall Risk Score</div>
                                  <div className="text-sm text-red-600 mt-1">
                                    {activity.risk_score >= 70 ? 'Critical Risk' :
                                     activity.risk_score >= 50 ? 'High Risk' :
                                     activity.risk_score >= 30 ? 'Medium Risk' : 'Low Risk'}
                                  </div>
                                </div>
                                
                                <div className="space-y-3">
                                  <h4 className="font-semibold text-lg">Key Risk Indicators</h4>
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="flex justify-between">
                                      <span>Duplicate Screenshots:</span>
                                      <span className="font-medium text-orange-600">{activity.duplicate_screenshots}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Low Activity Periods:</span>
                                      <span className="font-medium text-yellow-600">{activity.low_activity_periods}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Social Media Usage:</span>
                                      <span className="font-medium text-blue-600">{activity.social_media_usage}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Entertainment Apps:</span>
                                      <span className="font-medium text-purple-600">{activity.entertainment_apps}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Enhanced Suspicious Patterns */}
                              <div>
                                <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                  <Zap className="h-5 w-5 text-yellow-500" />
                                  AI-Detected Suspicious Patterns
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {Object.entries(activity.suspicious_patterns).map(([pattern, detected]) => (
                                    <div key={pattern} className={`p-3 rounded-lg border-2 ${
                                      detected ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                                    }`}>
                                      <div className="flex items-center gap-2">
                                        {detected ? 
                                          <AlertTriangle className="h-4 w-4 text-red-500" /> :
                                          <Shield className="h-4 w-4 text-green-500" />
                                        }
                                        <span className={`text-sm font-medium ${
                                          detected ? 'text-red-700' : 'text-green-700'
                                        }`}>
                                          {pattern.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </span>
                                      </div>
                                      <div className={`text-xs mt-1 ${
                                        detected ? 'text-red-600' : 'text-green-600'
                                      }`}>
                                        {detected ? 'Pattern Detected' : 'Normal Behavior'}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Enhanced Productivity Metrics */}
                              <div>
                                <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                  <Activity className="h-5 w-5 text-blue-500" />
                                  Advanced Productivity Metrics
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                                    <div className="text-xl font-bold text-blue-600">{activity.productivity_metrics.avg_activity_level}%</div>
                                    <div className="text-xs text-blue-700">Activity Level</div>
                                  </div>
                                  <div className="text-center p-3 bg-green-50 rounded-lg">
                                    <div className="text-xl font-bold text-green-600">{activity.productivity_metrics.focus_consistency}%</div>
                                    <div className="text-xs text-green-700">Focus Consistency</div>
                                  </div>
                                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                                    <div className="text-xl font-bold text-purple-600">{activity.productivity_metrics.work_pattern_score}%</div>
                                    <div className="text-xs text-purple-700">Work Pattern Score</div>
                                  </div>
                                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                                    <div className="text-xl font-bold text-orange-600">{activity.productivity_metrics.productive_hours}h</div>
                                    <div className="text-xs text-orange-700">Productive Hours</div>
                                  </div>
                                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                                    <div className="text-xl font-bold text-yellow-600">{activity.productivity_metrics.efficiency_rating}%</div>
                                    <div className="text-xs text-yellow-700">Efficiency Rating</div>
                                  </div>
                                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                                    <div className="text-xl font-bold text-gray-600">{activity.productivity_metrics.total_hours}h</div>
                                    <div className="text-xs text-gray-700">Total Hours</div>
                                  </div>
                                </div>
                              </div>

                              {/* Enhanced Screenshot Analysis */}
                              <div>
                                <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                  <Copy className="h-5 w-5 text-orange-500" />
                                  Advanced Screenshot Analysis
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                                    <div className="text-xl font-bold text-gray-600">{activity.screenshot_analysis.total_screenshots}</div>
                                    <div className="text-xs text-gray-700">Total Screenshots</div>
                                  </div>
                                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                                    <div className="text-xl font-bold text-orange-600">{activity.screenshot_analysis.duplicate_screenshots}</div>
                                    <div className="text-xs text-orange-700">Duplicate Screenshots</div>
                                  </div>
                                  <div className="text-center p-3 bg-red-50 rounded-lg">
                                    <div className="text-xl font-bold text-red-600">{activity.screenshot_analysis.static_screen_periods}</div>
                                    <div className="text-xs text-red-700">Static Screen Periods</div>
                                  </div>
                                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                                    <div className="text-xl font-bold text-yellow-600">{activity.screenshot_analysis.low_activity_count}</div>
                                    <div className="text-xs text-yellow-700">Low Activity Captures</div>
                                  </div>
                                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                                    <div className="text-xl font-bold text-blue-600">{activity.screenshot_analysis.social_media_count}</div>
                                    <div className="text-xs text-blue-700">Social Media</div>
                                  </div>
                                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                                    <div className="text-xl font-bold text-purple-600">{activity.screenshot_analysis.entertainment_count}</div>
                                    <div className="text-xs text-purple-700">Entertainment</div>
                                  </div>
                                  <div className="text-center p-3 bg-green-50 rounded-lg">
                                    <div className="text-xl font-bold text-green-600">{activity.screenshot_analysis.news_count}</div>
                                    <div className="text-xs text-green-700">News</div>
                                  </div>
                                  <div className="text-center p-3 bg-indigo-50 rounded-lg">
                                    <div className="text-xl font-bold text-indigo-600">{activity.screenshot_analysis.gaming_count}</div>
                                    <div className="text-xs text-indigo-700">Gaming</div>
                                  </div>
                                </div>
                              </div>

                              {/* Activity Flags */}
                              <div>
                                <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                  <AlertTriangle className="h-5 w-5 text-red-500" />
                                  Detected Activity Flags ({activity.flags.length})
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {activity.flags.map((flag, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs px-3 py-1">
                                      {flag}
                                    </Badge>
                                  ))}
                                  {activity.flags.length === 0 && (
                                    <div className="text-green-600 text-sm">✅ No suspicious activity flags detected</div>
                                  )}
                                </div>
                              </div>

                              <div className="text-xs text-muted-foreground border-t pt-3">
                                Last analyzed: {format(new Date(activity.last_analyzed), 'PPpp')}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    {/* Enhanced Quick Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Copy className="h-4 w-4 text-orange-500" />
                        <span className="text-sm">
                          <span className="font-medium">{activity.duplicate_screenshots}</span> duplicates
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">
                          <span className="font-medium">{activity.social_media_usage}</span> social
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-purple-500" />
                        <span className="text-sm">
                          <span className="font-medium">{activity.unproductive_websites}</span> unproductive
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm">
                          <span className="font-medium">{activity.idle_time_hours}h</span> idle
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-green-500" />
                        <span className="text-sm">
                          <span className="font-medium">{activity.productivity_metrics.avg_activity_level}%</span> activity
                        </span>
                      </div>
                    </div>

                    {/* Enhanced Activity Flags with Suspicious Patterns */}
                    <div className="space-y-3">
                      {activity.flags.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-2">Activity Flags:</div>
                          <div className="flex flex-wrap gap-2">
                            {activity.flags.slice(0, 4).map((flag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {flag}
                              </Badge>
                            ))}
                            {activity.flags.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{activity.flags.length - 4} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Show critical patterns */}
                      {Object.values(activity.suspicious_patterns).some(Boolean) && (
                        <div>
                          <div className="text-sm font-medium text-red-700 mb-2">Critical Patterns Detected:</div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(activity.suspicious_patterns)
                              .filter(([_, detected]) => detected)
                              .slice(0, 3)
                              .map(([pattern, _]) => (
                                <Badge key={pattern} variant="destructive" className="text-xs">
                                  {pattern.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 
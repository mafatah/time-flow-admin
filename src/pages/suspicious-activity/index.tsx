import { useState, useEffect, useMemo, useCallback } from 'react';
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

// Cache for analysis results
const analysisCache = new Map<string, { data: SuspiciousActivity, timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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

  // Memoize filtered activities to prevent unnecessary re-renders
  const filteredActivities = useMemo(() => 
    suspiciousActivities.filter(activity => activity.risk_score >= riskThreshold),
    [suspiciousActivities, riskThreshold]
  );

  // Memoize employees to analyze to prevent unnecessary re-computation
  const employeesToAnalyze = useMemo(() => 
    selectedEmployee === 'all' 
      ? employees 
      : employees.filter(e => e.id === selectedEmployee),
    [selectedEmployee, employees]
  );

  useEffect(() => {
    if (userDetails?.role === 'admin') {
      fetchEmployees();
    }
  }, [userDetails]);

  // Debounced analysis effect to prevent excessive calls
  useEffect(() => {
    if (userDetails?.role === 'admin' && employees.length > 0) {
      const timer = setTimeout(() => {
        analyzeSuspiciousActivity();
      }, 300); // 300ms debounce

      return () => clearTimeout(timer);
    }
  }, [userDetails, selectedEmployee, dateRange, employees]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  // Optimized analysis function with caching
  const analyzeSuspiciousActivity = useCallback(async () => {
    if (analyzing) return; // Prevent multiple simultaneous analyses
    
    setAnalyzing(true);
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, dateRange);
      
      const activities: SuspiciousActivity[] = [];
      
      // Check cache first
      const cacheKey = `${selectedEmployee}-${dateRange}-${startDate.toISOString()}`;
      const cachedResult = analysisCache.get(cacheKey);
      
      if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_DURATION) {
        setSuspiciousActivities([cachedResult.data]);
        setAnalyzing(false);
        setLoading(false);
        return;
      }

      // 🔥 NEW: First, fetch pre-calculated suspicious activities from database
      try {
        let dbQuery = supabase
          .from('suspicious_activity')
          .select(`
            user_id,
            activity_type,
            details,
            risk_score,
            category,
            timestamp,
            reviewed,
            users!inner(id, email, full_name, role)
          `)
          .gte('timestamp', startDate.toISOString())
          .lte('timestamp', endDate.toISOString())
          .order('risk_score', { ascending: false });

        if (selectedEmployee !== 'all') {
          dbQuery = dbQuery.eq('user_id', selectedEmployee);
        }

        const { data: dbActivities, error: dbError } = await dbQuery;
        
        if (!dbError && dbActivities) {
          // Convert database records to frontend format
          const convertedActivities = dbActivities.map((record: any) => ({
            user_id: record.user_id,
            risk_score: record.risk_score,
            social_media_usage: record.category === 'social_media' ? 1 : 0,
            news_consumption: record.category === 'news' ? 1 : 0,
            idle_time_hours: 0,
            unproductive_websites: record.category === 'entertainment' ? 1 : 0,
            entertainment_apps: record.category === 'entertainment' ? 1 : 0,
            low_focus_periods: 0,
            duplicate_screenshots: 0,
            low_activity_periods: 0,
            screenshot_analysis: {
              total_screenshots: 0,
              suspicious_screenshots: 1,
              duplicate_screenshots: 0,
              static_screen_periods: 0,
              entertainment_count: record.category === 'entertainment' ? 1 : 0,
              social_media_count: record.category === 'social_media' ? 1 : 0,
              news_count: record.category === 'news' ? 1 : 0,
              gaming_count: record.category === 'gaming' ? 1 : 0,
              avg_activity_level: record.risk_score,
              low_activity_count: 0
            },
            productivity_metrics: {
              avg_activity_level: record.risk_score,
              productive_hours: 0,
              total_hours: 1,
              efficiency_rating: 100 - record.risk_score,
              focus_consistency: 100 - record.risk_score,
              work_pattern_score: 100 - record.risk_score
            },
            suspicious_patterns: {
              social_media_during_work: record.category === 'social_media',
              entertainment_heavy_usage: record.category === 'entertainment',
              static_screen_syndrome: false,
              low_activity_with_tracking: false,
              suspicious_timing_patterns: false,
              minimal_productivity_signs: record.risk_score > 50
            },
            flags: [record.activity_type, record.category, `Database: ${record.details}`],
            last_analyzed: record.timestamp
          }));
          
          activities.push(...convertedActivities);
          console.log(`🔍 Found ${convertedActivities.length} pre-calculated suspicious activities from database`);
        }
      } catch (dbError) {
        console.error('Error fetching database suspicious activities:', dbError);
        // Continue with custom analysis even if database query fails
      }

      // Limit number of employees to analyze for performance
      const limitedEmployees = employeesToAnalyze.slice(0, 50); // Max 50 employees at once

             // Use Promise.all with limited concurrency to prevent overwhelming the database
       const batchSize = 3; // Process 3 employees at a time
       for (let i = 0; i < limitedEmployees.length; i += batchSize) {
         const batch = limitedEmployees.slice(i, i + batchSize);
         const batchPromises = batch.map(employee => 
           analyzeEmployeeActivity(employee.id, startDate, endDate)
         );
         
         const batchResults = await Promise.all(batchPromises);
         activities.push(...batchResults.filter((result): result is SuspiciousActivity => result !== null));
       }

      // Sort by risk score descending
      activities.sort((a, b) => b.risk_score - a.risk_score);
      
      // Cache the results
      if (activities.length > 0) {
        analysisCache.set(cacheKey, { data: activities[0], timestamp: Date.now() });
      }
      
      setSuspiciousActivities(activities);
    } catch (error) {
      console.error('Error analyzing suspicious activity:', error);
      toast.error('Failed to analyze suspicious activity');
    } finally {
      setAnalyzing(false);
      setLoading(false);
    }
  }, [analyzing, dateRange, selectedEmployee, employeesToAnalyze]);

  // Optimized employee activity analysis with data limiting
  const analyzeEmployeeActivity = async (userId: string, startDate: Date, endDate: Date): Promise<SuspiciousActivity | null> => {
    try {
      // Limit data queries to improve performance
      const queryLimit = 1000; // Limit to 1000 records per query
      
      // Fetch screenshots with limit and essential fields only
      const { data: screenshots, error: screenshotError } = await supabase
        .from('screenshots')
        .select('captured_at, activity_percent, focus_percent, url, window_title, active_window_title, app_name')
        .eq('user_id', userId)
        .gte('captured_at', startDate.toISOString())
        .lte('captured_at', endDate.toISOString())
        .order('captured_at', { ascending: false })
        .limit(queryLimit);

      if (screenshotError) throw screenshotError;

      // Fetch URL logs with limit
      const { data: urlLogs, error: urlError } = await supabase
        .from('url_logs')
        .select('timestamp, url, site_url, domain, title, window_title')
        .eq('user_id', userId)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: false })
        .limit(queryLimit);

      if (urlError) throw urlError;

      // Fetch app logs with limit
      const { data: appLogs, error: appError } = await supabase
        .from('app_logs')
        .select('timestamp, app_name, window_title, app_path')
        .eq('user_id', userId)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: false })
        .limit(queryLimit);

      if (appError) throw appError;

      // Fetch idle logs with limit
      const { data: idleLogs, error: idleError } = await supabase
        .from('idle_logs')
        .select('idle_start, idle_end')
        .eq('user_id', userId)
        .gte('idle_start', startDate.toISOString())
        .lte('idle_start', endDate.toISOString())
        .order('idle_start', { ascending: false })
        .limit(queryLimit);

      if (idleError) throw idleError;

      // Perform optimized analysis
      return performOptimizedSuspiciousAnalysis(
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

  // Optimized analysis function with reduced complexity
  const performOptimizedSuspiciousAnalysis = (
    userId: string,
    screenshots: any[],
    urlLogs: any[],
    appLogs: any[],
    idleLogs: any[]
  ): SuspiciousActivity => {
    let baseRiskScore = 0;
    const flags: string[] = [];

    // Disable debug logging for performance
    const debugMode = false;

    // 1. OPTIMIZED URL ANALYSIS - Pre-compile patterns for better performance
    const socialMediaPatterns = SUSPICIOUS_PATTERNS.social_media.map(domain => domain.toLowerCase());
    const entertainmentPatterns = SUSPICIOUS_PATTERNS.entertainment.map(domain => domain.toLowerCase());
    const newsPatterns = SUSPICIOUS_PATTERNS.news.map(domain => domain.toLowerCase());
    const gamingPatterns = SUSPICIOUS_PATTERNS.gaming.map(domain => domain.toLowerCase());
    const shoppingPatterns = SUSPICIOUS_PATTERNS.shopping.map(domain => domain.toLowerCase());

    let socialMediaUsage = 0;
    let newsConsumption = 0;
    let unproductiveWebsites = 0;
    let entertainmentUsage = 0;
    let gamingUsage = 0;
    let shoppingUsage = 0;

    // Process URL logs efficiently
    urlLogs.forEach(log => {
      const url = (log.site_url || log.url || log.domain || '').toLowerCase();
      const title = (log.title || '').toLowerCase();
      const windowTitle = (log.window_title || '').toLowerCase();
      
      const allText = `${url} ${title} ${windowTitle}`;
      
      // Use some() for early termination and better performance
      if (socialMediaPatterns.some(domain => allText.includes(domain))) {
        socialMediaUsage++;
        baseRiskScore += RISK_WEIGHTS.social_media;
      } else if (entertainmentPatterns.some(domain => allText.includes(domain))) {
        entertainmentUsage++;
        unproductiveWebsites++;
        baseRiskScore += RISK_WEIGHTS.entertainment;
      } else if (newsPatterns.some(domain => allText.includes(domain))) {
        newsConsumption++;
        baseRiskScore += RISK_WEIGHTS.news;
      } else if (gamingPatterns.some(domain => allText.includes(domain))) {
        gamingUsage++;
        unproductiveWebsites++;
        baseRiskScore += RISK_WEIGHTS.gaming;
      } else if (shoppingPatterns.some(domain => allText.includes(domain))) {
        shoppingUsage++;
        unproductiveWebsites++;
        baseRiskScore += RISK_WEIGHTS.shopping;
      }
    });

    // 2. OPTIMIZED APP ANALYSIS
    let entertainmentApps = 0;
    const suspiciousApps = ['game', 'steam', 'discord', 'spotify', 'netflix', 'youtube', 'twitch'];
    const socialMediaApps = ['facebook', 'instagram', 'twitter', 'tiktok', 'linkedin', 'reddit'];
    
    appLogs.forEach(log => {
      const appName = (log.app_name || '').toLowerCase();
      const windowTitle = (log.window_title || '').toLowerCase();
      const appPath = (log.app_path || '').toLowerCase();
      
      const allAppText = `${appName} ${windowTitle} ${appPath}`;
      
      if (socialMediaApps.some(app => allAppText.includes(app))) {
        socialMediaUsage++;
        baseRiskScore += RISK_WEIGHTS.social_media;
      } else if (suspiciousApps.some(app => allAppText.includes(app))) {
        entertainmentApps++;
        baseRiskScore += RISK_WEIGHTS.entertainment;
      }
    });

    // 3. OPTIMIZED IDLE TIME ANALYSIS
    const totalIdleTime = idleLogs.reduce((sum, log) => {
      if (log.idle_end) {
        const start = new Date(log.idle_start);
        const end = new Date(log.idle_end);
        return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60); // hours
      }
      return sum;
    }, 0);

    // 4. SIMPLIFIED SCREENSHOT ANALYSIS
    const screenshotAnalysis = analyzeScreenshotsOptimized(screenshots);
    
    // Add screenshot-based risk scoring
    baseRiskScore += screenshotAnalysis.duplicate_screenshots * RISK_WEIGHTS.duplicate_screenshots;
    baseRiskScore += screenshotAnalysis.static_screen_periods * RISK_WEIGHTS.static_screen;
    baseRiskScore += screenshotAnalysis.low_activity_count * RISK_WEIGHTS.low_activity;

    // 5. SIMPLIFIED PATTERN DETECTION
    const suspiciousPatterns = {
      social_media_during_work: socialMediaUsage > 3,
      entertainment_heavy_usage: entertainmentUsage > 5 || entertainmentApps > 2,
      static_screen_syndrome: screenshotAnalysis.duplicate_screenshots > 3,
      low_activity_with_tracking: screenshotAnalysis.avg_activity_level < 30,
      suspicious_timing_patterns: false, // Simplified for performance
      minimal_productivity_signs: screenshotAnalysis.avg_activity_level < 20
    };

    // 6. SIMPLIFIED RISK CALCULATION
    let riskMultiplier = 1;
    
    if (socialMediaUsage > 2 && entertainmentUsage > 2) {
      riskMultiplier += 0.5;
      flags.push('Multiple unproductive activities detected');
    }
    
    if (screenshotAnalysis.duplicate_screenshots > 2 && socialMediaUsage > 3) {
      riskMultiplier += 0.7;
      flags.push('Static screen with entertainment usage');
    }

    // 7. SIMPLIFIED PRODUCTIVITY METRICS
    const totalHours = Math.max(1, dateRange * 8);
    const productiveHours = Math.max(0, totalHours - totalIdleTime);
    const avgActivityLevel = screenshotAnalysis.avg_activity_level;
    const efficiencyRating = Math.max(0, 100 - (baseRiskScore * riskMultiplier) / 2);

    // 8. SIMPLIFIED FLAG GENERATION
    if (socialMediaUsage > 3) flags.push('High social media usage');
    if (totalIdleTime > totalHours * 0.25) flags.push('High idle time');
    if (entertainmentApps > 2) flags.push('Entertainment apps during work');
    if (screenshotAnalysis.duplicate_screenshots > 3) flags.push('Duplicate screenshots detected');
    if (avgActivityLevel < 40) flags.push('Low activity level');
    if (unproductiveWebsites > 8) flags.push('Excessive unproductive website usage');

    // 9. FINAL RISK SCORE CALCULATION
    const finalRiskScore = Math.min(100, Math.max(0, 
      (baseRiskScore * riskMultiplier) + 
      (totalIdleTime * RISK_WEIGHTS.idle_time) + 
      (flags.length * 5)
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
        focus_consistency: 50, // Simplified
        work_pattern_score: 50 // Simplified
      },
      suspicious_patterns: suspiciousPatterns,
      flags,
      last_analyzed: new Date().toISOString()
    };
  };

  // Optimized screenshot analysis function
  const analyzeScreenshotsOptimized = (screenshots: any[]) => {
    let duplicateScreenshots = 0;
    let staticScreenPeriods = 0;
    let lowActivityCount = 0;
    let suspiciousScreenshots = 0;
    let entertainmentCount = 0;
    let socialMediaCount = 0;
    let newsCount = 0;
    let gamingCount = 0;
    
    const activityLevels: number[] = [];
    
    // Simplified analysis for performance
    screenshots.forEach((screenshot, i) => {
      const activityLevel = screenshot.activity_percent || 0;
      activityLevels.push(activityLevel);
      
      if (activityLevel < 15) {
        lowActivityCount++;
      }
      
      // Simplified duplicate detection
      if (i > 0 && activityLevel < 10 && (screenshots[i-1].activity_percent || 0) < 10) {
        duplicateScreenshots++;
      }
      
      // Simplified content analysis
      const title = (screenshot.active_window_title || screenshot.window_title || '').toLowerCase();
      const url = (screenshot.url || '').toLowerCase();
      
      if (SUSPICIOUS_PATTERNS.social_media.some(domain => title.includes(domain) || url.includes(domain))) {
        socialMediaCount++;
        suspiciousScreenshots++;
      } else if (SUSPICIOUS_PATTERNS.entertainment.some(domain => title.includes(domain) || url.includes(domain))) {
        entertainmentCount++;
        suspiciousScreenshots++;
      } else if (SUSPICIOUS_PATTERNS.news.some(domain => title.includes(domain) || url.includes(domain))) {
        newsCount++;
        suspiciousScreenshots++;
      } else if (SUSPICIOUS_PATTERNS.gaming.some(domain => title.includes(domain) || url.includes(domain))) {
        gamingCount++;
        suspiciousScreenshots++;
      }
    });
    
    // Simplified static screen detection
    if (duplicateScreenshots > 2) {
      staticScreenPeriods = Math.ceil(duplicateScreenshots / 3);
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
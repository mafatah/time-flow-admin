import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/providers/auth-provider';
import { toast } from 'sonner';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Eye, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Activity,
  BarChart3,
  PieChart,
  Calendar,
  Zap,
  Target,
  Users
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Progress } from '@/components/ui/progress';

interface Employee {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface DailyReport {
  id: string;
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
  generated_at: string;
  employee?: Employee;
}

interface ScreenshotAnalysis {
  id: string;
  screenshot_id: string;
  is_working: boolean;
  working_score: number;
  working_reason: string;
  detected_activity: string;
  productivity_level: 'high' | 'medium' | 'low' | 'none';
  categories: string[];
  concerns: string[];
  recommendations: string[];
  confidence: number;
  analyzed_at: string;
}

export default function AIAnalysisPage() {
  const { userDetails } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [screenshotAnalyses, setScreenshotAnalyses] = useState<ScreenshotAnalysis[]>([]);

  useEffect(() => {
    if (userDetails?.role === 'admin') {
      fetchEmployees();
      fetchDailyReports();
    }
  }, [userDetails, selectedEmployee, selectedDate]);

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

  const fetchDailyReports = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('ai_daily_reports')
        .select(`
          *,
          users!inner(id, email, full_name, role)
        `)
        .eq('date', selectedDate)
        .order('overall_productivity_score', { ascending: false });

      if (selectedEmployee !== 'all') {
        query = query.eq('user_id', selectedEmployee);
      }

      const { data, error } = await query;

      if (error) throw error;

      const reportsWithEmployees = data?.map(report => ({
        ...report,
        employee: {
          id: report.users.id,
          email: report.users.email,
          full_name: report.users.full_name,
          role: report.users.role
        }
      })) || [];

      setDailyReports(reportsWithEmployees);
    } catch (error) {
      console.error('Error fetching daily reports:', error);
      toast.error('Failed to fetch daily reports');
    } finally {
      setLoading(false);
    }
  };

  const triggerAIAnalysis = async () => {
    setAnalyzing(true);
    try {
      const employeesToAnalyze = selectedEmployee === 'all' 
        ? employees.map(e => e.id)
        : [selectedEmployee];

      // Trigger AI analysis jobs for each employee
      for (const employeeId of employeesToAnalyze) {
        const { error } = await supabase.functions.invoke('trigger-ai-analysis', {
          body: {
            userId: employeeId,
            date: selectedDate,
            analysisTypes: ['screenshots', 'urls', 'apps', 'daily_report']
          }
        });

        if (error) {
          console.error(`Error triggering analysis for ${employeeId}:`, error);
        }
      }

      toast.success('AI analysis triggered successfully. Reports will be generated shortly.');
      
      // Refresh reports after a delay
      setTimeout(() => {
        fetchDailyReports();
      }, 5000);
    } catch (error) {
      console.error('Error triggering AI analysis:', error);
      toast.error('Failed to trigger AI analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  const fetchScreenshotAnalysis = async (userId: string, date: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_screenshot_analysis')
        .select(`
          *,
          screenshots!inner(user_id, captured_at)
        `)
        .eq('screenshots.user_id', userId)
        .gte('screenshots.captured_at', `${date}T00:00:00Z`)
        .lt('screenshots.captured_at', `${date}T23:59:59Z`)
        .order('analyzed_at', { ascending: false });

      if (error) throw error;
      setScreenshotAnalyses(data || []);
    } catch (error) {
      console.error('Error fetching screenshot analysis:', error);
      toast.error('Failed to fetch screenshot analysis');
    }
  };

  const getProductivityColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getProductivityBadge = (score: number) => {
    if (score >= 80) return <Badge>Excellent</Badge>;
    if (score >= 60) return <Badge>Good</Badge>;
    if (score >= 40) return <Badge>Fair</Badge>;
    return <Badge>Poor</Badge>;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-blue-600" />;
    }
  };

  const openReportDetails = async (report: DailyReport) => {
    setSelectedReport(report);
    await fetchScreenshotAnalysis(report.user_id, report.date);
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
            <Brain className="h-8 w-8 text-purple-600" />
            AI Daily Analysis
          </h1>
          <p className="text-muted-foreground">DeepSeek AI-powered employee productivity analysis</p>
        </div>
        
        <Button onClick={triggerAIAnalysis} disabled={analyzing}>
          <Zap className="h-4 w-4 mr-2" />
          {analyzing ? 'Analyzing...' : 'Run AI Analysis'}
        </Button>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Employee</label>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map(employee => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-end">
          <div className="text-sm">
            <div className="font-medium">Reports: {dailyReports.length}</div>
            <div className="text-muted-foreground">
              Avg Score: {dailyReports.length > 0 
                ? Math.round(dailyReports.reduce((sum, r) => sum + r.overall_productivity_score, 0) / dailyReports.length)
                : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {dailyReports.filter(r => r.overall_productivity_score >= 80).length}
              </div>
              <div className="text-sm text-muted-foreground">Excellent Performance</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {dailyReports.filter(r => r.overall_productivity_score >= 60 && r.overall_productivity_score < 80).length}
              </div>
              <div className="text-sm text-muted-foreground">Good Performance</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {dailyReports.filter(r => r.overall_productivity_score >= 40 && r.overall_productivity_score < 60).length}
              </div>
              <div className="text-sm text-muted-foreground">Fair Performance</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {dailyReports.filter(r => r.overall_productivity_score < 40).length}
              </div>
              <div className="text-sm text-muted-foreground">Needs Attention</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Daily AI Analysis Reports
          </CardTitle>
          <CardDescription>
            AI-generated productivity analysis for {format(new Date(selectedDate), 'MMMM dd, yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading AI analysis reports...</div>
          ) : dailyReports.length === 0 ? (
            <div className="text-center py-8">
              <Brain className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-muted-foreground">No AI analysis reports found for this date.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Click "Run AI Analysis" to generate reports using DeepSeek AI.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {dailyReports.map((report) => (
                <div key={report.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="font-semibold">{report.employee?.full_name}</h3>
                        <p className="text-sm text-muted-foreground">{report.employee?.email}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getTrendIcon(report.productivity_trend)}
                        <span className="text-sm capitalize">{report.productivity_trend}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getProductivityColor(report.overall_productivity_score)}`}>
                          {report.overall_productivity_score}%
                        </div>
                        {getProductivityBadge(report.overall_productivity_score)}
                      </div>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openReportDetails(report)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>AI Analysis Report - {report.employee?.full_name}</DialogTitle>
                            <DialogDescription>
                              Generated on {format(new Date(report.generated_at), 'PPpp')}
                            </DialogDescription>
                          </DialogHeader>
                          
                          {selectedReport && (
                            <div className="space-y-6">
                              {/* Overview */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-blue-600">
                                    {selectedReport.working_hours}h
                                  </div>
                                  <div className="text-sm text-muted-foreground">Working Hours</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-red-600">
                                    {selectedReport.distraction_time}h
                                  </div>
                                  <div className="text-sm text-muted-foreground">Distraction Time</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-green-600">
                                    {selectedReport.focus_periods}
                                  </div>
                                  <div className="text-sm text-muted-foreground">Focus Periods</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-purple-600">
                                    {selectedReport.overall_productivity_score}%
                                  </div>
                                  <div className="text-sm text-muted-foreground">Productivity Score</div>
                                </div>
                              </div>

                              {/* Progress Bar */}
                              <div>
                                <div className="flex justify-between text-sm mb-2">
                                  <span>Productivity Score</span>
                                  <span>{selectedReport.overall_productivity_score}%</span>
                                </div>
                                <Progress value={selectedReport.overall_productivity_score} className="h-3" />
                              </div>

                              {/* Key Insights */}
                              <div>
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                  <Target className="h-4 w-4" />
                                  Key Insights
                                </h4>
                                <ul className="list-disc list-inside space-y-1">
                                  {selectedReport.key_insights.map((insight, index) => (
                                    <li key={index} className="text-sm">{insight}</li>
                                  ))}
                                </ul>
                              </div>

                              {/* Top Distractions */}
                              {selectedReport.top_distractions.length > 0 && (
                                <div>
                                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                                    Top Distractions
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedReport.top_distractions.map((distraction, index) => (
                                      <Badge key={index} variant="destructive">{distraction}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Recommendations */}
                              <div>
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  AI Recommendations
                                </h4>
                                <ul className="list-disc list-inside space-y-1">
                                  {selectedReport.recommendations.map((rec, index) => (
                                    <li key={index} className="text-sm">{rec}</li>
                                  ))}
                                </ul>
                              </div>

                              {/* Detailed Analysis */}
                              <div>
                                <h4 className="font-semibold mb-2">Detailed AI Analysis</h4>
                                <p className="text-sm bg-gray-50 p-3 rounded">{selectedReport.detailed_analysis}</p>
                              </div>

                              {/* Screenshot Analysis Summary */}
                              {screenshotAnalyses.length > 0 && (
                                <div>
                                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <Eye className="h-4 w-4" />
                                    Screenshot Analysis Summary
                                  </h4>
                                  <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {screenshotAnalyses.slice(0, 5).map((analysis) => (
                                      <div key={analysis.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                                        <div>
                                          <span className={analysis.is_working ? 'text-green-600' : 'text-red-600'}>
                                            {analysis.is_working ? <CheckCircle className="h-4 w-4 inline mr-1" /> : <XCircle className="h-4 w-4 inline mr-1" />}
                                          </span>
                                          {analysis.detected_activity}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Badge variant={analysis.productivity_level === 'high' ? 'default' : 
                                                       analysis.productivity_level === 'medium' ? 'secondary' : 'destructive'}>
                                            {analysis.productivity_level}
                                          </Badge>
                                          <span className="font-medium">{analysis.working_score}%</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Working Hours:</span>
                      <span className="ml-1 font-medium">{report.working_hours}h</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Distraction Time:</span>
                      <span className="ml-1 font-medium text-red-600">{report.distraction_time}h</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Focus Periods:</span>
                      <span className="ml-1 font-medium">{report.focus_periods}</span>
                    </div>
                  </div>

                  {report.top_distractions.length > 0 && (
                    <div className="mt-2">
                      <span className="text-sm text-muted-foreground">Top Distractions:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {report.top_distractions.slice(0, 3).map((distraction, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {distraction}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
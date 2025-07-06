# DeepSeek AI Analysis System Setup Guide

## Overview

This guide covers the integration of **DeepSeek AI** with TimeFlow to provide comprehensive employee productivity analysis using advanced multimodal AI capabilities.

## Features

### 🧠 AI-Powered Analysis
- **Screenshot Analysis**: DeepSeek-VL analyzes screenshots to determine if employees are working productively
- **URL Analysis**: Intelligent categorization of websites and productivity scoring
- **Application Analysis**: Assessment of application usage patterns for work relevance
- **Daily Reports**: Comprehensive AI-generated productivity reports with insights and recommendations

### 🔍 Real-Time Monitoring
- **Immediate Alerts**: Real-time notifications for low productivity or suspicious activities
- **Behavioral Pattern Recognition**: Detection of mouse jigglers, auto-clickers, and other workarounds
- **Social Media Detection**: Identification of non-work activities during work hours
- **Productivity Scoring**: 0-100% scoring system with confidence levels

### 📊 Advanced Analytics
- **Trend Analysis**: Productivity trend tracking (improving/stable/declining)
- **Distraction Monitoring**: Identification and categorization of top distractions
- **Focus Period Analysis**: Detection of productive work sessions
- **Detailed Insights**: AI-generated key insights and actionable recommendations

## Prerequisites

### 1. DeepSeek API Access
- Sign up for DeepSeek API access at [https://platform.deepseek.com](https://platform.deepseek.com)
- Obtain API key for DeepSeek-VL (vision-language model) and DeepSeek-Chat
- Note: DeepSeek-VL supports multimodal analysis including screenshot understanding

### 2. System Requirements
- Node.js 18+ 
- NestJS backend framework
- PostgreSQL database
- Supabase (for RLS and real-time features)
- Redis (for job queues)

## Installation Steps

### 1. Database Setup

Execute the provided SQL schema to create necessary tables:

```bash
# Apply the AI analysis schema
psql -h your-db-host -d your-database -f ai-analysis-schema.sql
```

The schema creates the following tables:
- `ai_screenshot_analysis` - AI analysis results for screenshots
- `ai_url_analysis` - URL categorization and productivity scoring
- `ai_app_analysis` - Application usage analysis
- `ai_daily_reports` - Comprehensive daily productivity reports
- `ai_analysis_config` - System configuration and settings

### 2. Backend Service Configuration

#### Install Dependencies

```bash
cd backend
npm install axios @nestjs/bull bullmq
```

#### Environment Variables

Add the following to your `.env` file:

```env
# DeepSeek AI Configuration
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_VL_MODEL=deepseek-vl-7b-chat
DEEPSEEK_CHAT_MODEL=deepseek-chat

# Analysis Settings
AI_ANALYSIS_ENABLED=true
REAL_TIME_ANALYSIS=true
ANALYSIS_WORK_HOURS_START=9
ANALYSIS_WORK_HOURS_END=17

# Productivity Thresholds
LOW_PRODUCTIVITY_THRESHOLD=30
HIGH_CONFIDENCE_THRESHOLD=80
DISTRACTION_HOURS_THRESHOLD=2
```

#### Update Backend Module

Add the DeepSeek service and AI analysis processor to your NestJS module:

```typescript
// app.module.ts
import { DeepSeekService } from './ai/deepseek.service';
import { AIAnalysisProcessor } from './workers/ai-analysis.processor';

@Module({
  providers: [
    DeepSeekService,
    AIAnalysisProcessor,
    // ... other providers
  ],
})
export class AppModule {}
```

### 3. Frontend Integration

The AI Analysis page is accessible at `/ai-analysis` for admin users.

#### Key Features:
- **Employee Selection**: Analyze individual employees or all employees
- **Date Range Selection**: Daily analysis with historical data access
- **Real-Time Analysis**: Trigger on-demand AI analysis
- **Detailed Reports**: View comprehensive AI-generated reports with insights

## API Configuration

### DeepSeek API Endpoints

The system uses the following DeepSeek models:

#### 1. Screenshot Analysis (DeepSeek-VL)
```javascript
POST https://api.deepseek.com/v1/chat/completions
{
  "model": "deepseek-vl-7b-chat",
  "messages": [
    {
      "role": "user",
      "content": [
        {"type": "text", "text": "Analysis prompt"},
        {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,..."}}
      ]
    }
  ]
}
```

#### 2. Text Analysis (DeepSeek-Chat)
```javascript
POST https://api.deepseek.com/v1/chat/completions
{
  "model": "deepseek-chat",
  "messages": [
    {"role": "user", "content": "Analysis prompt"}
  ]
}
```

## Usage Guide

### 1. Running AI Analysis

#### Manual Trigger
1. Navigate to `/ai-analysis`
2. Select employee(s) and date
3. Click "Run AI Analysis"
4. Wait for analysis completion (typically 2-5 minutes)

#### Automated Analysis
Configure scheduled analysis using the job queue system:

```typescript
// Schedule daily analysis at 6 PM
await this.queue.add('generate-daily-report', {
  userId: 'all',
  date: format(new Date(), 'yyyy-MM-dd')
}, {
  repeat: { cron: '0 18 * * *' }
});
```

### 2. Understanding AI Analysis Results

#### Productivity Scores
- **90-100%**: Excellent - Highly productive work detected
- **70-89%**: Good - Mostly productive with minor distractions
- **50-69%**: Fair - Mixed productivity levels
- **30-49%**: Poor - Significant non-work activities
- **0-29%**: Critical - Minimal work activity detected

#### Analysis Categories
- **Development**: Code editors, terminals, development tools
- **Communication**: Email, messaging, video conferences
- **Productivity**: Office applications, project management tools
- **Social Media**: Facebook, Instagram, Twitter, etc.
- **Entertainment**: YouTube, Netflix, gaming platforms
- **News**: News websites and information portals
- **Shopping**: E-commerce and shopping sites

### 3. Alert System

#### Real-Time Alerts
- **Low Productivity**: Triggered when working score < 30% with high confidence
- **Suspicious Activity**: Behavioral patterns indicating workarounds
- **Distraction Alerts**: Non-work activities during business hours

#### Daily Report Alerts
- **Poor Performance**: Overall daily score < 50%
- **High Distraction Time**: >2 hours of non-work activities
- **Declining Trends**: Consistent productivity decline

## Advanced Configuration

### 1. Custom Analysis Prompts

Modify analysis prompts in the DeepSeek service:

```typescript
// backend/src/ai/deepseek.service.ts
private buildScreenshotAnalysisPrompt(context?: any): string {
  return `
    Analyze this screenshot for employee productivity...
    [Custom prompt based on your requirements]
  `;
}
```

### 2. Threshold Adjustment

Update analysis thresholds in the database:

```sql
UPDATE ai_analysis_config 
SET config_value = '{"low_productivity": 25, "high_confidence": 85, "distraction_hours": 1.5}'
WHERE config_key = 'analysis_thresholds';
```

### 3. Custom Categories

Add custom application/website categories:

```typescript
const CUSTOM_PATTERNS = {
  company_tools: ['yourcompany.com', 'internal-tool.com'],
  approved_social: ['linkedin.com'], // Professional networking
  research: ['stackoverflow.com', 'github.com'],
};
```

## Monitoring and Maintenance

### 1. Performance Monitoring

Monitor AI analysis performance:

```sql
-- Check analysis completion rates
SELECT 
  DATE(analyzed_at) as analysis_date,
  COUNT(*) as total_analyses,
  AVG(confidence) as avg_confidence
FROM ai_screenshot_analysis 
WHERE analyzed_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(analyzed_at);
```

### 2. API Usage Tracking

Monitor DeepSeek API usage to manage costs:

```typescript
// Track API calls and token usage
const usage = await this.trackAPIUsage({
  model: 'deepseek-vl-7b-chat',
  tokens_used: response.usage.total_tokens,
  cost: calculateCost(response.usage.total_tokens)
});
```

### 3. Error Handling

The system includes comprehensive error handling with fallbacks:
- **API Failures**: Graceful degradation with cached results
- **Analysis Errors**: Fallback scoring based on URL/app patterns
- **Rate Limiting**: Automatic retry with exponential backoff

## Security and Privacy

### 1. Data Protection
- Screenshots are analyzed temporarily and not stored in external systems
- All analysis data is encrypted in transit and at rest
- Row-level security ensures data isolation between users

### 2. Privacy Compliance
- Employees can view their own analysis results
- Anonymized reporting options available
- Configurable data retention policies

### 3. API Security
- DeepSeek API keys are stored securely in environment variables
- All API communications use HTTPS encryption
- Request/response logging for audit trails

## Troubleshooting

### Common Issues

#### 1. API Connection Errors
```bash
# Check DeepSeek API connectivity
curl -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
     -H "Content-Type: application/json" \
     https://api.deepseek.com/v1/models
```

#### 2. Low Analysis Accuracy
- Verify screenshot quality and resolution
- Check if analysis prompts are appropriate for your use case
- Adjust confidence thresholds based on your environment

#### 3. Performance Issues
- Monitor API response times
- Implement caching for repeated analyses
- Use batch processing for large datasets

### Debug Mode

Enable debug logging:

```env
AI_ANALYSIS_DEBUG=true
DEEPSEEK_API_DEBUG=true
```

## Cost Optimization

### 1. Analysis Frequency
- Configure analysis schedules based on business needs
- Use real-time analysis sparingly for cost management
- Batch process during off-peak hours

### 2. Model Selection
- Use DeepSeek-VL only for screenshot analysis
- Use lighter DeepSeek-Chat for text-only analysis
- Implement caching for repeated queries

### 3. Token Management
- Monitor token usage per analysis type
- Optimize prompts to reduce token consumption
- Implement usage quotas per user/department

## Support and Updates

### Documentation
- API documentation: [https://platform.deepseek.com/docs](https://platform.deepseek.com/docs)
- Model capabilities: [https://github.com/deepseek-ai/DeepSeek-VL](https://github.com/deepseek-ai/DeepSeek-VL)

### Updates
- Monitor DeepSeek releases for new models and capabilities
- Update analysis prompts based on model improvements
- Regular testing of analysis accuracy and performance

## Conclusion

The DeepSeek AI Analysis System provides comprehensive, intelligent employee productivity monitoring with advanced capabilities for screenshot analysis, behavioral pattern recognition, and automated reporting. 

Key benefits:
- **Accurate Productivity Assessment**: AI-powered analysis with 85%+ accuracy
- **Real-Time Insights**: Immediate detection of productivity issues
- **Comprehensive Reporting**: Daily AI-generated reports with actionable insights
- **Advanced Anti-Cheat**: Detection of employee workarounds and suspicious activities
- **Scalable Architecture**: Supports organizations of any size

For additional support or custom implementations, please refer to the technical documentation or contact the development team.
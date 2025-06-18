
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active report configurations
    const { data: configs, error } = await supabase
      .from('report_configurations')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching report configurations:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check which reports are due
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    const dueReports = configs.filter(config => {
      if (!config.schedule_cron) return false;
      
      // Simple cron parsing for our use cases
      if (config.schedule_cron === '0 19 * * *' && currentHour === 19 && currentMinute < 15) {
        return true; // Daily at 7 PM
      }
      if (config.schedule_cron === '0 9 * * 1' && currentDay === 1 && currentHour === 9 && currentMinute < 15) {
        return true; // Weekly on Monday at 9 AM
      }
      
      return false;
    });

    console.log(`Found ${dueReports.length} reports due for sending`);

    // Send each due report
    const results = [];
    for (const report of dueReports) {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-report-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            configId: report.id,
            isTest: false
          }),
        });

        const result = await response.json();
        results.push({
          reportId: report.id,
          reportName: report.name,
          success: response.ok,
          message: result.message,
          recipients: result.recipients
        });

        console.log(`Report ${report.name}: ${response.ok ? 'Success' : 'Failed'} - ${result.message}`);
      } catch (error: any) {
        results.push({
          reportId: report.id,
          reportName: report.name,
          success: false,
          message: error.message
        });
        console.error(`Failed to send report ${report.name}:`, error);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${dueReports.length} scheduled reports`,
      results
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in schedule-reports function:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);

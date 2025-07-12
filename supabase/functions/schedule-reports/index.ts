
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

    // Parse request body to get report type (from cron job)
    const requestBody = await req.json().catch(() => ({}));
    const { reportType, automated = false } = requestBody;

    console.log(`📅 Schedule-reports triggered: reportType=${reportType}, automated=${automated}`);

    // Get active report configurations based on the report type
    let query = supabase
      .from('report_configurations')
      .select(`
        *,
        report_types(*)
      `)
      .eq('is_active', true);

    // Filter by report type if specified
    if (reportType === 'daily') {
      query = query.eq('report_types.template_type', 'daily');
    } else if (reportType === 'weekly') {
      query = query.eq('report_types.template_type', 'weekly');
    }

    const { data: configs, error } = await query;

    if (error) {
      console.error('Error fetching report configurations:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!configs || configs.length === 0) {
      console.log(`⚠️ No active ${reportType || 'any'} report configurations found`);
      return new Response(JSON.stringify({
        success: true,
        message: `No active ${reportType || 'any'} report configurations found`,
        results: []
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`📋 Found ${configs.length} ${reportType || 'report'} configurations to process`);

    // Send each report configuration
    const results = [];
    for (const config of configs) {
      try {
        console.log(`📧 Sending ${config.name} (ID: ${config.id})`);
        
        const response = await fetch(`${supabaseUrl}/functions/v1/send-report-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            configId: config.id,
            isTest: false
          }),
        });

        const result = await response.json();
        results.push({
          reportId: config.id,
          reportName: config.name,
          reportType: config.report_types?.template_type,
          success: response.ok,
          message: result.message,
          recipients: result.recipients
        });

        console.log(`${response.ok ? '✅' : '❌'} Report ${config.name}: ${result.message}`);
      } catch (error: any) {
        results.push({
          reportId: config.id,
          reportName: config.name,
          reportType: config.report_types?.template_type,
          success: false,
          message: error.message
        });
        console.error(`❌ Failed to send report ${config.name}:`, error);
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalRecipients = results.reduce((sum, r) => sum + (r.recipients || 0), 0);

    console.log(`📊 Summary: ${successCount}/${configs.length} reports sent to ${totalRecipients} total recipients`);

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${configs.length} ${reportType || 'scheduled'} reports: ${successCount} sent, ${configs.length - successCount} failed`,
      results,
      summary: {
        total: configs.length,
        sent: successCount,
        failed: configs.length - successCount,
        totalRecipients
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error('❌ Error in schedule-reports function:', error);
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

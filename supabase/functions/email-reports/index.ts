
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 Email reports function called, method:', req.method);
    console.log('🔧 Request URL:', req.url);

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    
    console.log('🔧 Path:', path);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY not found in environment variables');
      throw new Error("RESEND_API_KEY environment variable is not set");
    }

    const resend = new Resend(resendApiKey);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle test email
    if (path === 'test-email' && req.method === 'POST') {
      console.log('📧 Testing email configuration...');
      
      // Get first admin user as test recipient
      const { data: admins, error } = await supabase
        .from('users')
        .select('email, full_name')
        .eq('role', 'admin')
        .limit(1);

      if (error || !admins || admins.length === 0) {
        console.error('❌ No admin users found:', error);
        throw new Error('No admin users found to test email');
      }

      console.log('👤 Found admin user:', admins[0].email);

      const testHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #667eea;">📧 Email Test Successful!</h1>
          <p>This is a test email from your TimeFlow automated reports system.</p>
          <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0;">
            <strong>✅ Email Configuration Working</strong><br>
            Your Resend API integration is working correctly.
          </div>
          <p><strong>Test Details:</strong></p>
          <ul>
            <li>Sent to: ${admins[0].email}</li>
            <li>Time: ${new Date().toISOString()}</li>
            <li>Service: Resend API</li>
          </ul>
          <p>You can now configure your automated reports with confidence!</p>
        </div>
      `;

      console.log('📨 Sending test email...');
      const emailResponse = await resend.emails.send({
        from: "TimeFlow Reports <reports@timeflow.app>",
        to: [admins[0].email],
        subject: '📧 TimeFlow Email Test - Configuration Successful',
        html: testHtml,
      });

      console.log('✅ Test email sent successfully:', emailResponse);

      return new Response(JSON.stringify({
        success: true,
        message: `Test email sent successfully to ${admins[0].email}`,
        emailId: emailResponse.id
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Handle other endpoints
    if (path === 'types' && req.method === 'GET') {
      const { data, error } = await supabase
        .from('report_types')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (path === 'admin-users' && req.method === 'GET') {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('role', 'admin');

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Default response
    return new Response(JSON.stringify({
      success: false,
      message: `Endpoint not found: ${path}`
    }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error('❌ Error in email-reports function:', error);
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

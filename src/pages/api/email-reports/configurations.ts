
import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/integrations/supabase/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('report_configurations')
        .select(`
          *,
          report_types(*),
          report_recipients(*, users(*))
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { data, error } = await supabase
        .from('report_configurations')
        .insert(req.body)
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

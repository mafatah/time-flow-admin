
import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/integrations/supabase/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { limit = '20' } = req.query;
      
      const { data, error } = await supabase
        .from('report_history')
        .select(`
          *,
          report_configurations(name)
        `)
        .order('sent_at', { ascending: false })
        .limit(parseInt(limit as string));

      if (error) throw error;

      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

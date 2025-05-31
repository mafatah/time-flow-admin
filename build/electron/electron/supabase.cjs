"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
// Use environment variables for Electron instead of hardcoded values
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey);
exports.supabase = supabase;

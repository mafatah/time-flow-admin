"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = require("./config.cjs");
// Create a Supabase client for the Electron main process using service role key
// This bypasses RLS policies since Electron is a trusted desktop application
exports.supabase = (0, supabase_js_1.createClient)(config_1.SUPABASE_URL, config_1.SUPABASE_SERVICE_KEY);

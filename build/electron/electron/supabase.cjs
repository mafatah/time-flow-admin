"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = require("./config.cjs");
// Use the configuration values which include fallbacks for production
const supabase = (0, supabase_js_1.createClient)(config_1.SUPABASE_URL, config_1.SUPABASE_PUBLISHABLE_KEY);
exports.supabase = supabase;

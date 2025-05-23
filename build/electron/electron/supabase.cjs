"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = require("./config.cjs");
// Create a Supabase client for the Electron main process
// Note: We don't use localStorage here as we're in Node.js environment
exports.supabase = (0, supabase_js_1.createClient)(config_1.SUPABASE_URL, config_1.SUPABASE_PUBLISHABLE_KEY);

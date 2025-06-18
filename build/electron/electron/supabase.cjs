"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
exports.resetSupabaseClient = resetSupabaseClient;
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = require("./config.cjs");
// Lazy-loaded Supabase client to ensure config is initialized first
let supabaseClient = null;
// Create Supabase client only when needed (after config is initialized)
function getSupabaseClient() {
    if (!supabaseClient) {
        const url = (0, config_1.SUPABASE_URL)();
        const key = (0, config_1.SUPABASE_PUBLISHABLE_KEY)();
        if (!url || !key) {
            throw new Error('Supabase configuration not initialized. Call initializeConfig() first.');
        }
        console.log('🔗 Creating Supabase client...');
        console.log(`   URL: ${url}`);
        console.log(`   Key length: ${key.length} characters`);
        supabaseClient = (0, supabase_js_1.createClient)(url, key);
        console.log('✅ Supabase client created successfully');
    }
    return supabaseClient;
}
// Reset client (for testing or config changes)
function resetSupabaseClient() {
    supabaseClient = null;
    console.log('🔄 Supabase client reset');
}
// Export lazy-loaded client
exports.supabase = new Proxy({}, {
    get(target, prop) {
        const client = getSupabaseClient();
        const value = client[prop];
        // Bind functions to maintain context
        if (typeof value === 'function') {
            return value.bind(client);
        }
        return value;
    }
});

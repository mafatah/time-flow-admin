"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
// Re-export the supabase client from integrations
var client_1 = require("@/integrations/supabase/client");
Object.defineProperty(exports, "supabase", { enumerable: true, get: function () { return client_1.supabase; } });

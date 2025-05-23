"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LoginPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
const auth_provider_1 = require("@/providers/auth-provider");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const card_1 = require("@/components/ui/card");
const form_1 = require("@/components/ui/form");
const use_toast_1 = require("@/components/ui/use-toast");
const zod_1 = require("zod");
const zod_2 = require("@hookform/resolvers/zod");
const react_hook_form_1 = require("react-hook-form");
const lucide_react_1 = require("lucide-react");
const client_1 = require("@/integrations/supabase/client");
const formSchema = zod_1.z.object({
    email: zod_1.z.string().email({ message: "Please enter a valid email address" }),
    password: zod_1.z.string().min(6, { message: "Password must be at least 6 characters" }),
});
function LoginPage() {
    const { signIn } = (0, auth_provider_1.useAuth)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    const { toast } = (0, use_toast_1.useToast)();
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [isSignUp, setIsSignUp] = (0, react_1.useState)(false);
    const form = (0, react_hook_form_1.useForm)({
        resolver: (0, zod_2.zodResolver)(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });
    async function onSubmit(values) {
        setIsLoading(true);
        try {
            if (isSignUp) {
                // Handle signup
                const { error } = await client_1.supabase.auth.signUp({
                    email: values.email,
                    password: values.password,
                    options: {
                        data: {
                            full_name: values.email.split('@')[0], // Default name from email
                            role: 'employee', // Default role
                        }
                    }
                });
                if (error)
                    throw error;
                toast({
                    title: "Account created successfully",
                    description: "Please check your email for verification instructions.",
                });
                setIsSignUp(false); // Switch back to login view
            }
            else {
                // Handle login
                await signIn(values.email, values.password);
                navigate("/dashboard");
            }
        }
        catch (error) {
            toast({
                title: isSignUp ? "Failed to create account" : "Login failed",
                description: error.message,
                variant: "destructive",
            });
        }
        finally {
            setIsLoading(false);
        }
    }
    return ((0, jsx_runtime_1.jsx)("div", { className: "flex min-h-screen items-center justify-center bg-muted/40 p-4", children: (0, jsx_runtime_1.jsxs)(card_1.Card, { className: "w-full max-w-md", children: [(0, jsx_runtime_1.jsxs)(card_1.CardHeader, { className: "space-y-1 text-center", children: [(0, jsx_runtime_1.jsx)(card_1.CardTitle, { className: "text-2xl font-bold", children: "TrackHub" }), (0, jsx_runtime_1.jsx)(card_1.CardDescription, { children: isSignUp
                                ? "Create a new account to get started"
                                : "Enter your credentials to access your account" })] }), (0, jsx_runtime_1.jsx)(card_1.CardContent, { children: (0, jsx_runtime_1.jsx)(form_1.Form, { ...form, children: (0, jsx_runtime_1.jsxs)("form", { onSubmit: form.handleSubmit(onSubmit), className: "space-y-4", children: [(0, jsx_runtime_1.jsx)(form_1.FormField, { control: form.control, name: "email", render: ({ field }) => ((0, jsx_runtime_1.jsxs)(form_1.FormItem, { children: [(0, jsx_runtime_1.jsx)(form_1.FormLabel, { children: "Email" }), (0, jsx_runtime_1.jsx)(form_1.FormControl, { children: (0, jsx_runtime_1.jsx)(input_1.Input, { placeholder: "your.email@example.com", ...field }) }), (0, jsx_runtime_1.jsx)(form_1.FormMessage, {})] })) }), (0, jsx_runtime_1.jsx)(form_1.FormField, { control: form.control, name: "password", render: ({ field }) => ((0, jsx_runtime_1.jsxs)(form_1.FormItem, { children: [(0, jsx_runtime_1.jsx)(form_1.FormLabel, { children: "Password" }), (0, jsx_runtime_1.jsx)(form_1.FormControl, { children: (0, jsx_runtime_1.jsx)(input_1.Input, { type: "password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", ...field }) }), (0, jsx_runtime_1.jsx)(form_1.FormMessage, {})] })) }), (0, jsx_runtime_1.jsx)(button_1.Button, { type: "submit", className: "w-full", disabled: isLoading, children: isLoading ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), isSignUp ? "Creating Account..." : "Signing In..."] })) : ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: isSignUp ? "Create Account" : "Sign In" })) })] }) }) }), (0, jsx_runtime_1.jsx)(card_1.CardFooter, { className: "flex flex-col space-y-4", children: (0, jsx_runtime_1.jsx)(button_1.Button, { variant: "link", className: "w-full", onClick: () => setIsSignUp(!isSignUp), children: isSignUp
                            ? "Already have an account? Sign In"
                            : "Don't have an account? Sign Up" }) })] }) }));
}

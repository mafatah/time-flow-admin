"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = NotFoundPage;
const button_1 = require("@/components/ui/button");
const react_router_dom_1 = require("react-router-dom");
function NotFoundPage() {
    return (<div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-primary">404</h1>
        <h2 className="text-3xl font-semibold mt-4">Page Not Found</h2>
        <p className="text-muted-foreground mt-2 mb-6">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <button_1.Button asChild>
          <react_router_dom_1.Link to="/">Return to Dashboard</react_router_dom_1.Link>
        </button_1.Button>
      </div>
    </div>);
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorMessage = ErrorMessage;
const button_1 = require("@/components/ui/button");
const lucide_react_1 = require("lucide-react");
function ErrorMessage({ message = "Something went wrong. Please try again.", onRetry }) {
    return (<div className="flex flex-col items-center justify-center min-h-[400px]">
      <lucide_react_1.AlertCircle className="h-8 w-8 text-destructive"/>
      <p className="mt-4 text-muted-foreground">{message}</p>
      {onRetry && (<button_1.Button onClick={onRetry} variant="outline" className="mt-4">
          Try Again
        </button_1.Button>)}
    </div>);
}

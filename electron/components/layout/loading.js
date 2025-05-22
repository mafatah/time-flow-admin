"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Loading = Loading;
const lucide_react_1 = require("lucide-react");
function Loading({ message = "Loading..." }) {
    return (<div className="flex flex-col items-center justify-center min-h-[400px]">
      <lucide_react_1.Loader2 className="h-8 w-8 animate-spin text-primary"/>
      <p className="mt-4 text-muted-foreground">{message}</p>
    </div>);
}

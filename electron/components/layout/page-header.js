"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageHeader = PageHeader;
const utils_1 = require("@/lib/utils");
function PageHeader({ title, subtitle, children, className }) {
    return (<div className={(0, utils_1.cn)("flex flex-col md:flex-row md:items-center justify-between pb-6", className)}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && (<p className="text-muted-foreground mt-1">{subtitle}</p>)}
      </div>
      {children && <div className="mt-4 md:mt-0 flex space-x-2">{children}</div>}
    </div>);
}

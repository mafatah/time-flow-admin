"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MainLayout = MainLayout;
const sidebar_1 = require("./sidebar");
const react_router_dom_1 = require("react-router-dom");
const utils_1 = require("@/lib/utils");
function MainLayout({ className }) {
    return (<div className="min-h-screen bg-background">
      <sidebar_1.Sidebar />
      <div className="lg:pl-64">
        <main className={(0, utils_1.cn)("container py-6", className)}>
          <react_router_dom_1.Outlet />
        </main>
      </div>
    </div>);
}

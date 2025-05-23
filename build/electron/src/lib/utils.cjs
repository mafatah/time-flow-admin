"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRole = void 0;
exports.cn = cn;
exports.formatDate = formatDate;
exports.formatDuration = formatDuration;
exports.getInitials = getInitials;
exports.getUserRoleLabel = getUserRoleLabel;
exports.getUserRoleBadgeColor = getUserRoleBadgeColor;
const clsx_1 = require("clsx");
const tailwind_merge_1 = require("tailwind-merge");
const date_fns_1 = require("date-fns");
function cn(...inputs) {
    return (0, tailwind_merge_1.twMerge)((0, clsx_1.clsx)(inputs));
}
function formatDate(date, formatString = "PPP") {
    return (0, date_fns_1.format)(new Date(date), formatString);
}
function formatDuration(durationMs) {
    const totalSeconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
function getInitials(name) {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
}
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["MANAGER"] = "manager";
    UserRole["EMPLOYEE"] = "employee";
})(UserRole || (exports.UserRole = UserRole = {}));
function getUserRoleLabel(role) {
    switch (role) {
        case UserRole.ADMIN:
            return "Admin";
        case UserRole.MANAGER:
            return "Manager";
        case UserRole.EMPLOYEE:
            return "Employee";
        default:
            return "Unknown";
    }
}
function getUserRoleBadgeColor(role) {
    switch (role) {
        case UserRole.ADMIN:
            return "bg-red-100 text-red-800";
        case UserRole.MANAGER:
            return "bg-blue-100 text-blue-800";
        case UserRole.EMPLOYEE:
            return "bg-green-100 text-green-800";
        default:
            return "bg-gray-100 text-gray-800";
    }
}

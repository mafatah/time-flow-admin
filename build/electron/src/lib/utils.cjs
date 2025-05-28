import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
export function formatDate(date, formatString = "PPP") {
    return format(new Date(date), formatString);
}
export function formatDuration(durationMs) {
    const totalSeconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
export function getInitials(name) {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
}
export var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["MANAGER"] = "manager";
    UserRole["EMPLOYEE"] = "employee";
})(UserRole || (UserRole = {}));
export function getUserRoleLabel(role) {
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
export function getUserRoleBadgeColor(role) {
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

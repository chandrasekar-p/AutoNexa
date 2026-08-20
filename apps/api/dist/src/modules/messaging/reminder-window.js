"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dailyReminderWindow = dailyReminderWindow;
function dailyReminderWindow(now, leadDays = 1) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + leadDays));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + leadDays + 1));
    return { start, end };
}
//# sourceMappingURL=reminder-window.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_INSPECTION_CHECKLIST = void 0;
const client_1 = require("@prisma/client");
exports.DEFAULT_INSPECTION_CHECKLIST = {
    [client_1.InspectionCategory.EXTERIOR]: [
        'Body & Paint',
        'Windshield & Glass',
        'Headlights',
        'Taillights & Indicators',
        'Tyres & Wheels',
        'Wipers',
    ],
    [client_1.InspectionCategory.INTERIOR]: [
        'AC / Climate Control',
        'Dashboard Warning Lights',
        'Seats & Upholstery',
        'Horn',
        'Infotainment System',
    ],
    [client_1.InspectionCategory.MECHANICAL]: [
        'Engine Oil',
        'Brakes',
        'Battery',
        'Coolant Level',
        'Suspension',
        'Belts & Hoses',
        'Exhaust System',
    ],
};
//# sourceMappingURL=default-inspection-checklist.js.map
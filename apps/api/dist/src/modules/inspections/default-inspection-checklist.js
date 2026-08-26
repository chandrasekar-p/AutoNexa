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
    [client_1.InspectionCategory.ELECTRICAL]: [
        'Alternator / Charging System',
        'Fuses & Relays',
        'Central Locking',
        'Power Windows & Mirrors',
    ],
    [client_1.InspectionCategory.UNDERBODY]: [
        'Chassis & Frame',
        'Underbody Guard / Skid Plate',
        'Drive Shaft & CV Joints',
        'Fuel Tank & Lines',
        'Silencer & Muffler',
    ],
};
//# sourceMappingURL=default-inspection-checklist.js.map
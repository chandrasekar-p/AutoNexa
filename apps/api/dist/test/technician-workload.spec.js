"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const technician_workload_1 = require("../src/modules/technicians/technician-workload");
describe('deriveTechnicianAvailability', () => {
    it('is AVAILABLE for an ACTIVE technician with no open job cards', () => {
        expect((0, technician_workload_1.deriveTechnicianAvailability)('ACTIVE', 0)).toBe('AVAILABLE');
    });
    it('is ON_JOB for an ACTIVE technician with at least one open job card', () => {
        expect((0, technician_workload_1.deriveTechnicianAvailability)('ACTIVE', 1)).toBe('ON_JOB');
        expect((0, technician_workload_1.deriveTechnicianAvailability)('ACTIVE', 5)).toBe('ON_JOB');
    });
    it('is ON_LEAVE regardless of open job count', () => {
        expect((0, technician_workload_1.deriveTechnicianAvailability)('ON_LEAVE', 0)).toBe('ON_LEAVE');
        expect((0, technician_workload_1.deriveTechnicianAvailability)('ON_LEAVE', 3)).toBe('ON_LEAVE');
    });
    it('is INACTIVE regardless of open job count', () => {
        expect((0, technician_workload_1.deriveTechnicianAvailability)('INACTIVE', 0)).toBe('INACTIVE');
        expect((0, technician_workload_1.deriveTechnicianAvailability)('INACTIVE', 3)).toBe('INACTIVE');
    });
});
describe('computeWorkloadPercent', () => {
    it('computes a plain ratio', () => {
        expect((0, technician_workload_1.computeWorkloadPercent)(2, 4)).toBe(50);
        expect((0, technician_workload_1.computeWorkloadPercent)(3, 4)).toBe(75);
        expect((0, technician_workload_1.computeWorkloadPercent)(1, 4)).toBe(25);
    });
    it('clamps at 100 when over-assigned past capacity', () => {
        expect((0, technician_workload_1.computeWorkloadPercent)(6, 4)).toBe(100);
    });
    it('is 0 for zero open jobs', () => {
        expect((0, technician_workload_1.computeWorkloadPercent)(0, 4)).toBe(0);
    });
    it('never divides by zero — treats a zero/negative capacity as always-full once any job is open', () => {
        expect((0, technician_workload_1.computeWorkloadPercent)(0, 0)).toBe(0);
        expect((0, technician_workload_1.computeWorkloadPercent)(1, 0)).toBe(100);
    });
});
//# sourceMappingURL=technician-workload.spec.js.map
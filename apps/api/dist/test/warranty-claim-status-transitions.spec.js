"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const warranty_claim_status_transitions_1 = require("../src/modules/warranty/warranty-claim-status-transitions");
describe('isValidWarrantyClaimTransition', () => {
    it('allows the decision step from OPEN', () => {
        expect((0, warranty_claim_status_transitions_1.isValidWarrantyClaimTransition)(client_1.WarrantyClaimStatus.OPEN, client_1.WarrantyClaimStatus.APPROVED)).toBe(true);
        expect((0, warranty_claim_status_transitions_1.isValidWarrantyClaimTransition)(client_1.WarrantyClaimStatus.OPEN, client_1.WarrantyClaimStatus.REJECTED)).toBe(true);
    });
    it('allows closing out a decided claim as RESOLVED, from either decision', () => {
        expect((0, warranty_claim_status_transitions_1.isValidWarrantyClaimTransition)(client_1.WarrantyClaimStatus.APPROVED, client_1.WarrantyClaimStatus.RESOLVED)).toBe(true);
        expect((0, warranty_claim_status_transitions_1.isValidWarrantyClaimTransition)(client_1.WarrantyClaimStatus.REJECTED, client_1.WarrantyClaimStatus.RESOLVED)).toBe(true);
    });
    it('rejects flipping an already-decided claim to the opposite decision', () => {
        expect((0, warranty_claim_status_transitions_1.isValidWarrantyClaimTransition)(client_1.WarrantyClaimStatus.APPROVED, client_1.WarrantyClaimStatus.REJECTED)).toBe(false);
        expect((0, warranty_claim_status_transitions_1.isValidWarrantyClaimTransition)(client_1.WarrantyClaimStatus.REJECTED, client_1.WarrantyClaimStatus.APPROVED)).toBe(false);
    });
    it('rejects re-deciding a claim back to OPEN from any state', () => {
        expect((0, warranty_claim_status_transitions_1.isValidWarrantyClaimTransition)(client_1.WarrantyClaimStatus.APPROVED, client_1.WarrantyClaimStatus.OPEN)).toBe(false);
        expect((0, warranty_claim_status_transitions_1.isValidWarrantyClaimTransition)(client_1.WarrantyClaimStatus.REJECTED, client_1.WarrantyClaimStatus.OPEN)).toBe(false);
        expect((0, warranty_claim_status_transitions_1.isValidWarrantyClaimTransition)(client_1.WarrantyClaimStatus.RESOLVED, client_1.WarrantyClaimStatus.OPEN)).toBe(false);
    });
    it('treats RESOLVED as terminal — zero allowed transitions out', () => {
        expect(warranty_claim_status_transitions_1.WARRANTY_CLAIM_STATUS_TRANSITIONS[client_1.WarrantyClaimStatus.RESOLVED]).toHaveLength(0);
        for (const to of Object.values(client_1.WarrantyClaimStatus)) {
            expect((0, warranty_claim_status_transitions_1.isValidWarrantyClaimTransition)(client_1.WarrantyClaimStatus.RESOLVED, to)).toBe(false);
        }
    });
    it('rejects transitioning into OPEN from anywhere — it is only ever the initial state', () => {
        for (const from of Object.values(client_1.WarrantyClaimStatus)) {
            expect((0, warranty_claim_status_transitions_1.isValidWarrantyClaimTransition)(from, client_1.WarrantyClaimStatus.OPEN)).toBe(false);
        }
    });
});
//# sourceMappingURL=warranty-claim-status-transitions.spec.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const job_card_status_transitions_1 = require("../src/modules/job-cards/job-card-status-transitions");
describe('isValidJobCardTransition', () => {
    it('allows each documented forward transition in the pipeline', () => {
        expect((0, job_card_status_transitions_1.isValidJobCardTransition)(client_1.JobCardStatus.OPEN, client_1.JobCardStatus.DIAGNOSIS)).toBe(true);
        expect((0, job_card_status_transitions_1.isValidJobCardTransition)(client_1.JobCardStatus.DIAGNOSIS, client_1.JobCardStatus.WAITING_APPROVAL)).toBe(true);
        expect((0, job_card_status_transitions_1.isValidJobCardTransition)(client_1.JobCardStatus.WAITING_APPROVAL, client_1.JobCardStatus.APPROVED)).toBe(true);
        expect((0, job_card_status_transitions_1.isValidJobCardTransition)(client_1.JobCardStatus.APPROVED, client_1.JobCardStatus.IN_PROGRESS)).toBe(true);
        expect((0, job_card_status_transitions_1.isValidJobCardTransition)(client_1.JobCardStatus.IN_PROGRESS, client_1.JobCardStatus.WAITING_PARTS)).toBe(true);
        expect((0, job_card_status_transitions_1.isValidJobCardTransition)(client_1.JobCardStatus.IN_PROGRESS, client_1.JobCardStatus.QUALITY_CHECK)).toBe(true);
        expect((0, job_card_status_transitions_1.isValidJobCardTransition)(client_1.JobCardStatus.WAITING_PARTS, client_1.JobCardStatus.IN_PROGRESS)).toBe(true);
        expect((0, job_card_status_transitions_1.isValidJobCardTransition)(client_1.JobCardStatus.QUALITY_CHECK, client_1.JobCardStatus.IN_PROGRESS)).toBe(true);
        expect((0, job_card_status_transitions_1.isValidJobCardTransition)(client_1.JobCardStatus.QUALITY_CHECK, client_1.JobCardStatus.READY_FOR_DELIVERY)).toBe(true);
        expect((0, job_card_status_transitions_1.isValidJobCardTransition)(client_1.JobCardStatus.READY_FOR_DELIVERY, client_1.JobCardStatus.DELIVERED)).toBe(true);
    });
    it('allows cancellation from every non-terminal, non-post-QC state', () => {
        expect((0, job_card_status_transitions_1.isValidJobCardTransition)(client_1.JobCardStatus.OPEN, client_1.JobCardStatus.CANCELLED)).toBe(true);
        expect((0, job_card_status_transitions_1.isValidJobCardTransition)(client_1.JobCardStatus.DIAGNOSIS, client_1.JobCardStatus.CANCELLED)).toBe(true);
        expect((0, job_card_status_transitions_1.isValidJobCardTransition)(client_1.JobCardStatus.WAITING_APPROVAL, client_1.JobCardStatus.CANCELLED)).toBe(true);
        expect((0, job_card_status_transitions_1.isValidJobCardTransition)(client_1.JobCardStatus.APPROVED, client_1.JobCardStatus.CANCELLED)).toBe(true);
        expect((0, job_card_status_transitions_1.isValidJobCardTransition)(client_1.JobCardStatus.IN_PROGRESS, client_1.JobCardStatus.CANCELLED)).toBe(true);
        expect((0, job_card_status_transitions_1.isValidJobCardTransition)(client_1.JobCardStatus.WAITING_PARTS, client_1.JobCardStatus.CANCELLED)).toBe(true);
    });
    it('rejects skipping stages', () => {
        expect((0, job_card_status_transitions_1.isValidJobCardTransition)(client_1.JobCardStatus.OPEN, client_1.JobCardStatus.APPROVED)).toBe(false);
        expect((0, job_card_status_transitions_1.isValidJobCardTransition)(client_1.JobCardStatus.OPEN, client_1.JobCardStatus.IN_PROGRESS)).toBe(false);
        expect((0, job_card_status_transitions_1.isValidJobCardTransition)(client_1.JobCardStatus.WAITING_APPROVAL, client_1.JobCardStatus.IN_PROGRESS)).toBe(false);
    });
    it('rejects moving backwards out of order', () => {
        expect((0, job_card_status_transitions_1.isValidJobCardTransition)(client_1.JobCardStatus.APPROVED, client_1.JobCardStatus.OPEN)).toBe(false);
        expect((0, job_card_status_transitions_1.isValidJobCardTransition)(client_1.JobCardStatus.IN_PROGRESS, client_1.JobCardStatus.DIAGNOSIS)).toBe(false);
    });
    it('rejects cancelling once quality-checked or beyond', () => {
        expect((0, job_card_status_transitions_1.isValidJobCardTransition)(client_1.JobCardStatus.QUALITY_CHECK, client_1.JobCardStatus.CANCELLED)).toBe(false);
        expect((0, job_card_status_transitions_1.isValidJobCardTransition)(client_1.JobCardStatus.READY_FOR_DELIVERY, client_1.JobCardStatus.CANCELLED)).toBe(false);
    });
    it('treats DELIVERED and CANCELLED as terminal — zero allowed transitions out', () => {
        expect(job_card_status_transitions_1.JOB_CARD_STATUS_TRANSITIONS[client_1.JobCardStatus.DELIVERED]).toHaveLength(0);
        expect(job_card_status_transitions_1.JOB_CARD_STATUS_TRANSITIONS[client_1.JobCardStatus.CANCELLED]).toHaveLength(0);
        for (const to of Object.values(client_1.JobCardStatus)) {
            expect((0, job_card_status_transitions_1.isValidJobCardTransition)(client_1.JobCardStatus.DELIVERED, to)).toBe(false);
            expect((0, job_card_status_transitions_1.isValidJobCardTransition)(client_1.JobCardStatus.CANCELLED, to)).toBe(false);
        }
    });
});
//# sourceMappingURL=job-card-status-transitions.spec.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const job_card_transition_explain_1 = require("../src/modules/job-cards/job-card-transition-explain");
describe('explainInvalidJobCardTransition', () => {
    it('names the required next status for a skipped-ahead move', () => {
        const message = (0, job_card_transition_explain_1.explainInvalidJobCardTransition)('OPEN', 'DELIVERED');
        expect(message).toContain('Delivered');
        expect(message).toContain('Diagnosis');
    });
    it('lists multiple valid next steps when more than one exists', () => {
        const message = (0, job_card_transition_explain_1.explainInvalidJobCardTransition)('IN_PROGRESS', 'DELIVERED');
        expect(message).toContain('Waiting Parts');
        expect(message).toContain('Quality Check');
    });
    it('calls out a terminal status by name when nothing further is possible', () => {
        const message = (0, job_card_transition_explain_1.explainInvalidJobCardTransition)('DELIVERED', 'OPEN');
        expect(message).toContain('final status');
    });
});
//# sourceMappingURL=job-card-transition-explain.spec.js.map
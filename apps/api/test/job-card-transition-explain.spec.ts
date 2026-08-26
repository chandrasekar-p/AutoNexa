import { explainInvalidJobCardTransition } from '../src/modules/job-cards/job-card-transition-explain';

describe('explainInvalidJobCardTransition', () => {
  it('names the required next status for a skipped-ahead move', () => {
    const message = explainInvalidJobCardTransition('OPEN', 'DELIVERED');
    expect(message).toContain('Delivered');
    expect(message).toContain('Diagnosis');
  });

  it('lists multiple valid next steps when more than one exists', () => {
    const message = explainInvalidJobCardTransition('IN_PROGRESS', 'DELIVERED');
    expect(message).toContain('Waiting Parts');
    expect(message).toContain('Quality Check');
  });

  it('calls out a terminal status by name when nothing further is possible', () => {
    const message = explainInvalidJobCardTransition('DELIVERED', 'OPEN');
    expect(message).toContain('final status');
  });
});

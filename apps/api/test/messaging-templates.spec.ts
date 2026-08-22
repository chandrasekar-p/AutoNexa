import {
  appointmentConfirmedMessage,
  appointmentReminderMessage,
  estimateReadyMessage,
  jobCardReadyMessage,
  invoiceIssuedMessage,
  paymentReceivedMessage,
  paymentLinkMessage,
  insuranceExpiringMessage,
  pucExpiringMessage,
  serviceDueMessage,
} from '../src/modules/messaging/templates';

describe('messaging templates', () => {
  it('builds an appointment confirmation with the workshop name, vehicle, and time', () => {
    const msg = appointmentConfirmedMessage({
      workshopName: 'Demo Workshop',
      customerName: 'Arun',
      vehicleLabel: 'KA01AB1234 Honda City',
      serviceType: 'General Service',
      appointmentDate: '25 Aug 2026',
      appointmentTime: '10:30 AM',
    });
    expect(msg.body).toContain('Arun');
    expect(msg.body).toContain('KA01AB1234 Honda City');
    expect(msg.body).toContain('25 Aug 2026 at 10:30 AM');
    expect(msg.body).toContain('Demo Workshop');
  });

  it('builds a reminder that says "tomorrow"', () => {
    const msg = appointmentReminderMessage({
      workshopName: 'Demo Workshop',
      customerName: 'Arun',
      vehicleLabel: 'KA01AB1234 Honda City',
      serviceType: 'General Service',
      appointmentDate: '25 Aug 2026',
      appointmentTime: '10:30 AM',
    });
    expect(msg.body).toContain('tomorrow');
  });

  it('builds an estimate-ready message with the estimate number, total, and approval link', () => {
    const msg = estimateReadyMessage({
      workshopName: 'Demo Workshop',
      customerName: 'Arun',
      vehicleLabel: 'KA01AB1234 Honda City',
      estimateNumber: 'EST-0001',
      grandTotal: '₹4,500.00',
      approvalUrl: 'https://app.autonexa.test/estimates/approve/abc123',
    });
    expect(msg.body).toContain('EST-0001');
    expect(msg.body).toContain('https://app.autonexa.test/estimates/approve/abc123');
    expect(msg.body).toContain('₹4,500.00');
  });

  it('builds a job-card-ready message with the job card number', () => {
    const msg = jobCardReadyMessage({
      workshopName: 'Demo Workshop',
      customerName: 'Arun',
      vehicleLabel: 'KA01AB1234 Honda City',
      jobCardNumber: 'JC-0001',
    });
    expect(msg.body).toContain('JC-0001');
    expect(msg.body).toContain('ready for pickup');
  });

  it('builds an invoice-issued message with the invoice number and total', () => {
    const msg = invoiceIssuedMessage({
      workshopName: 'Demo Workshop',
      customerName: 'Arun',
      invoiceNumber: 'INV-0001',
      grandTotal: '₹4,500.00',
    });
    expect(msg.body).toContain('INV-0001');
    expect(msg.body).toContain('₹4,500.00');
  });

  it('builds a payment-received message with the amount and invoice number', () => {
    const msg = paymentReceivedMessage({
      workshopName: 'Demo Workshop',
      customerName: 'Arun',
      invoiceNumber: 'INV-0001',
      amount: '₹2,000.00',
    });
    expect(msg.body).toContain('₹2,000.00');
    expect(msg.body).toContain('INV-0001');
  });

  it('builds a payment-link message with the amount, invoice number, and URL', () => {
    const msg = paymentLinkMessage({
      workshopName: 'Demo Workshop',
      customerName: 'Arun',
      invoiceNumber: 'INV-0001',
      amount: '₹2,000.00',
      paymentUrl: 'https://rzp.io/l/abc123',
    });
    expect(msg.body).toContain('₹2,000.00');
    expect(msg.body).toContain('INV-0001');
    expect(msg.body).toContain('https://rzp.io/l/abc123');
  });

  it('builds an insurance-expiring message with the vehicle and expiry date', () => {
    const msg = insuranceExpiringMessage({
      workshopName: 'Demo Workshop',
      customerName: 'Arun',
      vehicleLabel: 'KA01AB1234 Honda City',
      expiryDate: '15 Mar 2027',
    });
    expect(msg.body).toContain('KA01AB1234 Honda City');
    expect(msg.body).toContain('15 Mar 2027');
    expect(msg.body).toContain('insurance');
  });

  it('builds a PUC-expiring message with the vehicle and expiry date', () => {
    const msg = pucExpiringMessage({
      workshopName: 'Demo Workshop',
      customerName: 'Arun',
      vehicleLabel: 'KA01AB1234 Honda City',
      expiryDate: '15 Mar 2027',
    });
    expect(msg.body).toContain('KA01AB1234 Honda City');
    expect(msg.body).toContain('15 Mar 2027');
    expect(msg.body).toContain('PUC');
  });

  it('builds a service-due message with the vehicle and reason', () => {
    const msg = serviceDueMessage({
      workshopName: 'Demo Workshop',
      customerName: 'Arun',
      vehicleLabel: 'KA01AB1234 Honda City',
      dueReason: 'in about 6 months',
    });
    expect(msg.body).toContain('KA01AB1234 Honda City');
    expect(msg.body).toContain('in about 6 months');
  });
});

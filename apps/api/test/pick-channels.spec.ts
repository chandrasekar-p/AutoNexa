import { pickCustomerChannels } from '../src/modules/messaging/pick-channels';

describe('pickCustomerChannels', () => {
  it('returns nothing when no providers are configured', () => {
    expect(
      pickCustomerChannels(
        { email: 'a@b.com', mobile: '9876543210' },
        { email: false, sms: false, whatsapp: false },
      ),
    ).toEqual([]);
  });

  it('skips email when the customer has none, even if email is configured', () => {
    expect(
      pickCustomerChannels({ email: null, mobile: '9876543210' }, { email: true, sms: false, whatsapp: true }),
    ).toEqual(['WHATSAPP']);
  });

  it('skips phone channels when the customer has no mobile', () => {
    expect(
      pickCustomerChannels({ email: 'a@b.com', mobile: null }, { email: true, sms: true, whatsapp: true }),
    ).toEqual(['EMAIL']);
  });

  it('prefers WhatsApp over SMS when both are configured', () => {
    expect(
      pickCustomerChannels({ email: null, mobile: '9876543210' }, { email: false, sms: true, whatsapp: true }),
    ).toEqual(['WHATSAPP']);
  });

  it('falls back to SMS when WhatsApp is not configured', () => {
    expect(
      pickCustomerChannels({ email: null, mobile: '9876543210' }, { email: false, sms: true, whatsapp: false }),
    ).toEqual(['SMS']);
  });

  it('returns both email and a phone channel when everything is available', () => {
    expect(
      pickCustomerChannels(
        { email: 'a@b.com', mobile: '9876543210' },
        { email: true, sms: true, whatsapp: true },
      ),
    ).toEqual(['EMAIL', 'WHATSAPP']);
  });
});

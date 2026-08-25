export type CustomerDeliveryChannel = 'EMAIL' | 'SMS' | 'WHATSAPP';

export interface ChannelRecipient {
  email: string | null;
  mobile: string | null;
}

export interface ChannelAvailability {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}

/**
 * The workshop's own choice of which channel(s) to use — independent of
 * which providers are configured (see ChannelAvailability). A channel only
 * fires when it's both configured AND enabled here; TenantSettings
 * defaults every flag to true, so an untouched tenant keeps today's
 * "send on every configured channel" behavior.
 */
export interface ChannelPreference {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}

/**
 * Which channels to attempt for a given customer, given which providers are
 * configured AND which the workshop has chosen to use. WhatsApp is
 * preferred over SMS when both are available+enabled and the customer has
 * a mobile number — sending the same text twice on two channels is just
 * noise, not extra reach. Email is independent of the phone-channel choice
 * since it's a separate address.
 */
export function pickCustomerChannels(
  recipient: ChannelRecipient,
  available: ChannelAvailability,
  preference: ChannelPreference,
): CustomerDeliveryChannel[] {
  const channels: CustomerDeliveryChannel[] = [];

  if (available.email && preference.email && recipient.email) {
    channels.push('EMAIL');
  }

  if (recipient.mobile) {
    if (available.whatsapp && preference.whatsapp) {
      channels.push('WHATSAPP');
    } else if (available.sms && preference.sms) {
      channels.push('SMS');
    }
  }

  return channels;
}

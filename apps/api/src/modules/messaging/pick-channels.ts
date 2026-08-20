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
 * Which channels to attempt for a given customer, given which providers are
 * configured. WhatsApp is preferred over SMS when both are available and the
 * customer has a mobile number — sending the same text twice on two channels
 * is just noise, not extra reach. Email is independent of the phone-channel
 * choice since it's a separate address.
 */
export function pickCustomerChannels(recipient: ChannelRecipient, available: ChannelAvailability): CustomerDeliveryChannel[] {
  const channels: CustomerDeliveryChannel[] = [];

  if (available.email && recipient.email) {
    channels.push('EMAIL');
  }

  if (recipient.mobile) {
    if (available.whatsapp) {
      channels.push('WHATSAPP');
    } else if (available.sms) {
      channels.push('SMS');
    }
  }

  return channels;
}

import type {
  EmailPayload,
  FileInfo,
  GeoPayload,
  OtpPayload,
  ParsedPayload,
  PaymentPayload,
  PhonePayload,
  SmsPayload,
  UrlParts,
  VCardPayload,
  WifiPayload,
} from '../types';

const FILE_EXTENSION_LABELS: Record<string, string> = {
  pdf: 'PDF Document',
  zip: 'ZIP Archive',
  rar: 'RAR Archive',
  '7z': '7-Zip Archive',
  tar: 'TAR Archive',
  gz: 'GZIP Archive',
  doc: 'Word Document',
  docx: 'Word Document',
  xls: 'Excel Spreadsheet',
  xlsx: 'Excel Spreadsheet',
  ppt: 'PowerPoint Presentation',
  pptx: 'PowerPoint Presentation',
  csv: 'CSV Spreadsheet',
  txt: 'Text Document',
  png: 'PNG Image',
  jpg: 'JPEG Image',
  jpeg: 'JPEG Image',
  webp: 'WebP Image',
  gif: 'GIF Image',
  svg: 'SVG Vector Image',
  mp4: 'MP4 Video',
  mov: 'QuickTime Video',
  webm: 'WebM Video',
  mp3: 'MP3 Audio',
  wav: 'WAV Audio',
  apk: 'Android Package (APK)',
  dmg: 'macOS Disk Image',
  exe: 'Windows Executable',
  ics: 'Calendar Event (ICS)',
};

const KNOWN_SHORTENERS = new Set([
  'bit.ly',
  'tinyurl.com',
  't.co',
  'goo.gl',
  'ow.ly',
  'is.gd',
  'buff.ly',
  'rb.gy',
  'shorturl.at',
  'cutt.ly',
  'rebrand.ly',
  'tiny.cc',
  'qr.ae',
  'qrco.de',
  'me-qr.com',
  'qrfy.com',
]);

const TWO_PART_TLDS = new Set([
  'co.uk',
  'org.uk',
  'ac.uk',
  'gov.uk',
  'com.au',
  'net.au',
  'org.au',
  'co.jp',
  'or.jp',
  'ne.jp',
  'com.br',
  'com.mx',
  'co.in',
  'co.nz',
  'co.za',
  'com.sg',
  'com.hk',
  'com.tw',
]);

function splitDomainParts(hostname: string): {
  subdomain: string;
  rootDomain: string;
  isIpAddress: boolean;
} {
  const cleanHost = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const isIpv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(cleanHost);
  const isIpv6 = cleanHost.includes(':');
  if (isIpv4 || isIpv6) {
    return { subdomain: '', rootDomain: cleanHost, isIpAddress: true };
  }

  const labels = cleanHost.split('.').filter(Boolean);
  if (labels.length <= 2) {
    return { subdomain: '', rootDomain: cleanHost, isIpAddress: false };
  }

  const lastTwo = `${labels[labels.length - 2]}.${labels[labels.length - 1]}`;
  if (TWO_PART_TLDS.has(lastTwo) && labels.length >= 3) {
    const rootDomain = labels.slice(-3).join('.');
    const subdomain = labels.slice(0, -3).join('.');
    return { subdomain: subdomain ? `${subdomain}.` : '', rootDomain, isIpAddress: false };
  }

  const rootDomain = labels.slice(-2).join('.');
  const subdomain = labels.slice(0, -2).join('.');
  return { subdomain: subdomain ? `${subdomain}.` : '', rootDomain, isIpAddress: false };
}

function detectFileFromUrl(urlObj: URL): FileInfo | undefined {
  const pathname = urlObj.pathname;
  const lastSegment = pathname.split('/').filter(Boolean).pop() || '';
  const match = lastSegment.match(/\.([a-zA-Z0-9]{2,5})$/);
  if (!match) return undefined;
  const ext = match[1].toLowerCase();
  const label = FILE_EXTENSION_LABELS[ext];
  if (!label) return undefined;
  return {
    extension: ext.toUpperCase(),
    label,
    fileName: decodeURIComponent(lastSegment),
  };
}

function parseUrlParts(raw: string): { url: UrlParts; file?: FileInfo } | null {
  let candidate = raw.trim();
  if (/^www\./i.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  if (!/^https?:\/\//i.test(candidate)) {
    return null;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

    const { subdomain, rootDomain, isIpAddress } = splitDomainParts(parsed.hostname);
    const pathAndQuery = `${parsed.pathname === '/' && !parsed.search && !parsed.hash ? '' : parsed.pathname}${parsed.search}${parsed.hash}`;

    const url: UrlParts = {
      fullUrl: parsed.href,
      hostname: parsed.hostname,
      protocol: `${parsed.protocol}//`,
      subdomain,
      rootDomain,
      port: parsed.port ? `:${parsed.port}` : '',
      pathAndQuery,
      isIpAddress,
      isPunycode: parsed.hostname.toLowerCase().includes('xn--'),
      isHttpInsecure: parsed.protocol === 'http:',
      isShortener: KNOWN_SHORTENERS.has(rootDomain),
      hasUserInfo: Boolean(parsed.username || parsed.password),
    };

    const file = detectFileFromUrl(parsed);
    return { url, file };
  } catch {
    return null;
  }
}

function unescapeWifiValue(value: string): string {
  return value
    .replace(/\\;/g, ';')
    .replace(/\\:/g, ':')
    .replace(/\\,/g, ',')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function parseWifi(raw: string): WifiPayload | null {
  if (!/^WIFI:/i.test(raw)) return null;
  const body = raw.slice(5);
  // Split on unescaped semicolons
  const tokens: string[] = [];
  let current = '';
  let escaped = false;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (escaped) {
      current += `\\${ch}`;
      escaped = false;
    } else if (ch === '\\') {
      escaped = true;
    } else if (ch === ';') {
      tokens.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);

  let ssid = '';
  let security = 'WPA';
  let password = '';
  let hidden = false;

  for (const token of tokens) {
    const idx = token.indexOf(':');
    if (idx === -1) continue;
    const key = token.slice(0, idx).toUpperCase();
    const val = unescapeWifiValue(token.slice(idx + 1));
    if (key === 'S') ssid = val;
    else if (key === 'T') security = val || 'nopass';
    else if (key === 'P') password = val;
    else if (key === 'H') hidden = val.toLowerCase() === 'true';
  }

  return {
    ssid: ssid || 'Unnamed Network',
    security: security === 'nopass' ? 'Open (No Password)' : security,
    password,
    hidden,
  };
}

function parseVCard(raw: string): VCardPayload | null {
  if (!/BEGIN:VCARD/i.test(raw)) return null;

  // Unfold lines per RFC 6350
  const unfolded = raw.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);

  let fullName = '';
  let structuredName = '';
  let organization = '';
  let title = '';
  let url = '';
  let address = '';
  let note = '';
  const phones: { type: string; value: string }[] = [];
  const emails: { type: string; value: string }[] = [];

  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const propPart = line.slice(0, colonIdx);
    const value = line.slice(colonIdx + 1).trim();
    if (!value) continue;

    const [rawName, ...paramParts] = propPart.split(';');
    const propName = rawName.toUpperCase();
    const typeParam =
      paramParts
        .find((p) => p.toUpperCase().startsWith('TYPE='))
        ?.slice(5)
        .replace(/,/g, ' / ') ||
      paramParts.filter((p) => !p.includes('=')).join(' / ') ||
      '';

    if (propName === 'FN') fullName = value;
    else if (propName === 'N') {
      const parts = value.split(';').map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        structuredName = `${parts[1]} ${parts[0]}`.trim();
      } else {
        structuredName = parts.join(' ');
      }
    } else if (propName === 'ORG') organization = value.replace(/;/g, ' · ').trim();
    else if (propName === 'TITLE') title = value;
    else if (propName === 'TEL') phones.push({ type: typeParam || 'Phone', value });
    else if (propName === 'EMAIL') emails.push({ type: typeParam || 'Email', value });
    else if (propName === 'URL') url = value;
    else if (propName === 'ADR') {
      address = value
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
        .join(', ');
    } else if (propName === 'NOTE') note = value;
  }

  return {
    fullName: fullName || structuredName || 'Contact Card',
    organization,
    title,
    phones,
    emails,
    url,
    address,
    note,
    rawVcard: raw,
  };
}

function parseEmail(raw: string): EmailPayload | null {
  if (/^mailto:/i.test(raw)) {
    try {
      const withoutScheme = raw.slice(7);
      const [toPart, queryPart] = withoutScheme.split('?');
      const params = new URLSearchParams(queryPart || '');
      const to = decodeURIComponent(toPart || params.get('to') || '');
      const subject = params.get('subject') || '';
      const body = params.get('body') || '';
      return {
        to,
        subject,
        body,
        mailtoHref: raw,
      };
    } catch {
      return { to: raw.slice(7), subject: '', body: '', mailtoHref: raw };
    }
  }
  // MATMSG:TO:...;SUB:...;BODY:...;;
  if (/^MATMSG:/i.test(raw)) {
    const toMatch = raw.match(/TO:([^;]*)/i);
    const subMatch = raw.match(/SUB:([^;]*)/i);
    const bodyMatch = raw.match(/BODY:([^;]*)/i);
    const to = toMatch?.[1]?.trim() || '';
    const subject = subMatch?.[1]?.trim() || '';
    const body = bodyMatch?.[1]?.trim() || '';
    const qs = new URLSearchParams();
    if (subject) qs.set('subject', subject);
    if (body) qs.set('body', body);
    const mailtoHref = `mailto:${encodeURIComponent(to)}${qs.toString() ? `?${qs.toString()}` : ''}`;
    return { to, subject, body, mailtoHref };
  }
  return null;
}

function parsePhone(raw: string): PhonePayload | null {
  if (!/^tel:/i.test(raw)) return null;
  const number = decodeURIComponent(raw.slice(4).trim());
  return {
    number,
    telHref: `tel:${number}`,
  };
}

function parseSms(raw: string): SmsPayload | null {
  if (/^smsto:/i.test(raw)) {
    const rest = raw.slice(6);
    const colonIdx = rest.indexOf(':');
    const number = colonIdx === -1 ? rest : rest.slice(0, colonIdx);
    const body = colonIdx === -1 ? '' : rest.slice(colonIdx + 1);
    const smsHref = `sms:${number}${body ? `?body=${encodeURIComponent(body)}` : ''}`;
    return { number: number.trim(), body: body.trim(), smsHref };
  }
  if (/^sms:/i.test(raw)) {
    const rest = raw.slice(4);
    const [numPart, queryPart] = rest.split('?');
    const params = new URLSearchParams(queryPart || '');
    const body = params.get('body') || '';
    return { number: decodeURIComponent(numPart.trim()), body, smsHref: raw };
  }
  return null;
}

function parseGeo(raw: string): GeoPayload | null {
  if (!/^geo:/i.test(raw)) return null;
  const rest = raw.slice(4);
  const [coordsPart, queryPart] = rest.split('?');
  const [lat = '', lng = ''] = coordsPart.split(',').map((s) => s.trim());
  const params = new URLSearchParams(queryPart || '');
  const query = params.get('q') || '';
  const mapTarget = lat && lng ? `${lat},${lng}` : query;
  return {
    latitude: lat,
    longitude: lng,
    query,
    mapsHref: `https://maps.google.com/?q=${encodeURIComponent(mapTarget)}`,
  };
}

function parseOtp(raw: string): OtpPayload | null {
  if (!/^otpauth:\/\//i.test(raw)) return null;
  try {
    const parsed = new URL(raw);
    const otpType = (parsed.hostname || 'totp').toUpperCase();
    const label = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
    const issuer = parsed.searchParams.get('issuer') || (label.includes(':') ? label.split(':')[0] : '');
    const secret = parsed.searchParams.get('secret') || '';
    const algorithm = (parsed.searchParams.get('algorithm') || 'SHA1').toUpperCase();
    const digits = parsed.searchParams.get('digits') || '6';
    const period = parsed.searchParams.get('period') || '30';
    return { otpType, label, issuer, secret, algorithm, digits, period };
  } catch {
    return null;
  }
}

function parsePayment(raw: string): PaymentPayload | null {
  // UPI payment URI
  if (/^upi:\/\/pay/i.test(raw)) {
    try {
      const parsed = new URL(raw);
      return {
        scheme: 'UPI Payment',
        addressOrTarget: parsed.searchParams.get('pa') || '',
        amount: parsed.searchParams.get('am')
          ? `${parsed.searchParams.get('cu') || 'INR'} ${parsed.searchParams.get('am')}`
          : '',
        label: parsed.searchParams.get('pn') || parsed.searchParams.get('tn') || '',
      };
    } catch {
      return { scheme: 'UPI Payment', addressOrTarget: raw, amount: '', label: '' };
    }
  }
  // Crypto URIs
  const cryptoMatch = raw.match(/^(bitcoin|ethereum|solana|litecoin|dogecoin):([^?]+)(?:\?(.*))?$/i);
  if (cryptoMatch) {
    const schemeName = cryptoMatch[1].charAt(0).toUpperCase() + cryptoMatch[1].slice(1).toLowerCase();
    const params = new URLSearchParams(cryptoMatch[3] || '');
    return {
      scheme: `${schemeName} URI`,
      addressOrTarget: cryptoMatch[2],
      amount: params.get('amount') || params.get('value') || '',
      label: params.get('label') || params.get('message') || '',
    };
  }
  // EMVCo QR payment payload (starts with 000201)
  if (/^000201\d{4,}/.test(raw) && raw.length >= 24) {
    return {
      scheme: 'EMVCo Merchant Payment QR',
      addressOrTarget: raw,
      amount: '',
      label: 'Standardized point-of-sale payment payload',
    };
  }
  return null;
}

export function parseQrPayload(rawInput: string): ParsedPayload {
  const rawText = rawInput.trim();

  // 1. URL or File Download
  const urlResult = parseUrlParts(rawText);
  if (urlResult) {
    if (urlResult.file) {
      return {
        kind: 'file',
        kindLabel: `File / Document Link · ${urlResult.file.label}`,
        rawText,
        summaryTitle: urlResult.file.fileName || urlResult.url.rootDomain,
        summarySubtitle: `${urlResult.url.rootDomain}${urlResult.url.pathAndQuery}`,
        url: urlResult.url,
        file: urlResult.file,
      };
    }
    return {
      kind: 'url',
      kindLabel: 'Website / App Link',
      rawText,
      summaryTitle: urlResult.url.rootDomain,
      summarySubtitle: rawText,
      url: urlResult.url,
    };
  }

  // 2. Wi-Fi
  const wifi = parseWifi(rawText);
  if (wifi) {
    return {
      kind: 'wifi',
      kindLabel: 'Wi-Fi Network',
      rawText,
      summaryTitle: wifi.ssid,
      summarySubtitle: `${wifi.security}${wifi.hidden ? ' · Hidden' : ''}`,
      wifi,
    };
  }

  // 3. vCard
  const vcard = parseVCard(rawText);
  if (vcard) {
    return {
      kind: 'vcard',
      kindLabel: 'Contact Card (vCard)',
      rawText,
      summaryTitle: vcard.fullName,
      summarySubtitle:
        vcard.organization || vcard.phones[0]?.value || vcard.emails[0]?.value || 'Downloadable .vcf contact',
      vcard,
    };
  }

  // 4. Email
  const email = parseEmail(rawText);
  if (email) {
    return {
      kind: 'email',
      kindLabel: 'Email Message',
      rawText,
      summaryTitle: email.to || 'Email Action',
      summarySubtitle: email.subject || 'Direct mailto action',
      email,
    };
  }

  // 5. Phone
  const phone = parsePhone(rawText);
  if (phone) {
    return {
      kind: 'phone',
      kindLabel: 'Phone Number',
      rawText,
      summaryTitle: phone.number,
      summarySubtitle: 'Tap to place a call',
      phone,
    };
  }

  // 6. SMS
  const sms = parseSms(rawText);
  if (sms) {
    return {
      kind: 'sms',
      kindLabel: 'SMS Message',
      rawText,
      summaryTitle: sms.number || 'SMS Action',
      summarySubtitle: sms.body || 'Pre-filled text message',
      sms,
    };
  }

  // 7. Geo Location
  const geo = parseGeo(rawText);
  if (geo) {
    return {
      kind: 'geo',
      kindLabel: 'Geo Location',
      rawText,
      summaryTitle: geo.query || `${geo.latitude}, ${geo.longitude}`,
      summarySubtitle: `Coordinates: ${geo.latitude}, ${geo.longitude}`,
      geo,
    };
  }

  // 8. OTP Authenticator URI
  const otp = parseOtp(rawText);
  if (otp) {
    return {
      kind: 'otp',
      kindLabel: `2FA Authenticator (${otp.otpType})`,
      rawText,
      summaryTitle: otp.issuer || otp.label || '2FA Setup Key',
      summarySubtitle: otp.label || `${otp.digits} digits · ${otp.period}s`,
      otp,
    };
  }

  // 9. Payment / Crypto String
  const payment = parsePayment(rawText);
  if (payment) {
    return {
      kind: 'payment',
      kindLabel: payment.scheme,
      rawText,
      summaryTitle: payment.label || payment.scheme,
      summarySubtitle: payment.amount ? `${payment.amount} · ${payment.addressOrTarget}` : payment.addressOrTarget,
      payment,
    };
  }

  // 10. Plain Text Fallback
  const firstLine = rawText.split(/\r?\n/)[0]?.trim() || 'Plain Text';
  return {
    kind: 'text',
    kindLabel: 'Plain Text',
    rawText,
    summaryTitle: firstLine.length > 48 ? `${firstLine.slice(0, 48)}…` : firstLine,
    summarySubtitle: `${rawText.length} characters`,
  };
}

export type PayloadKind =
  | 'url'
  | 'file'
  | 'wifi'
  | 'vcard'
  | 'email'
  | 'phone'
  | 'sms'
  | 'geo'
  | 'otp'
  | 'payment'
  | 'text';

export interface UrlParts {
  fullUrl: string;
  hostname: string;
  protocol: string;
  subdomain: string;
  rootDomain: string;
  port: string;
  pathAndQuery: string;
  isIpAddress: boolean;
  isPunycode: boolean;
  isHttpInsecure: boolean;
  isShortener: boolean;
  hasUserInfo: boolean;
}

export interface FileInfo {
  extension: string;
  label: string;
  fileName: string;
}

export interface WifiPayload {
  ssid: string;
  security: 'WPA' | 'WEP' | 'nopass' | string;
  password: string;
  hidden: boolean;
}

export interface VCardPayload {
  fullName: string;
  organization: string;
  title: string;
  phones: { type: string; value: string }[];
  emails: { type: string; value: string }[];
  url: string;
  address: string;
  note: string;
  rawVcard: string;
}

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  mailtoHref: string;
}

export interface PhonePayload {
  number: string;
  telHref: string;
}

export interface SmsPayload {
  number: string;
  body: string;
  smsHref: string;
}

export interface GeoPayload {
  latitude: string;
  longitude: string;
  query: string;
  mapsHref: string;
}

export interface OtpPayload {
  otpType: string;
  label: string;
  issuer: string;
  secret: string;
  algorithm: string;
  digits: string;
  period: string;
}

export interface PaymentPayload {
  scheme: string;
  addressOrTarget: string;
  amount: string;
  label: string;
}

export interface ParsedPayload {
  kind: PayloadKind;
  kindLabel: string;
  rawText: string;
  summaryTitle: string;
  summarySubtitle: string;
  url?: UrlParts;
  file?: FileInfo;
  wifi?: WifiPayload;
  vcard?: VCardPayload;
  email?: EmailPayload;
  phone?: PhonePayload;
  sms?: SmsPayload;
  geo?: GeoPayload;
  otp?: OtpPayload;
  payment?: PaymentPayload;
}

export interface AiSafetyAnalysis {
  categoryLabel: string;
  safetyAssessment: 'Safe' | 'Caution' | 'High Risk';
  explanation: string;
  signals: string[];
}

export interface ScanHistoryItem {
  id: string;
  rawText: string;
  kind: PayloadKind;
  kindLabel: string;
  summaryTitle: string;
  summarySubtitle: string;
  timestamp: number;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DecodeSourceInfo {
  sourceType: 'upload' | 'clipboard' | 'camera' | 'history';
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  passUsed?: string;
}

export type BatchScanStatus = 'pending' | 'scanning' | 'decoded' | 'not_found' | 'error';

export interface BatchScanItem {
  id: string;
  fileName: string;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  status: BatchScanStatus;
  payload?: ParsedPayload;
  passUsed?: string;
  errorMessage?: string;
}


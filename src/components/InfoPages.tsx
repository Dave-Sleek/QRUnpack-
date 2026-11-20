import { useState } from 'react';
import { ArrowLeft, Check, Copy, Mail } from 'lucide-react';

export type PageSlug = 'decoder' | 'about' | 'privacy' | 'cookies' | 'terms' | 'contact';

interface InfoPageProps {
  page: Exclude<PageSlug, 'decoder'>;
  onBackToDecoder: () => void;
  onNavigate: (page: PageSlug) => void;
}

const CONTACT_EMAIL = 'contact@qrunpack.app';

export function InfoPages({ page, onBackToDecoder, onNavigate }: InfoPageProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = CONTACT_EMAIL;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedEmail(true);
    window.setTimeout(() => setCopiedEmail(false), 1800);
  };

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6">
      <div>
        <button
          type="button"
          onClick={onBackToDecoder}
          className="min-h-[40px] px-3 -ml-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/60 transition-colors inline-flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Decoder</span>
        </button>
      </div>

      {page === 'about' && (
        <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131922] p-6 sm:p-8 space-y-6">
          <header className="space-y-2 pb-5 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">About QRUnpack</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white [text-wrap:balance]">
              Single-device QR decoding without a second phone
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              QRUnpack is a fast, browser-based QR Code Decoder and Smart Action Hub built for the moments when a QR code is already on the screen you are using.
            </p>
          </header>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Why we built it
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Whether a QR code arrives inside a screenshot, a restaurant flyer PDF, a chat message, or a browser tab, you cannot point your device&apos;s camera at its own screen. QRUnpack lets you drag, paste, or batch-scan images right where you are, with zero sign-up required.
            </p>
          </section>

          <section className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Core capabilities
            </h2>
            <ul className="space-y-2.5 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              <li>
                <strong className="font-semibold text-slate-900 dark:text-white">Flexible input workflows:</strong>{' '}
                Upload or drag-and-drop single or multiple images, paste screenshots with Ctrl+V / Cmd+V, or use your device camera.
              </li>
              <li>
                <strong className="font-semibold text-slate-900 dark:text-white">Local multi-pass decoding:</strong>{' '}
                Images are processed locally on an HTML5 canvas across multiple scales, quiet-zone margins, and contrast passes, with an interactive Crop &amp; Retry tool if needed.
              </li>
              <li>
                <strong className="font-semibold text-slate-900 dark:text-white">Smart Action Cards:</strong>{' '}
                Automatically unpacks URLs (with root domain highlighting), direct file downloads, Wi-Fi credentials, vCard contacts, email/SMS/phone actions, map coordinates, 2FA setup keys, and payment strings.
              </li>
              <li>
                <strong className="font-semibold text-slate-900 dark:text-white">Custom QR Generator:</strong>{' '}
                Create and download custom-colored PNG or SVG QR codes right from the Smart Action Hub.
              </li>
            </ul>
          </section>
        </article>
      )}

      {page === 'privacy' && (
        <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131922] p-6 sm:p-8 space-y-6">
          <header className="space-y-2 pb-5 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
              Privacy Policy · Effective November 20, 2026
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              Privacy Policy
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              QRUnpack is designed around local-first processing and zero user accounts.
            </p>
          </header>

          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
              1. Images stay on your device
            </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              All QR code scanning, image cropping, camera frame inspection, and QR code image generation happen entirely inside your web browser using client-side JavaScript and an HTML5 canvas. Your screenshots and photos are never uploaded to our servers.
            </p>
          </section>

          <section className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
              2. Zero accounts &amp; local history
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              QRUnpack requires no login, email registration, or profile. To power the &ldquo;Recent Scans&rdquo; list, up to 15 decoded text strings (along with their detected type and timestamp, never image files) are stored locally in your browser&apos;s <code className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">localStorage</code>. You can delete individual items or wipe all history at any time with &ldquo;Clear History&rdquo;.
            </p>
          </section>

          <section className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
              3. Optional AI Safety &amp; Summary Check
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              AI payload analysis is strictly on-demand. Nothing is sent externally unless you explicitly click &ldquo;AI Safety &amp; Summary Check&rdquo; on a decoded result. When triggered, only the decoded text payload and detected payload type are sent to our backend endpoint to generate a safety and summary assessment via the Gemini API. We do not retain or log analyzed payloads in a database.
            </p>
          </section>

          <section className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
              4. Questions
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              If you have questions about this Privacy Policy, reach out via our{' '}
              <button
                type="button"
                onClick={() => onNavigate('contact')}
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
              >
                Contact Us
              </button>{' '}
              page.
            </p>
          </section>
        </article>
      )}

      {page === 'cookies' && (
        <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131922] p-6 sm:p-8 space-y-6">
          <header className="space-y-2 pb-5 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
              Cookies &amp; Local Storage · Effective November 20, 2026
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              Cookies Policy
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              QRUnpack does not use advertising, behavioral tracking, or third-party analytics cookies.
            </p>
          </header>

          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
              1. Cookies we set
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              We do not set tracking cookies or authentication session cookies. Because there are no user accounts, no persistent login cookies are required to use any feature on the site.
            </p>
          </section>

          <section className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
              2. Browser Local Storage keys
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Instead of server cookies, QRUnpack stores two strictly functional items in your browser&apos;s <code className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">localStorage</code> that remain solely on your device:
            </p>
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 divide-y divide-slate-200/70 dark:divide-slate-800 text-sm">
              <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <code className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
                  qrunpack_history_v1
                </code>
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  Stores up to 15 recent decoded strings (text &amp; timestamp only)
                </span>
              </div>
              <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <code className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
                  qrunpack_theme
                </code>
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  Remembers your Light or Dark appearance preference
                </span>
              </div>
            </div>
          </section>

          <section className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
              3. Managing or clearing storage
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              You can clear your scan history anytime using the &ldquo;Clear History&rdquo; button in the Recent Scans panel, or clear all site data through your browser&apos;s privacy settings.
            </p>
          </section>
        </article>
      )}

      {page === 'terms' && (
        <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131922] p-6 sm:p-8 space-y-6">
          <header className="space-y-2 pb-5 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
              Terms of Use · Effective November 20, 2026
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              Terms of Use
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              By using QRUnpack, you agree to the following practical terms governing this utility.
            </p>
          </header>

          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
              1. Acceptable use
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              QRUnpack is provided as a free utility to decode and generate QR codes. You agree not to misuse the service, attempt automated scraping or denial-of-service requests against the AI analysis endpoint, or use the generator to distribute malicious or deceptive links.
            </p>
          </section>

          <section className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
              2. Third-party links &amp; user responsibility
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              QR codes can contain URLs, file downloads, payment instructions, or commands created by third parties. QRUnpack displays the extracted content and root domain to help you inspect it, and offers an optional AI Safety &amp; Summary Check for informational guidance only. You remain solely responsible for verifying destinations before opening links, downloading files, or sending payments.
            </p>
          </section>

          <section className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
              3. Disclaimer of warranties
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              QRUnpack is provided &ldquo;as is&rdquo; without warranties of any kind, express or implied, including accuracy of decoding, uninterrupted availability, or completeness of automated safety assessments.
            </p>
          </section>
        </article>
      )}

      {page === 'contact' && (
        <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131922] p-6 sm:p-8 space-y-5">
          <header className="space-y-2">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Contact Us</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              Email
            </h1>
          </header>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center gap-3 text-base sm:text-lg font-semibold font-mono text-slate-950 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors break-all"
            >
              <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>{CONTACT_EMAIL}</span>
            </a>

            <button
              type="button"
              onClick={handleCopyEmail}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131922] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedEmail ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Email</span>
                </>
              )}
            </button>
          </div>
        </article>
      )}
    </div>
  );
}

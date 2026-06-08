import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Shield, FileText, ChevronLeft } from 'lucide-react';

const LAST_UPDATED = 'May 2026';
const COMPANY     = 'RentFlow Ltd';
const EMAIL       = 'legal@rentflow.ink';
const COUNTRY     = 'Kenya';

type Tab = 'privacy' | 'terms';

const LegalPage: React.FC = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const paramTab = params.get('tab');
  const defaultTab: Tab = (paramTab === 'terms' || location.hash === '#terms') ? 'terms' : 'privacy';
  const [tab, setTab] = useState<Tab>(defaultTab);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/tenant/login">
            <Button variant="ghost" size="sm" className="gap-2 text-slate-400">
              <ChevronLeft className="h-4 w-4" />Back
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTab('privacy')}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-colors ${
                tab === 'privacy' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />Privacy Policy
            </button>
            <button
              onClick={() => setTab('terms')}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-colors ${
                tab === 'terms' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />Terms of Service
            </button>
          </div>
          <div className="text-xs text-slate-500">Updated {LAST_UPDATED}</div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {tab === 'privacy' ? <PrivacyPolicy /> : <TermsOfService />}
      </div>
    </div>
  );
};

// ── Privacy Policy ─────────────────────────────────────────────────────────
const PrivacyPolicy: React.FC = () => (
  <article className="space-y-8 text-sm leading-7">
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Privacy Policy</h1>
      <p className="text-slate-400">Last updated: {LAST_UPDATED} · Applies to RentFlow platform and mobile app</p>
    </div>

    <Section title="1. Who we are">
      <p>{COMPANY} ("RentFlow", "we", "our") operates the RentFlow property management platform at rentflow.ink. We are registered and operate under the laws of {COUNTRY}.</p>
      <p>Data controller contact: <a href={`mailto:${EMAIL}`} className="text-primary underline">{EMAIL}</a></p>
    </Section>

    <Section title="2. What data we collect">
      <p><strong className="text-white">Account data:</strong> name, email address, phone number, and password hash when you register.</p>
      <p><strong className="text-white">Tenancy data:</strong> property address, unit number, lease dates, rent amount, deposit amount.</p>
      <p><strong className="text-white">Financial data:</strong> invoice amounts, payment dates, M-Pesa transaction codes, bank references. We do not store M-Pesa PINs or full card numbers.</p>
      <p><strong className="text-white">Property condition photos:</strong> timestamped images you upload of your rental unit. These are stored securely and only accessible by you and your property manager.</p>
      <p><strong className="text-white">Communications:</strong> messages between tenants and managers sent through the platform.</p>
      <p><strong className="text-white">Usage data:</strong> login times, pages visited, device type. We do not sell this data.</p>
    </Section>

    <Section title="3. How we use your data">
      <ul className="list-disc pl-5 space-y-1">
        <li>To provide the property management service (invoices, payments, maintenance)</li>
        <li>To process M-Pesa payments via Safaricom Daraja API</li>
        <li>To send rent reminders, receipts, and maintenance updates by email and SMS</li>
        <li>To resolve disputes about property condition at move-out (condition photos)</li>
        <li>To comply with legal obligations in Kenya</li>
        <li>To improve the platform (aggregated, anonymised usage analytics only)</li>
      </ul>
      <p className="mt-2 text-slate-400">We do not use your data for advertising. We do not sell your data to third parties.</p>
    </Section>

    <Section title="4. Who we share data with">
      <p><strong className="text-white">Safaricom (M-Pesa):</strong> phone number and payment amount when processing STK push payments.</p>
      <p><strong className="text-white">Resend (email):</strong> your email address and invoice details when sending notifications.</p>
      <p><strong className="text-white">Africa's Talking (SMS):</strong> your phone number and message content when sending SMS alerts.</p>
      <p><strong className="text-white">Supabase (database):</strong> all platform data is stored on Supabase infrastructure (AWS us-east-1).</p>
      <p><strong className="text-white">Your property manager:</strong> your contact details, payment history, and tenancy information are visible to the manager who manages your property.</p>
      <p><strong className="text-white">Landlords:</strong> landlords linked to a property can see property-level financial summaries but <em>cannot see individual tenant names, contact details, or personal information</em>.</p>
    </Section>

    <Section title="5. Your rights under the Kenya Data Protection Act 2019">
      <ul className="list-disc pl-5 space-y-1">
        <li><strong className="text-white">Access:</strong> request a copy of all personal data we hold about you</li>
        <li><strong className="text-white">Correction:</strong> request correction of inaccurate data</li>
        <li><strong className="text-white">Deletion:</strong> request deletion of your account and data (subject to legal retention requirements)</li>
        <li><strong className="text-white">Objection:</strong> object to processing of your data for certain purposes</li>
        <li><strong className="text-white">Portability:</strong> receive your data in a machine-readable format</li>
      </ul>
      <p className="mt-2">To exercise these rights, email <a href={`mailto:${EMAIL}`} className="text-primary underline">{EMAIL}</a>. We will respond within 21 days.</p>
    </Section>

    <Section title="6. Data retention">
      <p>We retain your data for as long as your account is active plus 7 years (required by Kenya's tax laws for financial records). Payment transaction records and receipts are kept for 7 years. Property condition photos are retained for 1 year after your tenancy ends. You may request early deletion of non-financial data.</p>
    </Section>

    <Section title="7. Security">
      <p>All data is encrypted in transit (TLS 1.3) and at rest (AES-256). Access to production data is restricted to authorised personnel. We conduct regular security reviews. No system is perfectly secure — if you suspect unauthorised access to your account, contact us immediately at {EMAIL}.</p>
    </Section>

    <Section title="8. Changes to this policy">
      <p>We will notify you by email at least 14 days before making material changes to this policy. Continued use of the platform after the effective date constitutes acceptance.</p>
    </Section>
  </article>
);

// ── Terms of Service ────────────────────────────────────────────────────────
const TermsOfService: React.FC = () => (
  <article className="space-y-8 text-sm leading-7">
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Terms of Service</h1>
      <p className="text-slate-400">Last updated: {LAST_UPDATED} · Governing law: {COUNTRY}</p>
    </div>

    <Section title="1. Acceptance">
      <p>By creating a RentFlow account, you agree to these Terms of Service and our Privacy Policy. If you are registering on behalf of a business, you confirm you have authority to bind that business.</p>
    </Section>

    <Section title="2. The service">
      <p>RentFlow provides a software platform for property managers, landlords, and tenants to manage rental properties, including invoicing, payment tracking, maintenance requests, and communications. RentFlow is not a party to any lease or tenancy agreement created through the platform.</p>
    </Section>

    <Section title="3. Manager responsibilities">
      <ul className="list-disc pl-5 space-y-1">
        <li>Maintain accurate property and tenant records</li>
        <li>Issue invoices that reflect genuine rent obligations</li>
        <li>Not use the platform to harass, threaten, or unlawfully charge tenants</li>
        <li>Comply with the Landlord and Tenant (Shops, Hotels and Catering Establishments) Act and any applicable rental laws</li>
        <li>Pay platform subscription fees within the stated due dates</li>
      </ul>
    </Section>

    <Section title="4. Tenant protections">
      <p>The following features exist specifically to protect tenants:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong className="text-white">Self-initiated payments only:</strong> M-Pesa STK push requests can only be initiated by the tenant — managers cannot push payment requests to your phone without your consent.</li>
        <li><strong className="text-white">Condition photos:</strong> timestamped move-in photos create immutable evidence for deposit disputes.</li>
        <li><strong className="text-white">Payment diary:</strong> tenants can log cash payments independently of the manager's records.</li>
        <li><strong className="text-white">Data isolation:</strong> landlords linked to properties cannot see your personal contact information.</li>
      </ul>
    </Section>

    <Section title="5. Payments">
      <p>RentFlow processes M-Pesa payments via Safaricom Daraja API. By initiating a payment, you authorise the debit from your M-Pesa account. RentFlow is not responsible for Safaricom service outages. All payment records are logged and immutable — we cannot alter or delete payment receipts once issued.</p>
      <p className="mt-2">Platform subscription fees for managers are invoiced monthly. Accounts with invoices overdue by 30 days are suspended. Reinstatement is automatic upon payment.</p>
    </Section>

    <Section title="6. Prohibited uses">
      <ul className="list-disc pl-5 space-y-1">
        <li>Creating false invoices or charging tenants for services not rendered</li>
        <li>Using the platform to facilitate unlawful eviction</li>
        <li>Attempting to circumvent the M-Pesa tenant-only payment protection</li>
        <li>Sharing platform credentials with unauthorised parties</li>
        <li>Scraping, reverse-engineering, or reselling the platform</li>
      </ul>
      <p className="mt-2">Violation of these terms will result in immediate account suspension without refund.</p>
    </Section>

    <Section title="7. Liability">
      <p>RentFlow provides the platform "as is". We are not liable for: disputes between landlords and tenants; losses arising from M-Pesa service outages; data loss due to events beyond our reasonable control. Our total liability to any party in any 12-month period shall not exceed the subscription fees paid to us in that period.</p>
    </Section>

    <Section title="8. Governing law">
      <p>These terms are governed by the laws of Kenya. Disputes shall be resolved in the courts of Nairobi, Kenya.</p>
    </Section>

    <Section title="9. Contact">
      <p>Questions about these terms: <a href={`mailto:${EMAIL}`} className="text-primary underline">{EMAIL}</a></p>
    </Section>
  </article>
);

// ── Helpers ────────────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section>
    <h2 className="text-base font-semibold text-white mb-3 pb-1 border-b border-slate-800">{title}</h2>
    <div className="space-y-2 text-slate-300">{children}</div>
  </section>
);

export default LegalPage;

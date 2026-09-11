// DRAFT for review — not legal advice. Check against your own situation (and a
// lawyer) before relying on it, especially once payments launch.
import { LegalPage, Contact } from "@/components/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Privacy policy · Oykot Money" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <section>
        <p>
          {LEGAL.product} is run by {LEGAL.controller}, {LEGAL.location}, who is responsible for
          your personal data. Questions or requests: <Contact />.
        </p>
      </section>
      <section>
        <h2>What we collect</h2>
        <ul>
          <li><strong>Your account</strong> — email address, name, and a password (stored only as a secure hash by our login provider). If you sign in with Google, the name and email Google shares.</li>
          <li><strong>What you enter</strong> — budgets, categories, transactions, accounts, assets, and the people you lend to or borrow from.</li>
          <li><strong>Settings</strong> — your currency, date format and timezone. We suggest defaults from the country your connection comes from; we don&rsquo;t store your IP address.</li>
          <li><strong>Payments, once they launch</strong> — handled by the payment provider. We&rsquo;d receive your plan and payment status, never your card or bank details.</li>
        </ul>
      </section>
      <section>
        <h2>Why we use it</h2>
        <p>Only to run the service you signed up for: to show your budget back to you, keep your account secure, and, later, to manage your subscription. We don&rsquo;t sell your data, show ads, or use it to profile you. There are no third-party analytics or advertising trackers; the only cookies keep you signed in.</p>
      </section>
      <section>
        <h2>Who processes it for us</h2>
        <ul>
          <li><strong>Supabase</strong> — database and sign-in.</li>
          <li><strong>Vercel</strong> — hosting. The app and database run in Mumbai, India.</li>
          <li><strong>Google</strong> — only if you choose to sign in with Google.</li>
          <li><strong>Payment providers</strong> — Razorpay for payments in India and a merchant of record elsewhere, once payments launch.</li>
        </ul>
      </section>
      <section>
        <h2>How long we keep it</h2>
        <p>For as long as you have an account. Delete your account in Settings and your data is removed immediately; copies in our providers&rsquo; backups expire within 30 days. We keep payment records longer only where the law requires it.</p>
      </section>
      <section>
        <h2>Your rights</h2>
        <p>You can see, correct, export or delete your data at any time — most of it directly in the app (Settings has export and delete). You can also withdraw consent by deleting your account. Under India&rsquo;s Digital Personal Data Protection Act, 2023, and similar laws where you live, you can ask us about how your data is handled or raise a grievance at <Contact />. We reply within 30 days.</p>
      </section>
      <section>
        <h2>Security</h2>
        <p>Data is encrypted in transit, every record is tied to your account and checked on every request, and database-level access rules add a second layer of protection.</p>
      </section>
      <section>
        <h2>Children</h2>
        <p>{LEGAL.product} is for people 18 and over.</p>
      </section>
      <section>
        <h2>Changes</h2>
        <p>If this policy changes in a way that matters, we&rsquo;ll tell you in the app or by email before it takes effect.</p>
      </section>
    </LegalPage>
  );
}

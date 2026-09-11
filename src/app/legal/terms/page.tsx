// DRAFT for review — not legal advice.
import { LegalPage, Contact } from "@/components/legal-page";
import { LEGAL } from "@/lib/legal";
import { TRIAL_DAYS } from "@/lib/pricing";

export const metadata = { title: "Terms · Oykot Money" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service">
      <section>
        <p>These terms are between you and {LEGAL.controller} ({LEGAL.location}), who runs {LEGAL.product}. By creating an account you agree to them.</p>
      </section>
      <section>
        <h2>The service</h2>
        <p>{LEGAL.product} helps you plan and track personal finances. It records what you tell it; it doesn&rsquo;t connect to your bank or move money.</p>
      </section>
      <section>
        <h2>Not financial advice</h2>
        <p>Figures, charts and suggestions in the app are tools for your own decisions, not financial, tax or investment advice.</p>
      </section>
      <section>
        <h2>Your account</h2>
        <p>You need to be 18 or over. Keep your login safe; you&rsquo;re responsible for activity on your account.</p>
      </section>
      <section>
        <h2>Trial and subscription</h2>
        <ul>
          <li>New accounts get a {TRIAL_DAYS}-day free trial with no card required.</li>
          <li>Once payments launch, paid plans renew automatically each month or year until you cancel. You can cancel any time and keep access until the end of the paid period.</li>
          <li>If a trial or subscription ends, your account becomes read-only: you can still view and export your data.</li>
          <li>We&rsquo;ll give at least 30 days&rsquo; notice before any price change affects you.</li>
        </ul>
      </section>
      <section>
        <h2>Your data</h2>
        <p>What you enter is yours. You can export it or delete your account whenever you like. How we handle it is set out in the privacy policy.</p>
      </section>
      <section>
        <h2>Fair use</h2>
        <p>Don&rsquo;t use the service unlawfully, try to access other people&rsquo;s data, or disrupt it for others. We may suspend accounts that do.</p>
      </section>
      <section>
        <h2>Availability and liability</h2>
        <p>We work to keep the service running and your data safe, but it&rsquo;s provided as is, without guarantees of uninterrupted availability. To the extent the law allows, our liability is limited to what you paid us in the 12 months before a claim.</p>
      </section>
      <section>
        <h2>Ending</h2>
        <p>You can stop any time by deleting your account. We may end the service with reasonable notice, in which case you&rsquo;ll be able to export your data first.</p>
      </section>
      <section>
        <h2>Law</h2>
        <p>These terms are governed by the laws of India, with courts in Delhi having jurisdiction. Questions: <Contact />.</p>
      </section>
    </LegalPage>
  );
}

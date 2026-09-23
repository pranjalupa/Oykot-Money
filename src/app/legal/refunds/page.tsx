// DRAFT for review — not legal advice.
import { LegalPage, Contact } from "@/components/legal-page";
import { MONTHLY_REFUND_DAYS, TRIAL_DAYS, YEARLY_OFFER } from "@/lib/pricing";

export const metadata = { title: "Refund policy · Oykot Money" };

export default function RefundsPage() {
  return (
    <LegalPage title="Refund policy">
      <section>
        <h2>Try before you pay</h2>
        <p>Every account starts with a {TRIAL_DAYS}-day free trial, no card needed, so you can decide before paying anything.</p>
      </section>
      <section>
        <h2>Cancelling</h2>
        <p>Cancel any time from Settings. You won&rsquo;t be charged again, and you keep access until the end of the period you&rsquo;ve paid for.</p>
      </section>
      <section>
        <h2>Refunds</h2>
        <ul>
          {/* The yearly window is the offer on the pricing page; the two are the
              same promise and have to move together. */}
          <li>On a <strong>yearly</strong> plan, ask within {YEARLY_OFFER.refundDays} days of your first charge and we&rsquo;ll refund the whole year.</li>
          <li>On a <strong>monthly</strong> plan, ask within {MONTHLY_REFUND_DAYS} days of your first charge and we&rsquo;ll refund it in full.</li>
          <li>Renewals aren&rsquo;t refunded, except for a duplicate or mistaken charge, which we always refund.</li>
          <li>Refunds go back to the original payment method, usually within 5–10 working days depending on your bank.</li>
          <li>If you paid through our merchant of record (outside India), the refund is issued by them under the same terms.</li>
        </ul>
      </section>
      {YEARLY_OFFER.priceLock && (
        <section>
          <h2>Your price</h2>
          <p>The price you subscribe at is the price you keep, for as long as the subscription runs without a break. If we raise prices, it applies to new subscriptions — not yours. Cancel and come back later and you pay whatever the price is then.</p>
        </section>
      )}
      <section>
        <h2>How to ask</h2>
        <p>Email <Contact /> from the address on your account.</p>
      </section>
    </LegalPage>
  );
}

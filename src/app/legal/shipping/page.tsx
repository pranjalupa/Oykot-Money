// DRAFT for review — not legal advice.
import Link from "next/link";
import { LegalPage, Contact } from "@/components/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Shipping and delivery · Oykot Money" };

/**
 * Payment processors in India expect a shipping policy even for software. The
 * honest one: nothing ships; the service is delivered online, at once.
 */
export default function ShippingPage() {
  return (
    <LegalPage title="Shipping and delivery">
      <section>
        <h2>Nothing is shipped</h2>
        <p>
          {LEGAL.product} is an online service. There are no physical goods, so there is nothing to
          ship and no shipping charge.
        </p>
      </section>
      <section>
        <h2>How it&rsquo;s delivered</h2>
        <ul>
          <li>You get access in your browser at money.oykotstudio.com as soon as you create an account.</li>
          <li>A paid plan applies to your account as soon as the payment is confirmed, usually within a minute.</li>
          <li>The app can also be installed from the browser to your phone&rsquo;s home screen. It is the same service.</li>
        </ul>
      </section>
      <section>
        <h2>If you can&rsquo;t get in</h2>
        <p>
          Email <Contact /> and we&rsquo;ll sort it out. If a paid plan never reached your account,
          the <Link href="/legal/refunds" className="font-medium underline underline-offset-4">refund policy</Link> applies.
        </p>
      </section>
    </LegalPage>
  );
}

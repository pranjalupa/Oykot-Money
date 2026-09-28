import Link from "next/link";
import { LegalPage, Contact } from "@/components/legal-page";
import { LEGAL } from "@/lib/legal";
import { PRICES, TRIAL_DAYS, formatPrice } from "@/lib/pricing";

export const metadata = { title: "About us · Oykot Money" };

/**
 * Who runs this and what it is. Razorpay's activation review asked for an
 * About page; it must match the KYC, which is Pranjal as an individual. Every
 * claim here is checkable against the app, so nothing is dressed up.
 */
export default function AboutPage() {
  return (
    <LegalPage title="About us">
      <section>
        <h2>What Oykot Money is</h2>
        <p>
          {LEGAL.product} is a personal budgeting app. You log what you spend and what comes in, set a
          budget for each month, and the app tells you how much is safe to spend each day. It never
          asks for your bank login: everything in it is what you choose to add.
        </p>
      </section>
      <section>
        <h2>Who runs it</h2>
        <p>
          {LEGAL.product} is built and run by {LEGAL.controller}, as an individual, from India. It is
          sold at <Link href="/" className="font-medium underline underline-offset-4">money.oykotstudio.com</Link>.
        </p>
      </section>
      <section>
        <h2>What it costs</h2>
        <ul>
          <li>{formatPrice(PRICES.INR.monthly, "INR")} a month, or {formatPrice(PRICES.INR.yearly, "INR")} a year, in Indian rupees.</li>
          <li>Every account starts with a {TRIAL_DAYS}-day free trial.</li>
          <li>Payments in India are processed by Razorpay.</li>
        </ul>
        <p>
          Full details are on the <Link href="/pricing?currency=inr" className="font-medium underline underline-offset-4">pricing page</Link>,
          and cancellations and refunds in the <Link href="/legal/refunds" className="font-medium underline underline-offset-4">refund policy</Link>.
        </p>
      </section>
      <section>
        <h2>Get in touch</h2>
        <p>Email <Contact />. See the <Link href="/contact" className="font-medium underline underline-offset-4">contact page</Link> for what to include.</p>
      </section>
    </LegalPage>
  );
}

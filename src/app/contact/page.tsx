import Link from "next/link";
import { LegalPage, Contact } from "@/components/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Contact us · Oykot Money" };

/** Email only, at Pranjal's call: no phone or street address published. */
export default function ContactPage() {
  return (
    <LegalPage title="Contact us">
      <section>
        <h2>Email</h2>
        <p>
          For anything about your account, a payment, a refund or cancelling, email <Contact />.
          Write from the address on your account so we can find it.
        </p>
      </section>
      <section>
        <h2>For a payment question, include</h2>
        <ul>
          <li>The date and amount of the payment.</li>
          <li>Whether you paid in rupees (Razorpay) or another currency.</li>
          <li>What you&rsquo;d like done: a refund, a cancellation, or a question answered.</li>
        </ul>
      </section>
      <section>
        <h2>Who you&rsquo;re writing to</h2>
        <p>
          {LEGAL.product} is run by {LEGAL.controller}, as an individual. More on the{" "}
          <Link href="/about" className="font-medium underline underline-offset-4">about page</Link>.
        </p>
      </section>
    </LegalPage>
  );
}

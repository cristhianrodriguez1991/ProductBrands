"use client"

import { useMemo, useState } from "react"
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js"
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { Loader2, Lock, Landmark, CreditCard, Info, AlertCircle } from "lucide-react"

type FeeQuote = { feeCents: number; totalCents: number; funding: string | null }

interface PanelProps {
  orderId: string
  amountDue: number
  publishableKey: string | null
  surchargePercent: number
  agreedToTerms: boolean
  onRequireTerms: () => void
  onPaymentComplete: (order: any) => void
}

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents || 0) / 100)

const stripePromiseCache = new Map<string, ReturnType<typeof loadStripe>>()
function getStripe(key: string) {
  if (!stripePromiseCache.has(key)) stripePromiseCache.set(key, loadStripe(key))
  return stripePromiseCache.get(key)!
}

export function InvoicePaymentPanel(props: PanelProps) {
  const baseCents = Math.round((props.amountDue || 0) * 100)

  const options = useMemo<StripeElementsOptions>(
    () => ({
      mode: "payment",
      amount: baseCents,
      currency: "usd",
      paymentMethodTypes: ["us_bank_account", "card"],
      appearance: {
        theme: "stripe",
        variables: {
          colorPrimary: "#0f172a",
          colorText: "#0f172a",
          colorTextSecondary: "#64748b",
          colorDanger: "#e11d48",
          borderRadius: "10px",
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          spacingUnit: "4px",
        },
        rules: {
          ".Tab": { border: "1px solid #e2e8f0", boxShadow: "none" },
          ".Tab--selected": { borderColor: "#0f172a", boxShadow: "0 0 0 1px #0f172a" },
          ".Input": { border: "1px solid #e2e8f0", boxShadow: "none" },
          ".Input:focus": { borderColor: "#0f172a", boxShadow: "0 0 0 1px #0f172a" },
        },
      },
    }),
    [baseCents]
  )

  if (!props.publishableKey) {
    return <HostedCheckoutFallback {...props} baseCents={baseCents} />
  }

  return (
    <Elements stripe={getStripe(props.publishableKey)} options={options}>
      <InlinePaymentForm {...props} baseCents={baseCents} />
    </Elements>
  )
}

/* ------------------------------------------------------------------ */
/* Shared layout                                                        */
/* ------------------------------------------------------------------ */

function PanelShell({
  baseCents,
  children,
  summary,
}: {
  baseCents: number
  children: React.ReactNode
  summary: React.ReactNode
}) {
  return (
    <section id="pay-invoice" aria-labelledby="pay-invoice-title" className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 px-6 sm:px-8 py-5 border-b border-slate-200 bg-slate-50/70">
        <div>
          <h2 id="pay-invoice-title" className="text-lg font-bold text-slate-900">Pay Invoice</h2>
          <p className="text-sm text-slate-500 mt-0.5">Pay by ACH bank transfer or card.</p>
        </div>
        <div className="sm:text-right">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Amount Due</span>
          <span className="text-2xl font-black text-slate-900">{money(baseCents)}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
        <div className="lg:col-span-3 p-6 sm:p-8">{children}</div>
        <aside className="lg:col-span-2 p-6 sm:p-8 bg-slate-50/60 border-t lg:border-t-0 lg:border-l border-slate-200">
          {summary}
        </aside>
      </div>
    </section>
  )
}

function FeePolicyNote({ percent }: { percent: number }) {
  return (
    <div className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
      <span>
        No fee for ACH bank transfers or debit cards. A {percent}% surcharge applies to credit cards and is not greater than our cost of acceptance.
      </span>
    </div>
  )
}

function SecureNote() {
  return (
    <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
      <Lock className="h-3 w-3" />
      <span>Payments are securely processed by Stripe</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Inline Payment Element form                                          */
/* ------------------------------------------------------------------ */

function InlinePaymentForm({
  orderId,
  baseCents,
  surchargePercent,
  agreedToTerms,
  onRequireTerms,
  onPaymentComplete,
}: PanelProps & { baseCents: number }) {
  const stripe = useStripe()
  const elements = useElements()

  const [ready, setReady] = useState(false)
  const [methodType, setMethodType] = useState<string>("us_bank_account")
  const [quote, setQuote] = useState<FeeQuote | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [microdepositUrl, setMicrodepositUrl] = useState<string | null>(null)

  const totalCents = quote ? quote.totalCents : baseCents
  const isCard = methodType === "card"

  const resetQuote = () => {
    if (quote) {
      setQuote(null)
      elements?.update({ amount: baseCents })
    }
  }

  const finalize = async (paymentIntentId: string) => {
    const res = await fetch(`/api/orders/${orderId}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId }),
    })
    const data = await res.json()
    if (data?.order) onPaymentComplete(data.order)
  }

  const handlePay = async () => {
    if (!stripe || !elements) return
    if (!agreedToTerms) {
      onRequireTerms()
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const { error: submitError } = await elements.submit()
      if (submitError) {
        setError(submitError.message || "Please check your payment details.")
        return
      }

      const { error: tokenError, confirmationToken } = await stripe.createConfirmationToken({
        elements,
        params: { return_url: `${window.location.origin}/pay/${orderId}` },
      })
      if (tokenError || !confirmationToken) {
        setError(tokenError?.message || "Unable to process payment details.")
        return
      }

      const res = await fetch(`/api/orders/${orderId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmationTokenId: confirmationToken.id,
          acceptedFeeCents: quote?.feeCents ?? 0,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data?.error || "Your payment could not be completed.")
        return
      }

      // Credit card detected -> disclose surcharge, customer confirms with one more click
      if (data.requiresFeeConfirmation) {
        setQuote({ feeCents: data.feeCents, totalCents: data.totalCents, funding: data.funding })
        elements.update({ amount: data.totalCents })
        return
      }

      if (data.microdepositUrl) {
        setMicrodepositUrl(data.microdepositUrl)
        return
      }

      if (data.status === "requires_action" && data.clientSecret) {
        const { error: actionError } = await stripe.handleNextAction({ clientSecret: data.clientSecret })
        if (actionError) {
          setError(actionError.message || "Authentication failed. Please try another payment method.")
          return
        }
        await finalize(data.paymentIntentId)
        return
      }

      if (data.status === "succeeded" || data.status === "processing") {
        if (data.order) onPaymentComplete(data.order)
        else await finalize(data.paymentIntentId)
        return
      }

      setError("Your payment could not be completed. Please try again or use another method.")
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.")
    } finally {
      setProcessing(false)
    }
  }

  const buttonLabel = processing
    ? "Processing…"
    : quote
      ? `Confirm & Pay ${money(totalCents)}`
      : `Pay ${money(totalCents)}`

  const summary = (
    <div className="flex flex-col h-full gap-5">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Payment Summary</h3>
        <dl className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-600">Invoice total</dt>
            <dd className="font-semibold text-slate-900">{money(baseCents)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">
              {quote ? `Credit card surcharge (${surchargePercent}%)` : "Processing fee"}
            </dt>
            <dd className={`font-semibold text-right ${quote ? "text-slate-900" : "text-emerald-700"}`}>
              {quote ? money(quote.feeCents) : isCard ? "None for debit" : "No fee"}
            </dd>
          </div>
          <div className="flex justify-between items-baseline border-t border-slate-200 pt-3">
            <dt className="font-bold text-slate-900">Total to pay</dt>
            <dd className="text-xl font-black text-slate-900">{money(totalCents)}</dd>
          </div>
        </dl>
      </div>

      {quote && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 leading-relaxed">
          A credit card was detected, so a {surchargePercent}% surcharge of <strong>{money(quote.feeCents)}</strong> applies. Choose{" "}
          <strong>Bank (ACH)</strong> or use a <strong>debit card</strong> to pay with no fee.
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 mt-px" />
          <span>{error}</span>
        </div>
      )}

      {microdepositUrl && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs text-sky-900 leading-relaxed">
          Your bank account needs a quick verification. Stripe will send two small deposits to your account in 1–2 business days.{" "}
          <a href={microdepositUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
            Verify bank account
          </a>
        </div>
      )}

      <div className="mt-auto space-y-3">
        <button
          id="pay-invoice-button"
          type="button"
          onClick={handlePay}
          disabled={!stripe || !ready || processing || !!microdepositUrl}
          className={`w-full h-12 rounded-xl font-bold text-[15px] inline-flex items-center justify-center gap-2 transition-all ${
            agreedToTerms
              ? "bg-slate-900 text-white hover:bg-slate-800 shadow-md hover:shadow-lg active:scale-[0.99]"
              : "bg-slate-200 text-slate-500"
          } disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          {buttonLabel}
        </button>
        {!agreedToTerms && (
          <p className="text-[11px] text-center text-slate-500">Accept the Terms of Sale above to enable payment.</p>
        )}
        <SecureNote />
        <FeePolicyNote percent={surchargePercent} />
      </div>
    </div>
  )

  return (
    <PanelShell baseCents={baseCents} summary={summary}>
      {!ready && (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading secure payment form…
        </div>
      )}
      <PaymentElement
        id="payment-element"
        onReady={() => setReady(true)}
        onChange={(e) => {
          setError(null)
          if (e.value?.type && e.value.type !== methodType) setMethodType(e.value.type)
          // Any change to payment details invalidates a previously shown surcharge
          resetQuote()
        }}
        options={{
          layout: { type: "tabs", defaultCollapsed: false },
          paymentMethodOrder: ["us_bank_account", "card"],
        }}
      />
    </PanelShell>
  )
}

/* ------------------------------------------------------------------ */
/* Fallback: hosted Stripe Checkout (used until a publishable key is set) */
/* ------------------------------------------------------------------ */

function HostedCheckoutFallback({
  orderId,
  baseCents,
  surchargePercent,
  agreedToTerms,
  onRequireTerms,
}: PanelProps & { baseCents: number }) {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePay = async () => {
    if (!agreedToTerms) {
      onRequireTerms()
      return
    }
    try {
      setProcessing(true)
      setError(null)
      const res = await fetch(`/api/orders/${orderId}/checkout`, { method: "POST" })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || "Unable to start payment")
      window.location.href = data.url
    } catch (err: any) {
      setError(err.message)
      setProcessing(false)
    }
  }

  const summary = (
    <div className="flex flex-col h-full gap-5">
      <dl className="space-y-2.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-600">Invoice total</dt>
          <dd className="font-semibold text-slate-900">{money(baseCents)}</dd>
        </div>
        <div className="flex justify-between items-baseline border-t border-slate-200 pt-3">
          <dt className="font-bold text-slate-900">Total to pay</dt>
          <dd className="text-xl font-black text-slate-900">{money(baseCents)}</dd>
        </div>
      </dl>
      {error && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800">{error}</div>
      )}
      <div className="mt-auto space-y-3">
        <button
          id="pay-invoice-button"
          type="button"
          onClick={handlePay}
          disabled={processing}
          className={`w-full h-12 rounded-xl font-bold text-[15px] inline-flex items-center justify-center gap-2 transition-all ${
            agreedToTerms ? "bg-slate-900 text-white hover:bg-slate-800 shadow-md" : "bg-slate-200 text-slate-500"
          } disabled:opacity-60`}
        >
          {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          {processing ? "Opening secure checkout…" : `Pay ${money(baseCents)}`}
        </button>
        <SecureNote />
      </div>
    </div>
  )

  return (
    <PanelShell baseCents={baseCents} summary={summary}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 p-4">
          <Landmark className="h-5 w-5 text-slate-700 mb-2" />
          <div className="font-semibold text-slate-900 text-sm">ACH Bank Transfer</div>
          <div className="text-xs text-slate-500 mt-0.5">Connect your US business bank account. No fee.</div>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <CreditCard className="h-5 w-5 text-slate-700 mb-2" />
          <div className="font-semibold text-slate-900 text-sm">Credit or Debit Card</div>
          <div className="text-xs text-slate-500 mt-0.5">Visa, Mastercard, American Express, Discover.</div>
        </div>
      </div>
      <div className="mt-4">
        <FeePolicyNote percent={surchargePercent} />
      </div>
    </PanelShell>
  )
}

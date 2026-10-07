"use client"

import { useMemo, useState } from "react"
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js"
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import {
  Loader2,
  Lock,
  Landmark,
  CreditCard,
  Info,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Sparkles,
  ArrowRight
} from "lucide-react"
import { computeCardProcessingFeeCents } from "@/lib/invoice"

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
/* Shared layout shell                                                */
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
          <p className="text-sm text-slate-500 mt-0.5">Select your preferred payment method below.</p>
        </div>
        <div className="sm:text-right">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Invoice Total</span>
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

function SecureNote() {
  return (
    <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
      <Lock className="h-3.5 w-3.5 text-slate-400" />
      <span>Encrypted &amp; securely processed by Stripe</span>
    </div>
  )
}

function AchSetupGuide() {
  return (
    <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <Landmark className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
            How to Pay via ACH Bank Transfer ($0.00 Fee)
          </h4>
          <p className="text-[11px] text-emerald-800">
            Fast, secure direct payment from your US business bank account.
          </p>
        </div>
      </div>

      <ol className="space-y-3 text-xs text-slate-700">
        <li className="flex items-start gap-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-[11px] font-bold text-emerald-900">
            1
          </span>
          <div>
            <strong className="text-slate-900">Select Your Bank:</strong>
            <span className="text-slate-600 ml-1">
              Click the button to open Stripe&apos;s verified bank portal. Choose from Chase, Bank of America, Wells Fargo, Citi, PNC, Capital One, or search any US financial institution.
            </span>
          </div>
        </li>
        <li className="flex items-start gap-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-[11px] font-bold text-emerald-900">
            2
          </span>
          <div>
            <strong className="text-slate-900">Log In Securely:</strong>
            <span className="text-slate-600 ml-1">
              Sign in with your normal online banking credentials through Stripe Financial Connections. Your credentials are encrypted end-to-end and never seen by Product Brands.
            </span>
          </div>
        </li>
        <li className="flex items-start gap-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-[11px] font-bold text-emerald-900">
            3
          </span>
          <div>
            <strong className="text-slate-900">Confirm &amp; Authorize:</strong>
            <span className="text-slate-600 ml-1">
              Select your business checking or savings account. Payment is authorized with <span className="font-bold text-emerald-700">$0.00 in added fees</span>.
            </span>
          </div>
        </li>
      </ol>

      <div className="rounded-lg border border-emerald-200 bg-white/80 p-3 text-[11px] text-slate-600">
        <span className="font-semibold text-slate-900">Don&apos;t use online banking?</span> You can also select{" "}
        <em>&quot;Manually enter account details&quot;</em> in the Stripe portal to pay using your 9-digit Routing Number and Account Number.
      </div>
    </div>
  )
}

function CardFeeNotice({ feeCents }: { feeCents: number }) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-5 text-xs text-slate-700">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white">
          <CreditCard className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Credit &amp; Debit Card Payment
          </h4>
          <p className="text-[11px] text-slate-500">
            Visa, Mastercard, American Express, and Discover accepted.
          </p>
        </div>
      </div>

      <p className="leading-relaxed text-slate-600">
        Card payments are processed instantly. Stripe charges a standard payment processing fee of <strong>2.9% + $0.30</strong> ({money(feeCents)}), which is added to the invoice total.
      </p>

      <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-[11px] text-amber-900">
        💡 <strong>Want to avoid this fee?</strong> Switch to <strong>ACH Bank Transfer</strong> above to pay <strong>$0.00</strong> in processing fees.
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Fallback: Hosted Stripe Checkout                                   */
/* ------------------------------------------------------------------ */

function HostedCheckoutFallback({
  orderId,
  baseCents,
  agreedToTerms,
  onRequireTerms,
}: PanelProps & { baseCents: number }) {
  const [selectedMethod, setSelectedMethod] = useState<"ach" | "card">("ach")
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cardFeeCents = computeCardProcessingFeeCents(baseCents)
  const feeCents = selectedMethod === "card" ? cardFeeCents : 0
  const totalCents = baseCents + feeCents

  const handlePay = async () => {
    if (!agreedToTerms) {
      onRequireTerms()
      return
    }
    try {
      setProcessing(true)
      setError(null)
      const res = await fetch(`/api/orders/${orderId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: selectedMethod }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || "Unable to start payment checkout")
      window.location.href = data.url
    } catch (err: any) {
      setError(err.message || "An error occurred while connecting to payment checkout.")
      setProcessing(false)
    }
  }

  const summary = (
    <div className="flex flex-col h-full gap-5">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Payment Breakdown
        </h3>
        <dl className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-600">Invoice total</dt>
            <dd className="font-semibold text-slate-900">{money(baseCents)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">Payment method</dt>
            <dd className="font-semibold text-slate-900 text-right">
              {selectedMethod === "ach" ? "ACH Bank Transfer" : "Credit / Debit Card"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">
              {selectedMethod === "card" ? "Card processing fee (2.9% + $0.30)" : "Processing fee"}
            </dt>
            <dd className={`font-semibold text-right ${selectedMethod === "ach" ? "text-emerald-700" : "text-slate-900"}`}>
              {selectedMethod === "ach" ? "$0.00 (Free)" : money(cardFeeCents)}
            </dd>
          </div>
          <div className="flex justify-between items-baseline border-t border-slate-200 pt-3">
            <dt className="font-bold text-slate-900">Total to pay</dt>
            <dd className="text-2xl font-black text-slate-900">{money(totalCents)}</dd>
          </div>
        </dl>
      </div>

      {selectedMethod === "ach" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs text-emerald-950 flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            <strong>Zero fees:</strong> You are saving <strong>{money(cardFeeCents)}</strong> in processing fees by paying via ACH bank transfer.
          </span>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 mt-px" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-auto space-y-3">
        <button
          id="pay-invoice-button"
          type="button"
          onClick={handlePay}
          disabled={processing}
          className={`w-full h-12 rounded-xl font-bold text-[15px] inline-flex items-center justify-center gap-2 transition-all ${
            agreedToTerms
              ? "bg-slate-900 text-white hover:bg-slate-800 shadow-md hover:shadow-lg active:scale-[0.99]"
              : "bg-slate-200 text-slate-500"
          } disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer`}
        >
          {processing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Opening secure checkout…
            </>
          ) : (
            <>
              {selectedMethod === "ach" ? <Landmark className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
              Pay {money(totalCents)} {selectedMethod === "ach" ? "via ACH (Free)" : "with Card"}
            </>
          )}
        </button>

        {!agreedToTerms && (
          <p className="text-[11px] text-center text-slate-500">
            Accept the Terms &amp; Conditions above to enable payment.
          </p>
        )}

        <SecureNote />
      </div>
    </div>
  )

  return (
    <PanelShell baseCents={baseCents} summary={summary}>
      <div className="space-y-6">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-3">
            Choose Payment Method
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* ACH Option */}
            <button
              type="button"
              onClick={() => setSelectedMethod("ach")}
              className={`text-left p-4 rounded-xl border-2 transition-all relative cursor-pointer ${
                selectedMethod === "ach"
                  ? "border-emerald-600 bg-emerald-50/40 shadow-xs ring-2 ring-emerald-600/20"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${selectedMethod === "ach" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                  <Landmark className="h-5 w-5" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  $0 Fee (Free)
                </span>
              </div>
              <div className="font-bold text-slate-900 text-sm">ACH Bank Transfer</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Direct debit from your business bank account. Recommended.
              </div>
            </button>

            {/* Card Option */}
            <button
              type="button"
              onClick={() => setSelectedMethod("card")}
              className={`text-left p-4 rounded-xl border-2 transition-all relative cursor-pointer ${
                selectedMethod === "card"
                  ? "border-slate-900 bg-slate-50/50 shadow-xs ring-2 ring-slate-900/10"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${selectedMethod === "card" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>
                  <CreditCard className="h-5 w-5" />
                </div>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  +Fee ({money(cardFeeCents)})
                </span>
              </div>
              <div className="font-bold text-slate-900 text-sm">Credit or Debit Card</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Visa, Mastercard, Amex, Discover. Instant authorization.
              </div>
            </button>
          </div>
        </div>

        {/* Selected method dynamic guidance */}
        {selectedMethod === "ach" ? (
          <AchSetupGuide />
        ) : (
          <CardFeeNotice feeCents={cardFeeCents} />
        )}
      </div>
    </PanelShell>
  )
}

/* ------------------------------------------------------------------ */
/* Inline Payment Element form (when publishable key is present)       */
/* ------------------------------------------------------------------ */

function InlinePaymentForm({
  orderId,
  baseCents,
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

  const cardFeeCents = computeCardProcessingFeeCents(baseCents)
  const isCard = methodType === "card"
  const feeCents = isCard ? cardFeeCents : 0
  const totalCents = baseCents + feeCents

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
          acceptedFeeCents: quote?.feeCents ?? (isCard ? cardFeeCents : 0),
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data?.error || "Your payment could not be completed.")
        return
      }

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
      ? `Confirm & Pay ${money(quote.totalCents)}`
      : `Pay ${money(totalCents)}`

  const summary = (
    <div className="flex flex-col h-full gap-5">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Payment Breakdown</h3>
        <dl className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-600">Invoice total</dt>
            <dd className="font-semibold text-slate-900">{money(baseCents)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">
              {isCard ? "Card processing fee (2.9% + $0.30)" : "Processing fee"}
            </dt>
            <dd className={`font-semibold text-right ${isCard ? "text-slate-900" : "text-emerald-700"}`}>
              {isCard ? money(cardFeeCents) : "$0.00 (Free)"}
            </dd>
          </div>
          <div className="flex justify-between items-baseline border-t border-slate-200 pt-3">
            <dt className="font-bold text-slate-900">Total to pay</dt>
            <dd className="text-xl font-black text-slate-900">{money(totalCents)}</dd>
          </div>
        </dl>
      </div>

      {!isCard ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs text-emerald-950 flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            <strong>Zero fees:</strong> You are paying with ACH bank transfer and save <strong>{money(cardFeeCents)}</strong> in card fees.
          </span>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 leading-relaxed">
          Card processing fee of <strong>{money(cardFeeCents)}</strong> added. Select <strong>Bank (ACH)</strong> to pay with $0 fees.
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
          } disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer`}
        >
          {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          {buttonLabel}
        </button>
        {!agreedToTerms && (
          <p className="text-[11px] text-center text-slate-500">Accept the Terms &amp; Conditions above to enable payment.</p>
        )}
        <SecureNote />
      </div>
    </div>
  )

  return (
    <PanelShell baseCents={baseCents} summary={summary}>
      <div className="space-y-5">
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
            if (e.value?.type && e.value.type !== methodType) {
              setMethodType(e.value.type)
              const newFee = e.value.type === "card" ? cardFeeCents : 0
              elements?.update({ amount: baseCents + newFee })
            }
            resetQuote()
          }}
          options={{
            layout: { type: "tabs", defaultCollapsed: false },
            paymentMethodOrder: ["us_bank_account", "card"],
          }}
        />

        {methodType === "us_bank_account" && <AchSetupGuide />}
      </div>
    </PanelShell>
  )
}

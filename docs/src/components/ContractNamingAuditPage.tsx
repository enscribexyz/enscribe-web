import React, { useState } from "react";
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

type FormState = {
    name: string;
    email: string;
    telegram: string;
    message: string;
};

type SiteCustomFields = {
    formspreeUrl?: string;
};

const initialFormState: FormState = {
    name: "",
    email: "",
    telegram: "",
    message: "",
};

const primaryButtonClasses =
    "inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm md:text-base font-semibold text-white transition-transform hover:-translate-y-[1px] disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

const primaryButtonStyle: React.CSSProperties = {
    backgroundColor: "var(--ifm-color-primary)",
    boxShadow: "0 10px 20px rgba(0,0,0,0.25)",
};

export default function ContractNamingAuditPage() {

    const {siteConfig} = useDocusaurusContext();
    const customFields = (siteConfig.customFields ?? {}) as SiteCustomFields;
    const FORMSPREE_URL = customFields.formspreeUrl ?? "";

    const [form, setForm] = useState<FormState>(initialFormState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<null | "success" | "error">(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setStatus(null);
        setErrorMessage(null);
    };

    const validate = () => {
        if (!form.name.trim()) return "Please enter your full name.";
        if (!form.email.trim()) return "Please enter your email address.";
        if (!/\S+@\S+\.\S+/.test(form.email))
            return "Please enter a valid email address.";
        if (!form.message.trim())
            return "Please tell us a bit about your protocol.";
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus(null);
        setErrorMessage(null);

        const validationError = validate();
        if (validationError) {
            setErrorMessage(validationError);
            setStatus("error");
            return;
        }
        if (!FORMSPREE_URL) {
            setStatus("error");
            setErrorMessage(
                "Form endpoint is not configured. Please email hi@enscribe.xyz."
            );
            return;
        }

        try {
            setIsSubmitting(true);

            const response = await fetch(FORMSPREE_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    name: form.name,
                    email: form.email,
                    telegram: form.telegram,
                    message: form.message,
                    source: "Enscribe Audit landing page",
                }),
            });

            if (!response.ok) {
                throw new Error("Form submission failed");
            }

            setStatus("success");
            setForm(initialFormState);
        } catch (err) {
            console.error(err);
            setStatus("error");
            setErrorMessage(
                "Something went wrong sending your message. Please email hi@enscribe.xyz."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main
            className="min-h-screen"
            style={{backgroundColor: "var(--ifm-background-color)"}}
        >
            {/* HERO */}
            <section className="py-20 border-b border-[color:var(--ifm-toc-border-color)]">
                <div
                    className="max-w-5xl mx-auto px-6 flex flex-col gap-10 lg:flex-row lg:items-center">
                    {/* LEFT */}
                    <div className="flex-1">
                        <p className="text-xs font-medium tracking-[0.2em] text-cyan-500 uppercase mb-3">
                            Enscribe Services
                        </p>
                        <h1 className="text-4xl md:text-5xl font-semibold mb-4">
                            Contract Naming Audit Service
                        </h1>
                        <p className="text-lg mb-6 max-w-xl text-[color:var(--ifm-color-emphasis-700)]">
                            Enscribe offers comprehensive naming audits that map out and
                            enable your team to easily name every smart contract for your
                            project, increasing safety and trust for your users.
                        </p>
                        {/*<ul className="space-y-2 mb-8 text-[color:var(--ifm-color-emphasis-600)]">*/}
                        {/*    <li>• Full contract inventory &amp; ENS naming strategy</li>*/}
                        {/*    <li>• Proxy, admin &amp; ownership mapping</li>*/}
                        {/*    <li>• Blog, threads &amp; rollout plan for your launch</li>*/}
                        {/*</ul>*/}

                        <div className="flex flex-wrap gap-3 items-center">
                            <button
                                type="button"
                                className={primaryButtonClasses}
                                style={primaryButtonStyle}
                                onClick={() => {
                                    const el = document.getElementById("contact");
                                    if (el) el.scrollIntoView({behavior: "smooth"});
                                }}
                            >
                                Request Your Naming Audit
                            </button>
                            <span className="text-sm text-[color:var(--ifm-color-emphasis-500)]">
                Prefer email?{" "}
                                <a
                                    href="mailto:hi@enscribe.xyz?subject=Contract%20Naming%20Audit"
                                    className="underline underline-offset-4 text-[color:var(--ifm-color-emphasis-800)]"
                                >
                  hi@enscribe.xyz
                </a>
              </span>
                        </div>
                    </div>

                    {/* RIGHT CARD */}
                    <div className="flex-1">
                        <div
                            className="rounded-xl p-6 md:p-8"
                            style={{
                                backgroundColor: "var(--ifm-card-background-color)",
                                border: "1px solid var(--ifm-color-emphasis-200)",
                                boxShadow: "0 16px 40px rgba(0,0,0,0.06)",
                            }}
                        >
                            <p
                                className="text-sm font-medium mb-4"
                                style={{color: "var(--ifm-color-emphasis-800)"}}
                            >
                                What you get:
                            </p>

                            <ul className="space-y-4 text-sm">
                                <li className="flex items-start gap-3">
                                    <span className="mt-1 h-2 w-2 rounded-full bg-cyan-400"/>
                                    <span style={{color: "var(--ifm-color-emphasis-700)"}}>
                    A complete ENS naming map for your protocol or project.
                  </span>
                                </li>

                                <li className="flex items-start gap-3">
                                    <span className="mt-1 h-2 w-2 rounded-full bg-cyan-400"/>
                                    <span style={{color: "var(--ifm-color-emphasis-700)"}}>
                    Clear proxy/admin visibility to reduce operational and
                    security risk.
                  </span>
                                </li>

                                <li className="flex items-start gap-3">
                                    <span className="mt-1 h-2 w-2 rounded-full bg-cyan-400"/>
                                    <span style={{color: "var(--ifm-color-emphasis-700)"}}>
                    Launch-ready blog post, social copy, and rollout plan to
                    amplify your ENS naming upgrade.
                  </span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            <section
                className="py-16 border-b border-[color:var(--ifm-toc-border-color)]"
                aria-labelledby="audit-logos-title"
            >
                <div className="max-w-5xl mx-auto px-6">
                    <h2
                        id="audit-logos-title"
                        className="text-center text-sm font-medium tracking-wide uppercase mb-8 text-[color:var(--ifm-color-emphasis-500)]"
                    >
                        Trusted by leading projects
                    </h2>

                    <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
                        <a
                            href="/blog/nouns"
                            aria-label="Nouns"
                            className="opacity-80 hover:opacity-100 transition"
                        >
                            <img
                                src="/img/projects/nouns-white.svg"
                                alt="Nouns"
                                className="h-8 md:h-10 object-contain project-logo"
                            />
                        </a>

                        <a
                            href="/blog/liquity"
                            aria-label="Liquity"
                            className="opacity-80 hover:opacity-100 transition"
                        >
                            <img
                                src="/img/projects/liquity-white.png"
                                alt="Liquity"
                                className="h-8 md:h-10 object-contain project-logo"
                            />
                        </a>

                        <a
                            href="/blog/cork"
                            aria-label="Cork"
                            className="opacity-80 hover:opacity-100 transition"
                        >
                            <img
                                src="/img/projects/cork-white.svg"
                                alt="Cork"
                                className="h-8 md:h-10 object-contain project-logo"
                            />
                        </a>

                        <a
                            href="/blog/giveth"
                            aria-label="Giveth"
                            className="opacity-80 hover:opacity-100 transition"
                        >
                            <img
                                src="/img/projects/giveth-white.png"
                                alt="Giveth"
                                className="h-8 md:h-10 object-contain project-logo"
                            />
                        </a>
                    </div>
                </div>
            </section>

            {/* WHAT'S INCLUDED */}
            <section className="py-20 border-b border-[color:var(--ifm-toc-border-color)]">
                <div className="max-w-4xl mx-auto px-6 space-y-12">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-semibold mb-3">
                            What’s Included
                        </h2>
                        <p className="max-w-2xl text-[color:var(--ifm-color-emphasis-600)]">
                            We combine a deep technical naming audit with a full go-to-market
                            package so that your ENS adoption is both structurally sound and
                            highly visible to users, auditors, and partners.
                        </p>
                    </div>

                    <div className="space-y-8">
                        <div>
                            <h3 className="text-xl font-medium mb-2">
                                1. Full Smart Contract Naming Audit
                            </h3>
                            <ul className="list-disc list-inside space-y-1 text-[color:var(--ifm-color-emphasis-600)]">
                                <li>Complete wallet and contract inventory mapping</li>
                                <li>Proxy detection (EIP-1967, Beacon, Minimal, custom)</li>
                                <li>Admin &amp; ownership structure and key roles</li>
                                <li>Recommended ENS names for every contract</li>
                                <li>Structured, ready-to-publish naming audit sheet</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-xl font-medium mb-2">
                                2. ENS Naming Architecture and Implementation
                            </h3>
                            <ul className="list-disc list-inside space-y-1 text-[color:var(--ifm-color-emphasis-600)]">
                                <li>Namespace &amp; subname hierarchy design</li>
                                <li>Cross-chain naming strategy</li>
                                <li>Reverse resolution configuration</li>
                                <li>Guidance or hands-on support for naming rollout</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-xl font-medium mb-2">
                                3. Marketing and Announcements
                            </h3>
                            <ul className="list-disc list-inside space-y-1 text-[color:var(--ifm-color-emphasis-600)]">
                                <li>Rollout plan across your channels and partners</li>
                                <li>Announcement blog post for your site</li>
                                <li>X &amp; LinkedIn posts</li>
                                <li>Key messaging &amp; talking points for your team</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* TESTIMONIALS */}
            {/*  <section*/}
            {/*      className="py-20 border-b border-[color:var(--ifm-toc-border-color)]"*/}
            {/*      aria-labelledby="audit-testimonials-title"*/}
            {/*  >*/}
            {/*      <div className="max-w-4xl mx-auto px-6 space-y-8">*/}
            {/*          <div className="text-left">*/}
            {/*              <h2*/}
            {/*                  id="audit-testimonials-title"*/}
            {/*                  className="text-2xl md:text-3xl font-semibold mb-2"*/}
            {/*              >*/}
            {/*                  What teams are saying*/}
            {/*              </h2>*/}
            {/*              <p className="max-w-2xl text-[color:var(--ifm-color-emphasis-600)]">*/}
            {/*                  Protocol teams use the Enscribe audit to get clearer visibility on their*/}
            {/*                  contract surface area, reduce operational risk, and roll out ENS naming*/}
            {/*                  with confidence.*/}
            {/*              </p>*/}
            {/*          </div>*/}

            {/*          <div className="grid gap-6 md:grid-cols-2">*/}
            {/*              /!* Testimonial 1 *!/*/}
            {/*              <figure*/}
            {/*                  className="h-full rounded-2xl p-6 flex flex-col justify-between"*/}
            {/*                  style={{*/}
            {/*                      backgroundColor: "var(--ifm-card-background-color)",*/}
            {/*                      border: "1px solid var(--ifm-color-emphasis-200)",*/}
            {/*                      boxShadow: "0 14px 32px rgba(0,0,0,0.06)",*/}
            {/*                  }}*/}
            {/*              >*/}
            {/*                  <blockquote*/}
            {/*                      className="text-sm leading-relaxed text-[color:var(--ifm-color-emphasis-700)] mb-4">*/}
            {/*                      “The audit surfaced contracts and admin paths we’d forgotten about*/}
            {/*                      and*/}
            {/*                      gave us a clean ENS naming structure we could ship in a week instead*/}
            {/*                      of a month.”*/}
            {/*                  </blockquote>*/}
            {/*                  <figcaption*/}
            {/*                      className="text-xs text-[color:var(--ifm-color-emphasis-500)]">*/}
            {/*<span className="font-semibold text-[color:var(--ifm-color-emphasis-800)]">*/}
            {/*  Jane Doe*/}
            {/*</span>*/}
            {/*                      <span> · Protocol Lead, Example Finance</span>*/}
            {/*                  </figcaption>*/}
            {/*              </figure>*/}

            {/*              /!* Testimonial 2 *!/*/}
            {/*              <figure*/}
            {/*                  className="h-full rounded-2xl p-6 flex flex-col justify-between"*/}
            {/*                  style={{*/}
            {/*                      backgroundColor: "var(--ifm-card-background-color)",*/}
            {/*                      border: "1px solid var(--ifm-color-emphasis-200)",*/}
            {/*                      boxShadow: "0 14px 32px rgba(0,0,0,0.06)",*/}
            {/*                  }}*/}
            {/*              >*/}
            {/*                  <blockquote*/}
            {/*                      className="text-sm leading-relaxed text-[color:var(--ifm-color-emphasis-700)] mb-4">*/}
            {/*                      “Having a single, well-documented ENS map for all of our contracts*/}
            {/*                      made security reviews and integrations dramatically simpler.”*/}
            {/*                  </blockquote>*/}
            {/*                  <figcaption*/}
            {/*                      className="text-xs text-[color:var(--ifm-color-emphasis-500)]">*/}
            {/*<span className="font-semibold text-[color:var(--ifm-color-emphasis-800)]">*/}
            {/*  Alex Smith*/}
            {/*</span>*/}
            {/*                      <span> · Head of Engineering, Onchain Labs</span>*/}
            {/*                  </figcaption>*/}
            {/*              </figure>*/}
            {/*          </div>*/}

            {/*          /!* Optional: small note *!/*/}
            {/*          <p className="text-xs text-[color:var(--ifm-color-emphasis-500)]">*/}
            {/*              Want to be featured here after your audit? Let us know when we work*/}
            {/*              together.*/}
            {/*          </p>*/}
            {/*      </div>*/}
            {/*  </section>*/}

            {/* CONTACT FORM */}
            <section id="contact" className="py-20">
                <div className="max-w-3xl mx-auto px-6">
                    <div className="mb-8">
                        <h2 className="text-2xl md:text-3xl font-semibold mb-3">
                            Tell us about your protocol
                        </h2>
                        <p className="max-w-xl text-[color:var(--ifm-color-emphasis-600)]">
                            Share a few details and we’ll follow up to discuss
                            your Contract Naming Audit.
                        </p>
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        className="rounded-2xl p-6 md:p-8 space-y-6"
                        style={{
                            backgroundColor: "var(--ifm-card-background-color)",
                            border: "1px solid var(--ifm-color-emphasis-200)",
                            boxShadow: "0 16px 40px rgba(0,0,0,0.06)",
                        }}
                    >
                        {/* Name + Email */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label
                                    htmlFor="name"
                                    className="block text-sm font-medium mb-1 text-[color:var(--ifm-color-emphasis-800)]"
                                >
                                    Full name
                                </label>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    autoComplete="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    className="w-full rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                    style={{
                                        backgroundColor: "var(--ifm-background-surface-color, var(--ifm-card-background-color))",
                                        border: "1px solid var(--ifm-color-emphasis-300)",
                                        color: "var(--ifm-font-color-base)",
                                    }}
                                    placeholder="Vitalik Buterin"
                                />
                            </div>
                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium mb-1 text-[color:var(--ifm-color-emphasis-800)]"
                                >
                                    Email address
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    className="w-full rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                    style={{
                                        backgroundColor: "var(--ifm-background-surface-color, var(--ifm-card-background-color))",
                                        border: "1px solid var(--ifm-color-emphasis-300)",
                                        color: "var(--ifm-font-color-base)",
                                    }}
                                    placeholder="you@protocol.xyz"
                                />
                            </div>
                        </div>

                        {/* Telegram */}
                        <div>
                            <label
                                htmlFor="telegram"
                                className="block text-sm font-medium mb-1 text-[color:var(--ifm-color-emphasis-800)]"
                            >
                                Telegram handle
                            </label>
                            <input
                                id="telegram"
                                name="telegram"
                                type="text"
                                value={form.telegram}
                                onChange={handleChange}
                                className="w-full rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                style={{
                                    backgroundColor: "var(--ifm-background-surface-color, var(--ifm-card-background-color))",
                                    border: "1px solid var(--ifm-color-emphasis-300)",
                                    color: "var(--ifm-font-color-base)",
                                }}
                                placeholder="@yourhandle"
                            />
                        </div>

                        {/* Message */}
                        <div>
                            <label
                                htmlFor="message"
                                className="block text-sm font-medium mb-1 text-[color:var(--ifm-color-emphasis-800)]"
                            >
                                Tell us about your protocol
                            </label>
                            <textarea
                                id="message"
                                name="message"
                                rows={4}
                                value={form.message}
                                onChange={handleChange}
                                className="w-full rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                style={{
                                    backgroundColor: "var(--ifm-background-surface-color, var(--ifm-card-background-color))",
                                    border: "1px solid var(--ifm-color-emphasis-300)",
                                    color: "var(--ifm-font-color-base)",
                                }}
                                placeholder="Share a bit about what you'd like to achieve, current ENS usage (if any), and links to any docs detailing your contract deployments."
                            />
                        </div>

                        {/* Status */}
                        {status === "error" && errorMessage && (
                            <p className="text-sm text-red-500">{errorMessage}</p>
                        )}
                        {status === "success" && (
                            <p className="text-sm text-emerald-500">
                                Thanks for reaching out! We’ve recorded your details and will get
                                back
                                to you shortly.
                            </p>
                        )}

                        {/* Submit */}
                        <div className="flex items-center justify-between gap-4 pt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={primaryButtonClasses}
                                style={primaryButtonStyle}
                            >
                                {isSubmitting ? "Sending…" : "Get in touch"}
                            </button>

                        </div>
                    </form>
                </div>
            </section>
        </main>
    );
}

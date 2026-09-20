"use client";

import { useState } from "react";
import { DemoModeHint } from "@/components/demo-mode-hint";
import { PageHeader } from "@/components/page-header";
import { Toggle } from "@/components/toggle";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const FEED_CATEGORIES = ["Components", "Storage", "Monitors", "Peripherals", "Laptops"];

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-card px-6 py-6">
      <h2 className="text-sm font-semibold">{title}</h2>
      {description ? (
        <p className="mt-1.5 max-w-md text-xs leading-relaxed text-[color:var(--color-text-muted)]">
          {description}
        </p>
      ) : null}
      <div className="mt-5 flex flex-col gap-4">{children}</div>
    </section>
  );
}

function FieldRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-1">
      <div>
        <div className="text-sm">{label}</div>
        {description ? (
          <div className="mt-0.5 text-xs text-[color:var(--color-text-muted)]">{description}</div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [thresholdType, setThresholdType] = useState<"percent" | "absolute">("percent");
  const [thresholdValue, setThresholdValue] = useState(15);
  const [categories, setCategories] = useState<Record<string, boolean>>(
    Object.fromEntries(FEED_CATEGORIES.map((c) => [c, c !== "Laptops"])),
  );
  const [webPush, setWebPush] = useState(true);
  const [email, setEmail] = useState(true);

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Defaults applied to new wishlist items, feeds, and how you hear about a crossing."
      />
      {!isSupabaseConfigured() ? <DemoModeHint className="-mt-4 mb-6" /> : null}

      <div className="flex flex-col gap-6">
        <SettingsSection
          title="Threshold defaults"
          description="Applied when you add an item without setting your own threshold."
        >
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="inline-flex rounded-full border p-1"
              style={{ borderColor: "var(--color-border)" }}
            >
              {(["percent", "absolute"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setThresholdType(type)}
                  className="rounded-full px-3.5 py-1.5 text-sm transition-colors"
                  style={{
                    background: thresholdType === type ? "var(--color-accent-soft)" : "transparent",
                    color:
                      thresholdType === type ? "var(--color-accent)" : "var(--color-text-muted)",
                  }}
                >
                  {type === "percent" ? "Percent off" : "Absolute price"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="threshold-value" className="sr-only">
                Threshold value
              </label>
              <input
                id="threshold-value"
                type="number"
                value={thresholdValue}
                onChange={(e) => setThresholdValue(Number(e.target.value))}
                className="tabular w-20 rounded-lg border bg-transparent px-3 py-1.5 font-mono text-sm outline-none focus-visible:shadow-[0_0_0_3px_var(--color-accent-soft)]"
                style={{ borderColor: "var(--color-border)" }}
              />
              <span className="text-sm text-[color:var(--color-text-muted)]">
                {thresholdType === "percent" ? "% below history" : "USD"}
              </span>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Feed preferences"
          description="Which categories push into your Deals feed."
        >
          {FEED_CATEGORIES.map((category) => (
            <FieldRow key={category} label={category}>
              <Toggle
                checked={categories[category] ?? false}
                onChange={(next) => setCategories((prev) => ({ ...prev, [category]: next }))}
                label={`Toggle ${category} feed preference`}
              />
            </FieldRow>
          ))}
        </SettingsSection>

        <SettingsSection
          title="Notification channels"
          description="Every alert carries a last-checked stamp — data can be up to a day stale."
        >
          <FieldRow
            label="Web push"
            description="Requires adding Deal Brain to your home screen."
          >
            <Toggle checked={webPush} onChange={setWebPush} label="Toggle web push notifications" />
          </FieldRow>
          <FieldRow label="Email" description="you@example.com">
            <Toggle checked={email} onChange={setEmail} label="Toggle email notifications" />
          </FieldRow>
        </SettingsSection>
      </div>
    </div>
  );
}

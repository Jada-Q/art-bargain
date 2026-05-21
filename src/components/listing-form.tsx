'use client';

import { useState, useTransition } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUploadField } from '@/components/image-upload-field';
import type { Locale } from '@/lib/i18n';
import { dictFor } from '@/lib/i18n/client';
import {
  artworkFormSchema,
  AGENT_STYLES,
  PAINTING_MEDIUMS,
  PHOTO_PAPERS,
  POSTER_SIZES,
  crossFieldOk,
  type ArtworkFormInput,
} from '@/lib/schemas/artwork';

const SELECT_CLASS =
  'h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

type SubmitResult = { ok: true; preview: ArtworkFormInput } | { ok: false; error: string };

export function ListingForm({
  action,
  userId,
  locale,
}: {
  action: (data: ArtworkFormInput) => Promise<SubmitResult>;
  userId: string;
  locale: Locale;
}) {
  const t = dictFor(locale).listing_form;
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isValid },
    reset,
  } = useForm<ArtworkFormInput>({
    // Cast to bypass a type mismatch between @hookform/resolvers 5.2 (built against
    // Zod v4.0.x) and Zod v4.4 — the internal _zod.version.minor types differ.
    // Runtime behavior is correct: zodResolver only invokes .safeParse() which
    // every Zod 4 schema implements identically.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(artworkFormSchema as any),
    mode: 'onBlur',
    defaultValues: {
      title: '',
      description: '',
      category: 'poster',
      price_start: 0,
      price_floor: 0,
      image_url: '',
      thumb_url: '',
      category_meta: {
        size: 'A3',
        print_run: 100,
        signed: false,
      },
      seller_agent: {
        style: 'friendly',
        urgency: 3,
        persona_prompt: '',
      },
    },
  });

  const category = useWatch({ control, name: 'category' });
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SubmitResult | null>(null);

  const onSubmit = handleSubmit((data) => {
    if (!crossFieldOk(data)) {
      setResult({ ok: false, error: t.error_floor_above_start });
      return;
    }
    startTransition(async () => {
      const res = await action(data);
      setResult(res);
      if (res.ok) reset();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {/* Image upload */}
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t.section_image}</h2>
        <ImageUploadField
          userId={userId}
          onUploaded={({ image_url, thumb_url }) => {
            setValue('image_url', image_url, { shouldValidate: true });
            setValue('thumb_url', thumb_url, { shouldValidate: true });
          }}
        />
        <input type="hidden" {...register('image_url')} />
        <input type="hidden" {...register('thumb_url')} />
      </section>

      {/* Title + description */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{t.section_listing}</h2>

        <Field label="Title" error={errors.title?.message}>
          <Input {...register('title')} placeholder="e.g. Tokyo Skyline at Dusk" />
        </Field>

        <Field label="Description" error={errors.description?.message}>
          <Textarea {...register('description')} rows={3} />
        </Field>

        <Field label="Category" error={errors.category?.message}>
          <select className={SELECT_CLASS} {...register('category')}>
            <option value="poster">Poster / Print</option>
            <option value="painting">Painting</option>
            <option value="photography">Photography</option>
          </select>
        </Field>
      </section>

      {/* Category-specific meta */}
      <section className="flex flex-col gap-4 rounded-lg border p-4">
        <h3 className="text-sm font-medium">{t.section_category_details}</h3>

        {category === 'poster' && (
          <>
            <Field
              label="Size"
              error={
                (errors.category_meta as Record<string, { message?: string } | undefined>)?.size
                  ?.message
              }
            >
              <select className={SELECT_CLASS} {...register('category_meta.size')}>
                {POSTER_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Print run"
              error={
                (errors.category_meta as Record<string, { message?: string } | undefined>)
                  ?.print_run?.message
              }
            >
              <Input
                type="number"
                min={1}
                {...register('category_meta.print_run', { valueAsNumber: true })}
              />
            </Field>
            <Field label="Signed">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register('category_meta.signed')} />
                Signed by artist
              </label>
            </Field>
            <Field
              label="Edition no. (optional)"
              error={
                (errors.category_meta as Record<string, { message?: string } | undefined>)
                  ?.edition_no?.message
              }
            >
              <Input
                type="number"
                min={1}
                {...register('category_meta.edition_no', {
                  setValueAs: (v) => (v === '' || v === null ? undefined : Number(v)),
                })}
              />
            </Field>
          </>
        )}

        {category === 'painting' && (
          <>
            <Field
              label="Medium"
              error={
                (errors.category_meta as Record<string, { message?: string } | undefined>)?.medium
                  ?.message
              }
            >
              <select className={SELECT_CLASS} {...register('category_meta.medium')}>
                {PAINTING_MEDIUMS.map((m) => (
                  <option key={m} value={m}>
                    {m.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Width (cm)"
                error={
                  (errors.category_meta as Record<string, { message?: string } | undefined>)
                    ?.width_cm?.message
                }
              >
                <Input
                  type="number"
                  min={1}
                  step="0.1"
                  {...register('category_meta.width_cm', { valueAsNumber: true })}
                />
              </Field>
              <Field
                label="Height (cm)"
                error={
                  (errors.category_meta as Record<string, { message?: string } | undefined>)
                    ?.height_cm?.message
                }
              >
                <Input
                  type="number"
                  min={1}
                  step="0.1"
                  {...register('category_meta.height_cm', { valueAsNumber: true })}
                />
              </Field>
            </div>
          </>
        )}

        {category === 'photography' && (
          <>
            <Field
              label="Print size (e.g. A3, 50x75)"
              error={
                (errors.category_meta as Record<string, { message?: string } | undefined>)
                  ?.print_size?.message
              }
            >
              <Input {...register('category_meta.print_size')} placeholder="A3" />
            </Field>
            <Field
              label="Paper"
              error={
                (errors.category_meta as Record<string, { message?: string } | undefined>)?.paper
                  ?.message
              }
            >
              <select className={SELECT_CLASS} {...register('category_meta.paper')}>
                {PHOTO_PAPERS.map((p) => (
                  <option key={p} value={p}>
                    {p.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Edition size (leave blank for open edition)"
              error={
                (errors.category_meta as Record<string, { message?: string } | undefined>)
                  ?.edition_size?.message
              }
            >
              <Controller
                control={control}
                name="category_meta.edition_size"
                render={({ field }) => (
                  <Input
                    type="number"
                    min={1}
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? null : Number(e.target.value))
                    }
                    onBlur={field.onBlur}
                  />
                )}
              />
            </Field>
          </>
        )}
      </section>

      {/* Pricing */}
      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-medium">{t.section_pricing}</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start price" error={errors.price_start?.message}>
            <Input
              type="number"
              min={0}
              step="0.01"
              {...register('price_start', { valueAsNumber: true })}
            />
          </Field>
          <Field label="Floor (agent-only, hidden from buyer)" error={errors.price_floor?.message}>
            <Input
              type="number"
              min={0}
              step="0.01"
              {...register('price_floor', { valueAsNumber: true })}
            />
          </Field>
        </div>
      </section>

      {/* Seller agent config */}
      <section className="flex flex-col gap-4 rounded-lg border p-4">
        <h3 className="text-sm font-medium">{t.section_seller_agent}</h3>
        <Field label="Negotiation style" error={errors.seller_agent?.style?.message}>
          <select className={SELECT_CLASS} {...register('seller_agent.style')}>
            {AGENT_STYLES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Urgency (1-5)" error={errors.seller_agent?.urgency?.message}>
          <Input
            type="number"
            min={1}
            max={5}
            {...register('seller_agent.urgency', { valueAsNumber: true })}
          />
        </Field>
        <Field
          label="Persona prompt (optional)"
          error={errors.seller_agent?.persona_prompt?.message}
        >
          <Textarea
            {...register('seller_agent.persona_prompt')}
            rows={2}
            placeholder="e.g. emphasize the rarity of the signed edition"
          />
        </Field>
      </section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending || !isValid}>
          {isPending ? t.submitting : t.save}
        </Button>
        {result?.ok === true && <span className="text-sm text-emerald-600">{t.saved_message}</span>}
        {result?.ok === false && <span className="text-destructive text-sm">{result.error}</span>}
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

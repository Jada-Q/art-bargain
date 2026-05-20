'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Locale } from '@/lib/i18n';
import { dictFor } from '@/lib/i18n/client';
import { startNegotiation } from '@/app/nego/actions';

export function DispatchModal({
  artworkId,
  priceStart,
  locale,
}: {
  artworkId: string;
  priceStart: number;
  locale: Locale;
}) {
  const t = dictFor(locale).dispatch;
  const [mode, setMode] = useState<'human_vs_agent' | 'agent_vs_agent'>('human_vs_agent');
  const minFirstOffer = Math.ceil(priceStart * 0.7);

  return (
    <Dialog>
      <DialogTrigger
        render={(props) => (
          <button
            {...props}
            data-test-id="start-nego"
            className="bg-foreground text-background hover:bg-foreground/85 inline-flex h-9 w-full items-center justify-center rounded-md px-3 text-sm font-medium"
          >
            {t.start_button}
          </button>
        )}
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description(priceStart, minFirstOffer)}</DialogDescription>
        </DialogHeader>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('human_vs_agent')}
            className={
              'rounded-md border p-3 text-left text-sm ' +
              (mode === 'human_vs_agent' ? 'border-foreground bg-muted' : 'hover:bg-muted/50')
            }
          >
            <div className="font-medium">{t.mode_self}</div>
            <p className="text-muted-foreground mt-1 text-xs">{t.mode_self_body}</p>
          </button>
          <button
            type="button"
            onClick={() => setMode('agent_vs_agent')}
            className={
              'rounded-md border p-3 text-left text-sm ' +
              (mode === 'agent_vs_agent' ? 'border-foreground bg-muted' : 'hover:bg-muted/50')
            }
          >
            <div className="font-medium">{t.mode_agent}</div>
            <p className="text-muted-foreground mt-1 text-xs">{t.mode_agent_body}</p>
          </button>
        </div>

        <form action={startNegotiation} className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="artwork_id" value={artworkId} />
          <input type="hidden" name="mode" value={mode} />

          {mode === 'agent_vs_agent' ? (
            <div className="flex flex-col gap-3 rounded-md border p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="target_price" className="text-xs">{t.target_price}</Label>
                  <Input id="target_price" name="target_price" type="number" min={1}
                    defaultValue={Math.round(priceStart * 0.75)} required />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="max_price" className="text-xs">{t.max_ceiling}</Label>
                  <Input id="max_price" name="max_price" type="number" min={1}
                    defaultValue={Math.round(priceStart * 0.9)} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="style" className="text-xs">{t.style}</Label>
                  <select id="style" name="style" defaultValue="firm"
                    className="border-input bg-background h-9 rounded-md border px-3 text-sm">
                    <option value="firm">firm</option>
                    <option value="friendly">friendly</option>
                    <option value="scholarly">scholarly</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="urgency" className="text-xs">{t.urgency}</Label>
                  <Input id="urgency" name="urgency" type="number" min={1} max={5} defaultValue={3} required />
                </div>
              </div>
              <p className="text-muted-foreground text-xs">{t.hint(minFirstOffer)}</p>
            </div>
          ) : null}

          <Button type="submit" size="lg">
            {mode === 'agent_vs_agent' ? t.submit_agent : t.submit_self}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

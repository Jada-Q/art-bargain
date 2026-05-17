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
import { startNegotiation } from '@/app/nego/actions';

export function DispatchModal({
  artworkId,
  priceStart,
}: {
  artworkId: string;
  priceStart: number;
}) {
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
            Start negotiation
          </button>
        )}
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Choose negotiation mode</DialogTitle>
          <DialogDescription>
            Listed at ${priceStart}. Your opening must be ≥ ${minFirstOffer}.
          </DialogDescription>
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
            <div className="font-medium">Negotiate myself</div>
            <p className="text-muted-foreground mt-1 text-xs">
              You type each turn. Chat with the seller&apos;s agent.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setMode('agent_vs_agent')}
            className={
              'rounded-md border p-3 text-left text-sm ' +
              (mode === 'agent_vs_agent' ? 'border-foreground bg-muted' : 'hover:bg-muted/50')
            }
          >
            <div className="font-medium">Dispatch an agent</div>
            <p className="text-muted-foreground mt-1 text-xs">
              Set target / max / style. Watch both agents negotiate.
            </p>
          </button>
        </div>

        <form action={startNegotiation} className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="artwork_id" value={artworkId} />
          <input type="hidden" name="mode" value={mode} />

          {mode === 'agent_vs_agent' ? (
            <div className="flex flex-col gap-3 rounded-md border p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="target_price" className="text-xs">
                    Target price
                  </Label>
                  <Input
                    id="target_price"
                    name="target_price"
                    type="number"
                    min={1}
                    defaultValue={Math.round(priceStart * 0.75)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="max_price" className="text-xs">
                    Max ceiling
                  </Label>
                  <Input
                    id="max_price"
                    name="max_price"
                    type="number"
                    min={1}
                    defaultValue={Math.round(priceStart * 0.9)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="style" className="text-xs">
                    Style
                  </Label>
                  <select
                    id="style"
                    name="style"
                    className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                    defaultValue="firm"
                  >
                    <option value="firm">firm</option>
                    <option value="friendly">friendly</option>
                    <option value="scholarly">scholarly</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="urgency" className="text-xs">
                    Urgency (1-5)
                  </Label>
                  <Input
                    id="urgency"
                    name="urgency"
                    type="number"
                    min={1}
                    max={5}
                    defaultValue={3}
                    required
                  />
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                Buyer agent opens at ≥ ${minFirstOffer}. Anti-cheese: lowballing rejected.
              </p>
            </div>
          ) : null}

          <Button type="submit" size="lg">
            {mode === 'agent_vs_agent' ? '▶ Dispatch agent' : 'Open chat'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

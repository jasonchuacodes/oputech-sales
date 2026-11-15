'use client'

import { Download, ExternalLink, X } from 'lucide-react'
import { Button } from '@/components'
import {
  ProductTransferStatus,
  ProductTransferType,
  isActiveProductTransfer,
  isCompletedProductTransfer,
} from '@/services/product-transfer/product-transfer.types'
import {
  transferProgress,
  transferProgressDetail,
  transferStatusLabel,
} from './product-transfer-state'
import type { ProductTransfersController } from './useProductTransfers'

interface TransferDockProps {
  controller: ProductTransfersController
}

export const TransferDock = ({ controller }: TransferDockProps) => {
  const {
    job,
    dockVisible,
    uploadProgress,
    downloading,
    openTransfer,
    dismissDock,
    downloadResult,
  } = controller
  if (!job || !dockVisible) return null

  const active = isActiveProductTransfer(job)
  const progress = transferProgress(job, uploadProgress)
  const detail = transferProgressDetail(job, uploadProgress)
  const exportReady =
    job.type === ProductTransferType.Export && isCompletedProductTransfer(job)
  const reviewRequired =
    job.status === ProductTransferStatus.AwaitingConfirmation

  return (
    <aside className="fixed right-6 bottom-6 z-40 hidden w-80 md:block">
      <div className="border-border/60 bg-card shadow-card overflow-hidden rounded-lg border">
        <div className="flex items-start gap-2 p-4">
          <button
            type="button"
            onClick={openTransfer}
            className="focus-visible:ring-ring/30 min-w-0 flex-1 rounded-sm text-left outline-none focus-visible:ring-3"
          >
            <span className="flex items-center justify-between gap-3">
              <span className="font-medium">{transferStatusLabel(job)}</span>
              <ExternalLink className="text-text-tertiary size-4 shrink-0" />
            </span>
            {detail && (
              <span className="text-text-secondary mt-1 block text-sm">
                {detail}
              </span>
            )}
          </button>
          {!active && (
            <button
              type="button"
              aria-label="Dismiss transfer"
              onClick={dismissDock}
              className="text-text-tertiary hover:bg-surface-hover focus-visible:ring-ring/30 flex size-8 shrink-0 items-center justify-center rounded-sm outline-none focus-visible:ring-3"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {active && (
          <div className="px-4 pb-4">
            <div
              className="bg-muted h-1.5 overflow-hidden rounded-full"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div
                className={
                  progress === undefined
                    ? 'bg-primary h-full w-1/3 animate-pulse rounded-full'
                    : 'bg-primary h-full rounded-full transition-[width]'
                }
                style={
                  progress === undefined ? undefined : { width: `${progress}%` }
                }
              />
            </div>
          </div>
        )}
        {(exportReady || reviewRequired) && (
          <div className="border-border flex justify-end border-t p-3">
            {exportReady ? (
              <Button
                size="sm"
                disabled={downloading}
                onClick={() => void downloadResult()}
              >
                <Download />
                Download
              </Button>
            ) : (
              <Button size="sm" onClick={openTransfer}>
                Review import
              </Button>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}

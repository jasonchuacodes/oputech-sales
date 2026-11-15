'use client'

import { Download, FileSpreadsheet, Minus, Upload, X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { Button, Spinner } from '@/components'
import {
  ProductTransferStatus,
  ProductTransferType,
  isActiveProductTransfer,
} from '@/services/product-transfer/product-transfer.types'
import { formatTime } from '@/utils/date'
import { canCancelImport } from './product-transfer-state'
import type { ProductTransfersController } from './useProductTransfers'

interface ImportDialogProps {
  controller: ProductTransfersController
}

const ProgressBar = ({ value }: { value?: number }) => (
  <div
    className="bg-muted h-2 overflow-hidden rounded-full"
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={value}
  >
    <div
      className={
        value === undefined
          ? 'bg-primary h-full w-1/3 animate-pulse rounded-full'
          : 'bg-primary h-full rounded-full transition-[width]'
      }
      style={value === undefined ? undefined : { width: `${value}%` }}
    />
  </div>
)

const Summary = ({
  values,
}: {
  values: Array<{ label: string; value: number }>
}) => (
  <dl className="bg-background grid grid-cols-2 gap-3 rounded-md p-4 text-sm">
    {values.map(({ label, value }) => (
      <div key={label} className="contents">
        <dt className="text-text-secondary">{label}</dt>
        <dd className="text-right font-medium tabular-nums">
          {value.toLocaleString()}
        </dd>
      </div>
    ))}
  </dl>
)

export const ImportDialog = ({ controller }: ImportDialogProps) => {
  const {
    job,
    dialogKind,
    dialogView,
    selectedFile,
    fileError,
    operationError,
    uploadProgress,
    uploading,
    startingImport,
    confirmingImport,
    cancellingImport,
    downloading,
    dismissDialog,
    selectFile,
    beginImport,
    retryUpload,
    cancelImport,
    confirmImport,
    downloadErrorReport,
  } = controller
  const open = dialogKind === ProductTransferType.Import
  const currentJob =
    dialogView === 'job' && job?.type === ProductTransferType.Import
      ? job
      : null
  const active = isActiveProductTransfer(currentJob)
  const DismissIcon = active ? Minus : X
  const dismissLabel = active ? 'Minimize transfer' : 'Close'
  const showErrorReport =
    !!currentJob &&
    (currentJob.skippedRows > 0 ||
      currentJob.status === ProductTransferStatus.ValidationFailed)

  const renderBody = () => {
    if (!currentJob) {
      return (
        <div className="flex flex-col gap-4">
          <div className="bg-background rounded-md p-4 text-sm">
            <p className="font-medium">Workbook requirements</p>
            <ul className="text-text-secondary mt-2 list-disc space-y-1 pl-5">
              <li>.xlsx file, up to 5 MiB and 5,000 product rows</li>
              <li>One worksheet named Products</li>
              <li>Product ID, Product Name, Price, Unit, Quantity columns</li>
            </ul>
          </div>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Select workbook
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="border-border bg-card file:bg-surface file:text-foreground focus-visible:border-ring focus-visible:ring-ring/30 h-11 rounded-md border px-3 py-2 text-sm file:mr-3 file:rounded-sm file:border-0 file:px-2 file:py-1 file:font-medium focus-visible:ring-3 focus-visible:outline-none"
              onChange={(event) => selectFile(event.target.files?.[0])}
            />
          </label>
          {selectedFile && !fileError && (
            <p className="text-text-secondary text-sm">
              {selectedFile.name} · {(selectedFile.size / 1024).toFixed(1)} KiB
            </p>
          )}
          {fileError && <p className="text-destructive text-sm">{fileError}</p>}
        </div>
      )
    }

    switch (currentJob.status) {
      case ProductTransferStatus.AwaitingUpload:
        return (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="text-primary size-8" />
              <div>
                <p className="font-medium">
                  {uploading
                    ? 'Uploading workbook…'
                    : 'Workbook upload interrupted'}
                </p>
                <p className="text-text-secondary text-sm">
                  {uploading
                    ? `${uploadProgress}% uploaded`
                    : 'Retry the upload or cancel this import and start again.'}
                </p>
              </div>
            </div>
            <ProgressBar value={uploading ? uploadProgress : 0} />
            {!uploading && selectedFile && (
              <Button variant="outline" onClick={() => void retryUpload()}>
                <Upload />
                Retry upload
              </Button>
            )}
          </div>
        )
      case ProductTransferStatus.QueuedForValidation:
      case ProductTransferStatus.Validating: {
        const validationQueued =
          currentJob.status === ProductTransferStatus.QueuedForValidation
        return (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Spinner />
              <div>
                <p className="font-medium">
                  {validationQueued
                    ? 'Validation queued'
                    : 'Validating workbook…'}
                </p>
                <p className="text-text-secondary text-sm">
                  {validationQueued
                    ? 'Waiting for the background worker to start.'
                    : 'Checking product matches, prices, units, and quantities.'}
                </p>
              </div>
            </div>
            <ProgressBar />
            <p className="text-text-tertiary text-sm">
              You can minimize this dialog while validation continues.
            </p>
          </div>
        )
      }
      case ProductTransferStatus.AwaitingConfirmation:
        return (
          <div className="flex flex-col gap-4">
            <div>
              <p className="font-medium">Review validation results</p>
              <p className="text-text-secondary mt-1 text-sm">
                Only eligible rows will be imported. Existing product names and
                prices are not changed.
              </p>
            </div>
            <Summary
              values={[
                { label: 'Total rows', value: currentJob.totalRows },
                { label: 'Eligible', value: currentJob.eligibleRows },
                { label: 'Skipped', value: currentJob.skippedRows },
              ]}
            />
            {showErrorReport && (
              <Button
                variant="outline"
                disabled={downloading}
                onClick={() => void downloadErrorReport()}
              >
                <Download />
                Download error report
              </Button>
            )}
          </div>
        )
      case ProductTransferStatus.QueuedForImport:
      case ProductTransferStatus.Importing: {
        const importQueued =
          currentJob.status === ProductTransferStatus.QueuedForImport
        const progress = currentJob.eligibleRows
          ? Math.round((currentJob.appliedRows / currentJob.eligibleRows) * 100)
          : 0
        return (
          <div className="flex flex-col gap-4">
            <div>
              <p className="font-medium">
                {importQueued ? 'Import queued' : 'Importing products…'}
              </p>
              <p className="text-text-secondary text-sm">
                {importQueued
                  ? 'Waiting for the background worker to start.'
                  : `${currentJob.appliedRows.toLocaleString()} of ${currentJob.eligibleRows.toLocaleString()} rows applied`}
              </p>
            </div>
            <ProgressBar value={progress} />
            <Summary
              values={[
                { label: 'Created', value: currentJob.createdCount },
                { label: 'Stock updated', value: currentJob.updatedCount },
                { label: 'Unchanged', value: currentJob.unchangedCount },
                { label: 'Skipped', value: currentJob.skippedRows },
              ]}
            />
            <p className="text-text-tertiary text-sm">
              You can minimize this dialog while the import continues.
            </p>
          </div>
        )
      }
      default:
        return (
          <div className="flex flex-col gap-4">
            <div>
              <p className="font-medium">
                {currentJob.status === ProductTransferStatus.Completed
                  ? 'Import complete'
                  : currentJob.status ===
                      ProductTransferStatus.CompletedWithSkips
                    ? 'Import complete with skipped rows'
                    : currentJob.status === ProductTransferStatus.Cancelled
                      ? 'Import cancelled'
                      : 'Import could not be completed'}
              </p>
              {currentJob.completedAt && (
                <p className="text-text-secondary mt-1 text-sm">
                  {formatTime(currentJob.completedAt, 'MMM D, YYYY, h:mm A')}
                </p>
              )}
            </div>
            <Summary
              values={[
                { label: 'Applied', value: currentJob.appliedRows },
                { label: 'Created', value: currentJob.createdCount },
                { label: 'Stock updated', value: currentJob.updatedCount },
                { label: 'Unchanged', value: currentJob.unchangedCount },
                { label: 'Skipped', value: currentJob.skippedRows },
              ]}
            />
            {currentJob.failureMessage && (
              <p className="text-destructive text-sm">
                {currentJob.failureMessage}
              </p>
            )}
            {showErrorReport && (
              <Button
                variant="outline"
                disabled={downloading}
                onClick={() => void downloadErrorReport()}
              >
                <Download />
                Download error report
              </Button>
            )}
          </div>
        )
    }
  }

  const renderFooter = () => {
    if (!currentJob) {
      return (
        <>
          <Button variant="outline" onClick={dismissDialog}>
            Cancel
          </Button>
          <Button
            disabled={!selectedFile || !!fileError || startingImport}
            onClick={() => void beginImport()}
          >
            {startingImport && <Spinner size="xs" variant="current" />}
            Upload and validate
          </Button>
        </>
      )
    }
    if (currentJob.status === ProductTransferStatus.AwaitingConfirmation) {
      return (
        <>
          <Button
            variant="destructive"
            disabled={cancellingImport}
            onClick={() => void cancelImport()}
          >
            Cancel import
          </Button>
          <Button
            disabled={confirmingImport}
            onClick={() => void confirmImport()}
          >
            {confirmingImport && <Spinner size="xs" variant="current" />}
            Import {currentJob.eligibleRows.toLocaleString()} rows
          </Button>
        </>
      )
    }
    if (canCancelImport(currentJob)) {
      return (
        <Button
          variant="destructive"
          disabled={cancellingImport}
          onClick={() => void cancelImport()}
        >
          Cancel import
        </Button>
      )
    }
    if (!active) {
      return <Button onClick={dismissDialog}>Close</Button>
    }
    return null
  }

  const footer = renderFooter()

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && dismissDialog()}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="bg-foreground/50 fixed inset-0 z-50 backdrop-blur-sm" />
        <Dialog.Content className="bg-card fixed top-1/2 left-1/2 z-60 flex max-h-[85vh] w-[calc(100%-3rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg shadow-lg outline-none">
          <header className="flex items-start gap-3 p-5 pb-4">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-lg font-semibold">
                Import products
              </Dialog.Title>
              <Dialog.Description className="text-text-secondary mt-1 text-sm">
                Upload and validate an Excel workbook before applying changes.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label={dismissLabel}
                title={active ? 'Minimize' : 'Close'}
                className="text-text-secondary hover:bg-surface-hover focus-visible:ring-ring/30 flex size-10 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-3"
              >
                <DismissIcon className="size-5" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
            {renderBody()}
            {operationError && (
              <p className="text-destructive mt-4 text-sm">{operationError}</p>
            )}
          </div>
          {footer && (
            <footer className="border-border flex shrink-0 items-center justify-end gap-3 border-t p-4">
              {footer}
            </footer>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

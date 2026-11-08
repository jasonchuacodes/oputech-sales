import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil } from 'lucide-react'
import {
  CustomModal,
  Input,
  Label,
  ImageDropzone,
} from '../../../components'
import { useUpdateProduct } from '../../../services/product/product.queries'
import { Product } from '../../../services/product/product.types'
import {
  EditProductInput,
  EditProductSchema,
} from '../schemas/edit-product.schema'
import { NumberInput } from '../../../components/ui/number-input'

interface Props {
  item: Product | null
  open: boolean
  onClose: () => void
}

export const EditItemModal = ({ item, open, onClose }: Props) => {
  const updateItem = useUpdateProduct()
  const [imageError, setImageError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isValid },
  } = useForm<EditProductInput>({
    resolver: zodResolver(EditProductSchema),
    defaultValues: item
      ? {
          name: item.name,
          price: item.price,
          imageUrl: item.imageUrl,
          printCount: item.printCount,
        }
      : undefined,
  })

  const handleClose = () => {
    onClose()
    reset()
    setImageError(null)
  }

  const onSubmit = (data: EditProductInput) => {
    if (!item) return
    updateItem.mutate(
      {
        id: item.id,
        input: {
          name: data.name,
          price: data.price,
          imageUrl: data.imageUrl ?? '',
          printCount: data.printCount,
        },
      },
      { onSuccess: handleClose }
    )
  }

  return (
    <CustomModal
      open={open}
      title="Edit Item"
      subheader="Update item details."
      icon={Pencil}
      submitText="Save"
      loading={updateItem.isPending}
      onClose={handleClose}
      onSubmit={handleSubmit(onSubmit)}
      disabled={!isValid}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Controller
            name="imageUrl"
            control={control}
            render={({ field }) => (
              <ImageDropzone
                value={field.value ?? ''}
                onChange={(value) => {
                  setImageError(null)
                  field.onChange(value)
                }}
                onError={setImageError}
              />
            )}
          />
          {imageError && (
            <p className="text-destructive text-xs">{imageError}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-name">Name</Label>
          <Input
            id="edit-name"
            placeholder="e.g. Wireless Mouse"
            aria-invalid={!!errors.name}
            {...register('name')}
          />
          {errors.name && (
            <p className="text-destructive text-xs">{errors.name.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-price">Price</Label>
          <NumberInput name="price" control={control} step={0.1} min={0} />

          {errors.price && (
            <p className="text-destructive text-xs">{errors.price.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-printCount">Print Count</Label>
          <NumberInput name="printCount" control={control} step={1} min={0} />
          {errors.printCount && (
            <p className="text-destructive text-xs">
              {errors.printCount.message}
            </p>
          )}
        </div>
      </div>
    </CustomModal>
  )
}

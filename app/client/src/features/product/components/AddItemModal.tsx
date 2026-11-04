import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PackagePlus } from 'lucide-react'
import {
  CustomModal,
  Input,
  Label,
  SheetSelect,
  ImageDropzone,
} from '../../../components'
import { NumberInput } from '../../../components/ui/number-input'
import { useCreateProduct } from '../../../services/product/product.queries'
import {
  AddProductSchema,
  AddProductInput,
} from '../schemas/add-product.schema'

interface Props {
  open: boolean
  onClose: () => void
}

export const AddItemModal = ({ open, onClose }: Props) => {
  const createItem = useCreateProduct()
  const [imageError, setImageError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<AddProductInput>({
    defaultValues: { category: 'main', price: 0, printCount: 0 },
    resolver: zodResolver(AddProductSchema),
  })

  const handleClose = () => {
    onClose()
    reset()
    setImageError(null)
  }

  const onSubmit = (data: AddProductInput) => {
    createItem.mutate(
      {
        name: data.name,
        price: data.price,
        imageUrl: data.imageUrl,
        printCount: data.printCount,
        category: data.category,
      },
      { onSuccess: handleClose }
    )
  }

  return (
    <CustomModal
      open={open}
      title="Add Item"
      subheader="Add a new item to your inventory."
      icon={PackagePlus}
      submitText="Add Item"
      loading={createItem.isPending}
      onClose={handleClose}
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Controller
            name="imageUrl"
            control={control}
            render={({ field }) => (
              <ImageDropzone
                value={field.value}
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
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            placeholder="e.g. Wireless Mouse"
            aria-invalid={!!errors.name}
            {...register('name')}
          />
          {errors.name && (
            <p className="text-destructive text-xs">{errors.name.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price">Price *</Label>
          <NumberInput name="price" control={control} step={0.01} min={0} />
          {errors.price && (
            <p className="text-destructive text-xs">{errors.price.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="printCount">Print Count</Label>
          <NumberInput name="printCount" control={control} step={1} min={0} />
          {errors.printCount && (
            <p className="text-destructive text-xs">
              {errors.printCount.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Category *</Label>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <SheetSelect
                value={field.value}
                onValueChange={field.onChange}
                title="Choose a category"
                placeholder="Select a category…"
                options={[
                  { value: 'main', label: 'Main' },
                  { value: 'add-on', label: 'Add-on' },
                ]}
              />
            )}
          />
        </div>
      </div>
    </CustomModal>
  )
}

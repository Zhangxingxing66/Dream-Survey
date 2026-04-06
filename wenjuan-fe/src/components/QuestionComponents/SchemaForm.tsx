import React, { FC, useEffect } from 'react'
import { Button, Checkbox, Form, Input, Select, Space } from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { nanoid } from 'nanoid'

const { TextArea } = Input

export type SchemaOptionType = {
  label: string
  value: string | number
}

type BaseFieldType = {
  name: string
  label: string
  required?: boolean
  placeholder?: string
}

export type ComponentPropFieldType =
  | (BaseFieldType & {
      kind: 'input'
    })
  | (BaseFieldType & {
      kind: 'textarea'
      rows?: number
    })
  | (BaseFieldType & {
      kind: 'select'
      options?: SchemaOptionType[]
      optionSourceField?: string
      optionLabelKey?: string
      optionValueKey?: string
    })
  | {
      kind: 'checkbox'
      name: string
      label: string
    }
  | (BaseFieldType & {
      kind: 'radioOptions'
      min?: number
      addButtonText?: string
    })
  | (BaseFieldType & {
      kind: 'checkboxOptions'
      min?: number
      addButtonText?: string
    })

type PropsType = {
  fields: ComponentPropFieldType[]
  value: Record<string, any>
  disabled?: boolean
  onChange?: (value: Record<string, any>) => void
  normalizeValue?: (value: Record<string, any>) => Record<string, any>
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function normalizeFieldValue(field: ComponentPropFieldType, values: Record<string, any>) {
  const nextValues = cloneValue(values)

  if (field.kind === 'radioOptions') {
    const options = Array.isArray(nextValues[field.name]) ? nextValues[field.name] : []
    nextValues[field.name] = options
      .filter((item: any) => item && typeof item.text === 'string' && item.text.trim())
      .map((item: any) => ({
        ...item,
        text: item.text.trim(),
        value: item.value || nanoid(5),
      }))

    if (
      nextValues.value &&
      !nextValues[field.name].some((item: any) => item.value === nextValues.value)
    ) {
      nextValues.value = ''
    }
  }

  if (field.kind === 'checkboxOptions') {
    const list = Array.isArray(nextValues[field.name]) ? nextValues[field.name] : []
    nextValues[field.name] = list
      .filter((item: any) => item && typeof item.text === 'string' && item.text.trim())
      .map((item: any) => ({
        ...item,
        text: item.text.trim(),
        value: item.value || nanoid(5),
        checked: Boolean(item.checked),
      }))
  }

  return nextValues
}

const SelectWithDynamicOptions: FC<{
  field: Extract<ComponentPropFieldType, { kind: 'select' }>
  disabled?: boolean
  form: any
}> = ({ field, disabled, form }) => {
  const watchedOptions = Form.useWatch(field.optionSourceField || '', form)

  let options = field.options || []
  if (field.optionSourceField) {
    const list = Array.isArray(watchedOptions) ? watchedOptions : []
    const labelKey = field.optionLabelKey || 'text'
    const valueKey = field.optionValueKey || 'value'
    options = list
      .filter((item: any) => item && item[valueKey] != null)
      .map((item: any) => ({
        label: String(item[labelKey] || ''),
        value: item[valueKey],
      }))
  }

  return (
    <Form.Item
      label={field.label}
      name={field.name}
      rules={field.required ? [{ required: true, message: `Please enter ${field.label}` }] : []}
    >
      <Select disabled={disabled} options={options} />
    </Form.Item>
  )
}

function renderOptionList(
  field: Extract<ComponentPropFieldType, { kind: 'radioOptions' | 'checkboxOptions' }>,
  disabled: boolean | undefined
) {
  const min = field.min ?? (field.kind === 'radioOptions' ? 2 : 1)

  return (
    <Form.Item label={field.label}>
      <Form.List name={field.name}>
        {(fields, { add, remove }) => (
          <>
            {fields.map(({ key, name }, index) => (
              <Space key={key} align="baseline">
                {field.kind === 'checkboxOptions' && (
                  <Form.Item name={[name, 'checked']} valuePropName="checked">
                    <Checkbox disabled={disabled} />
                  </Form.Item>
                )}
                <Form.Item
                  name={[name, 'text']}
                  rules={[{ required: true, message: `Please enter ${field.label}` }]}
                >
                  <Input disabled={disabled} placeholder={`Enter ${field.label.toLowerCase()}...`} />
                </Form.Item>
                {index + 1 > min && (
                  <MinusCircleOutlined
                    onClick={() => {
                      if (!disabled) remove(name)
                    }}
                  />
                )}
              </Space>
            ))}
            <Form.Item>
              <Button
                type="link"
                disabled={disabled}
                onClick={() =>
                  add(
                    field.kind === 'checkboxOptions'
                      ? { text: '', value: '', checked: false }
                      : { text: '', value: '' }
                  )
                }
                icon={<PlusOutlined />}
                block
              >
                {field.addButtonText || `Add ${field.label}`}
              </Button>
            </Form.Item>
          </>
        )}
      </Form.List>
    </Form.Item>
  )
}

const SchemaForm: FC<PropsType> = ({ fields, value, disabled, onChange, normalizeValue }) => {
  const [form] = Form.useForm()

  useEffect(() => {
    form.setFieldsValue(value)
  }, [form, value])

  function handleValuesChange() {
    if (!onChange) return

    let nextValues = form.getFieldsValue(true)
    fields.forEach(field => {
      nextValues = normalizeFieldValue(field, nextValues)
    })
    if (normalizeValue) {
      nextValues = normalizeValue(nextValues)
    }

    form.setFieldsValue(nextValues)
    onChange(nextValues)
  }

  return (
    <Form
      layout="vertical"
      initialValues={value}
      form={form}
      onValuesChange={handleValuesChange}
      disabled={disabled}
    >
      {fields.map(field => {
        if (field.kind === 'input') {
          return (
            <Form.Item
              key={field.name}
              label={field.label}
              name={field.name}
              rules={field.required ? [{ required: true, message: `Please enter ${field.label}` }] : []}
            >
              <Input placeholder={field.placeholder} />
            </Form.Item>
          )
        }

        if (field.kind === 'textarea') {
          return (
            <Form.Item
              key={field.name}
              label={field.label}
              name={field.name}
              rules={field.required ? [{ required: true, message: `Please enter ${field.label}` }] : []}
            >
              <TextArea rows={field.rows || 4} placeholder={field.placeholder} />
            </Form.Item>
          )
        }

        if (field.kind === 'checkbox') {
          return (
            <Form.Item key={field.name} name={field.name} valuePropName="checked">
              <Checkbox>{field.label}</Checkbox>
            </Form.Item>
          )
        }

        if (field.kind === 'select') {
          return <SelectWithDynamicOptions key={field.name} field={field} disabled={disabled} form={form} />
        }

        if (field.kind === 'radioOptions' || field.kind === 'checkboxOptions') {
          return <React.Fragment key={field.name}>{renderOptionList(field, disabled)}</React.Fragment>
        }

        return null
      })}
    </Form>
  )
}

export default SchemaForm

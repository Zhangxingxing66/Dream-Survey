import type { FC } from 'react'
import QuestionInputComponent from './QuestionInput/Component'
import QuestionTitleComponent from './QuestionTitle/Component'
import QuestionParagraphComponent from './QuestionParagraph/Component'
import QuestionInfoComponent from './QuestionInfo/Component'
import QuestionTextareaComponent from './QuestionTextarea/Component'
import QuestionRadioComponent from './QuestionRadio/Component'
import QuestionCheckboxComponent from './QuestionCheckbox/Component'
import QuestionRadioStatComponent from './QuestionRadio/StatComponent'
import QuestionCheckboxStatComponent from './QuestionCheckbox/StatComponent'
import { QuestionInputDefaultProps } from './QuestionInput/interface'
import { QuestionTitleDefaultProps } from './QuestionTitle/interface'
import { QuestionParagraphDefaultProps } from './QuestionParagraph/interface'
import { QuestionInfoDefaultProps } from './QuestionInfo/interface'
import { QuestionTextareaDefaultProps } from './QuestionTextarea/interface'
import { QuestionRadioDefaultProps } from './QuestionRadio/interface'
import { QuestionCheckboxDefaultProps } from './QuestionCheckbox/interface'
import type { ComponentPropFieldType } from './SchemaForm'

export type ComponentPropsType = Record<string, any>

export type ComponentStatPropsType = {
  stat: Array<{ name: string; count: number }>
}

export type ComponentConfType = {
  title: string
  type: string
  groupId: string
  groupName: string
  Component: FC<ComponentPropsType>
  defaultProps: ComponentPropsType
  propSchema: ComponentPropFieldType[]
  normalizeProps?: (props: ComponentPropsType) => ComponentPropsType
  StatComponent?: FC<ComponentStatPropsType>
}

export type ComponentGroupType = {
  groupId: string
  groupName: string
  components: ComponentConfType[]
}

const componentConfList: ComponentConfType[] = [
  {
    title: 'Question Info',
    type: 'questionInfo',
    groupId: 'display',
    groupName: 'Display',
    Component: QuestionInfoComponent,
    defaultProps: QuestionInfoDefaultProps,
    propSchema: [
      { kind: 'input', name: 'title', label: 'Title', required: true, placeholder: 'Survey title' },
      { kind: 'textarea', name: 'desc', label: 'Description', placeholder: 'Survey description' },
    ],
  },
  {
    title: 'Heading',
    type: 'questionTitle',
    groupId: 'display',
    groupName: 'Display',
    Component: QuestionTitleComponent,
    defaultProps: QuestionTitleDefaultProps,
    propSchema: [
      { kind: 'input', name: 'text', label: 'Text', required: true, placeholder: 'Heading text' },
      {
        kind: 'select',
        name: 'level',
        label: 'Level',
        options: [
          { label: 'H1', value: 1 },
          { label: 'H2', value: 2 },
          { label: 'H3', value: 3 },
        ],
      },
      { kind: 'checkbox', name: 'isCenter', label: 'Center align' },
    ],
  },
  {
    title: 'Paragraph',
    type: 'questionParagraph',
    groupId: 'display',
    groupName: 'Display',
    Component: QuestionParagraphComponent,
    defaultProps: QuestionParagraphDefaultProps,
    propSchema: [
      { kind: 'textarea', name: 'text', label: 'Text', required: true, placeholder: 'Paragraph content' },
      { kind: 'checkbox', name: 'isCenter', label: 'Center align' },
    ],
  },
  {
    title: 'Input',
    type: 'questionInput',
    groupId: 'input',
    groupName: 'Input',
    Component: QuestionInputComponent,
    defaultProps: QuestionInputDefaultProps,
    propSchema: [
      { kind: 'input', name: 'title', label: 'Title', required: true, placeholder: 'Question title' },
      { kind: 'input', name: 'placeholder', label: 'Placeholder', placeholder: 'Placeholder' },
    ],
  },
  {
    title: 'Textarea',
    type: 'questionTextarea',
    groupId: 'input',
    groupName: 'Input',
    Component: QuestionTextareaComponent,
    defaultProps: QuestionTextareaDefaultProps,
    propSchema: [
      { kind: 'input', name: 'title', label: 'Title', required: true, placeholder: 'Question title' },
      { kind: 'input', name: 'placeholder', label: 'Placeholder', placeholder: 'Placeholder' },
    ],
  },
  {
    title: 'Single Choice',
    type: 'questionRadio',
    groupId: 'choice',
    groupName: 'Choice',
    Component: QuestionRadioComponent,
    defaultProps: QuestionRadioDefaultProps,
    StatComponent: QuestionRadioStatComponent,
    propSchema: [
      { kind: 'input', name: 'title', label: 'Title', required: true, placeholder: 'Question title' },
      { kind: 'radioOptions', name: 'options', label: 'Options', min: 2, addButtonText: 'Add option' },
      {
        kind: 'select',
        name: 'value',
        label: 'Default Value',
        optionSourceField: 'options',
        optionLabelKey: 'text',
        optionValueKey: 'value',
      },
      { kind: 'checkbox', name: 'isVertical', label: 'Vertical layout' },
    ],
  },
  {
    title: 'Multiple Choice',
    type: 'questionCheckbox',
    groupId: 'choice',
    groupName: 'Choice',
    Component: QuestionCheckboxComponent,
    defaultProps: QuestionCheckboxDefaultProps,
    StatComponent: QuestionCheckboxStatComponent,
    propSchema: [
      { kind: 'input', name: 'title', label: 'Title', required: true, placeholder: 'Question title' },
      {
        kind: 'checkboxOptions',
        name: 'list',
        label: 'Options',
        min: 1,
        addButtonText: 'Add option',
      },
      { kind: 'checkbox', name: 'isVertical', label: 'Vertical layout' },
    ],
  },
]

const componentGroupList = componentConfList.reduce<ComponentGroupType[]>((result, component) => {
  const currentGroup = result.find(item => item.groupId === component.groupId)
  if (currentGroup) {
    currentGroup.components.push(component)
    return result
  }

  result.push({
    groupId: component.groupId,
    groupName: component.groupName,
    components: [component],
  })

  return result
}, [])

export const componentConfGroup = componentGroupList

export function getComponentConfByType(type: string) {
  return componentConfList.find(component => component.type === type)
}

export function getComponentConfList() {
  return componentConfList
}

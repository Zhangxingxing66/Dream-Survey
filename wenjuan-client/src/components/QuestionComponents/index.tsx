import React from 'react'
import QuestionInput from './QuestionInput'
import QuestionRadio from './QuestionRadio'
import QuestionTitle from './QuestionTitle'
import QuestionParagraph from './QuestionParagraph'
import QuestionInfo from './QuestionInfo'
import QuestionTextarea from './QuestionTextarea'
import QuestionCheckbox from './QuestionCheckbox'

type ComponentInfoType = {
  fe_id: string
  type: string
  isHidden?: boolean
  props: Record<string, any>
}

type ClientComponentRegistryItem = {
  type: string
  render: (component: ComponentInfoType) => JSX.Element | null
}

const clientComponentRegistry: ClientComponentRegistryItem[] = [
  {
    type: 'questionInput',
    render: component => <QuestionInput fe_id={component.fe_id} props={component.props as any} />,
  },
  {
    type: 'questionRadio',
    render: component => <QuestionRadio fe_id={component.fe_id} props={component.props as any} />,
  },
  {
    type: 'questionTitle',
    render: component => <QuestionTitle {...(component.props as any)} />,
  },
  {
    type: 'questionParagraph',
    render: component => <QuestionParagraph {...(component.props as any)} />,
  },
  {
    type: 'questionInfo',
    render: component => <QuestionInfo {...(component.props as any)} />,
  },
  {
    type: 'questionTextarea',
    render: component => <QuestionTextarea fe_id={component.fe_id} props={component.props as any} />,
  },
  {
    type: 'questionCheckbox',
    render: component => <QuestionCheckbox fe_id={component.fe_id} props={component.props as any} />,
  },
]

export function getClientComponentByType(type: string) {
  return clientComponentRegistry.find(item => item.type === type)
}

export const getComponent = (component: ComponentInfoType) => {
  const { type, isHidden } = component

  if (isHidden) return null

  const registryItem = getClientComponentByType(type)
  if (!registryItem) return null

  return registryItem.render(component)
}

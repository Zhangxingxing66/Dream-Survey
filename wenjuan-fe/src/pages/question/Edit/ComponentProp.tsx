import React, { FC } from 'react'
import { useDispatch } from 'react-redux'
import useGetComponentInfo from '../../../hooks/useGetComponentInfo'
import { getComponentConfByType, ComponentPropsType } from '../../../components/QuestionComponents'
import SchemaForm from '../../../components/QuestionComponents/SchemaForm'
import { changeComponentProps } from '../../../store/componentsReducer'

const NoProp: FC = () => {
  return <div style={{ textAlign: 'center' }}>No component selected</div>
}

const ComponentProp: FC = () => {
  const dispatch = useDispatch()

  const { selectedComponent } = useGetComponentInfo()
  if (selectedComponent == null) return <NoProp />

  const { type, props, isLocked, isHidden } = selectedComponent
  const componentConf = getComponentConfByType(type)
  if (componentConf == null) return <NoProp />

  function changeProps(newProps: ComponentPropsType) {
    if (selectedComponent == null) return
    const { fe_id } = selectedComponent
    dispatch(changeComponentProps({ fe_id, newProps }))
  }

  return (
    <SchemaForm
      fields={componentConf.propSchema}
      value={props}
      onChange={changeProps}
      normalizeValue={componentConf.normalizeProps}
      disabled={isLocked || isHidden}
    />
  )
}

export default ComponentProp

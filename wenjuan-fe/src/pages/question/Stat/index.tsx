import React, { FC, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Spin, Result, Button } from 'antd'
import { useTitle } from 'ahooks'
import useLoadQuestionData from '../../../hooks/useLoadQuestionData'
import useGetPageInfo from '../../../hooks/useGetPageInfo'
import StatHeader from './StatHeader'
import ComponentList from './ComponentList'
import PageStat from './PageStat'
import ChartStat from './ChartStat'
import styles from './index.module.scss'

const Stat: FC = () => {
  const nav = useNavigate()
  const { loading } = useLoadQuestionData('published')
  const { title, isPublished } = useGetPageInfo()

  const [selectedComponentId, setSelectedComponentId] = useState('')
  const [selectedComponentType, setSelectedComponentType] = useState('')

  useTitle(`闂嵎缁熻 - ${title}`)

  const loadingElem = (
    <div style={{ textAlign: 'center', marginTop: '60px' }}>
      <Spin />
    </div>
  )

  function genContentElem() {
    if (typeof isPublished === 'boolean' && !isPublished) {
      return (
        <div style={{ flex: '1' }}>
          <Result
            status="warning"
            title="璇ラ〉闈㈠皻鏈彂甯?"
            extra={
              <Button type="primary" onClick={() => nav(-1)}>
                杩斿洖
              </Button>
            }
          />
        </div>
      )
    }

    return (
      <>
        <div className={styles.left}>
          <ComponentList
            selectedComponentId={selectedComponentId}
            setSelectedComponentId={setSelectedComponentId}
            setSelectedComponentType={setSelectedComponentType}
          />
        </div>
        <div className={styles.main}>
          <PageStat
            selectedComponentId={selectedComponentId}
            setSelectedComponentId={setSelectedComponentId}
            setSelectedComponentType={setSelectedComponentType}
          />
        </div>
        <div className={styles.right}>
          <ChartStat
            selectedComponentId={selectedComponentId}
            selectedComponentType={selectedComponentType}
          />
        </div>
      </>
    )
  }

  return (
    <div className={styles.container}>
      <StatHeader />
      <div className={styles['content-wrapper']}>
        {loading && loadingElem}
        {!loading && <div className={styles.content}>{genContentElem()}</div>}
      </div>
    </div>
  )
}

export default Stat

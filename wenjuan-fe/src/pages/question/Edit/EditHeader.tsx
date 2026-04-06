import React, { ChangeEvent, FC, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { Button, Input, List, message, Modal, Space, Tag, Typography } from 'antd'
import {
  EditOutlined,
  HistoryOutlined,
  LeftOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import { useKeyPress, useRequest } from 'ahooks'
import EditToolbar from './EditToolbar'
import useGetPageInfo from '../../../hooks/useGetPageInfo'
import { changePageTitle } from '../../../store/pageInfoReducer'
import {
  getQuestionVersionsService,
  publishQuestionService,
  QuestionVersionType,
  rollbackQuestionVersionService,
} from '../../../services/question'
import { syncQuestionToStore } from '../../../utils/question-store'
import useQuestionAutoSave, { AutoSaveStatusType } from '../../../hooks/useQuestionAutoSave'
import styles from './EditHeader.module.scss'

const { Title, Text } = Typography

type HeaderPropsType = {
  loading: boolean
}

const STATUS_META: Record<
  AutoSaveStatusType,
  { color: string; text: string }
> = {
  idle: { color: 'default', text: 'Idle' },
  dirty: { color: 'warning', text: 'Dirty' },
  saving: { color: 'processing', text: 'Saving' },
  saved: { color: 'success', text: 'Saved' },
  error: { color: 'error', text: 'Save Error' },
}

const TitleElem: FC = () => {
  const { title } = useGetPageInfo()
  const dispatch = useDispatch()
  const [editState, setEditState] = useState(false)

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const newTitle = event.target.value.trim()
    if (!newTitle) return
    dispatch(changePageTitle(newTitle))
  }

  if (editState) {
    return (
      <Input
        value={title}
        onChange={handleChange}
        onPressEnter={() => setEditState(false)}
        onBlur={() => setEditState(false)}
      />
    )
  }

  return (
    <Space>
      <Title>{title}</Title>
      <Button icon={<EditOutlined />} type="text" onClick={() => setEditState(true)} />
    </Space>
  )
}

const SaveStatusTag: FC<{ status: AutoSaveStatusType; errorMessage: string }> = ({
  status,
  errorMessage,
}) => {
  const meta = STATUS_META[status]

  return (
    <Space size={4}>
      <Tag color={meta.color}>{meta.text}</Tag>
      {status === 'error' && errorMessage ? (
        <Text type="danger" style={{ maxWidth: 220 }}>
          {errorMessage}
        </Text>
      ) : null}
    </Space>
  )
}

const VersionHistoryButton: FC = () => {
  const { id } = useParams()
  const dispatch = useDispatch()
  const [open, setOpen] = useState(false)

  const { data, loading, run: loadVersions } = useRequest(
    async () => {
      if (!id) return { list: [] }
      return await getQuestionVersionsService(id)
    },
    { manual: true }
  )

  const { loading: rollbackLoading, run: rollbackVersion } = useRequest(
    async (versionId: string) => {
      if (!id) return null
      return await rollbackQuestionVersionService(id, versionId)
    },
    {
      manual: true,
      onSuccess(result) {
        if (!result?.question) return
        syncQuestionToStore(dispatch, result.question)
        message.success('Rolled back to the selected version')
        loadVersions()
      },
    }
  )

  function openModal() {
    setOpen(true)
    loadVersions()
  }

  const versionList = (data?.list || []) as QuestionVersionType[]

  return (
    <>
      <Button icon={<HistoryOutlined />} onClick={openModal}>
        Versions
      </Button>
      <Modal title="Published Versions" open={open} onCancel={() => setOpen(false)} footer={null}>
        <List
          loading={loading}
          locale={{ emptyText: 'No published versions yet' }}
          dataSource={versionList}
          renderItem={item => (
            <List.Item
              actions={[
                <Button
                  key="rollback"
                  type="link"
                  disabled={item.isCurrentPublished}
                  loading={rollbackLoading}
                  onClick={() => rollbackVersion(item.id)}
                >
                  Rollback
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <span>{`v${item.versionNumber}`}</span>
                    {item.isCurrentPublished ? <Tag color="processing">Current</Tag> : null}
                  </Space>
                }
                description={`${item.createdAt} | ${item.title}`}
              />
            </List.Item>
          )}
        />
      </Modal>
    </>
  )
}

const EditHeader: FC<HeaderPropsType> = ({ loading }) => {
  const nav = useNavigate()
  const { id } = useParams()
  const dispatch = useDispatch()
  const { status, errorMessage, isDirty, saveNow } = useQuestionAutoSave({
    questionId: id || '',
    loading,
  })

  const {
    loading: publishing,
    run: publish,
  } = useRequest(
    async () => {
      if (!id) return null

      const saveSucceeded = await saveNow()
      if (!saveSucceeded) {
        throw new Error('Current draft failed to save, publish cancelled')
      }

      return await publishQuestionService(id)
    },
    {
      manual: true,
      onSuccess(result) {
        if (result?.question) {
          syncQuestionToStore(dispatch, result.question)
        }
        message.success('Published successfully')
        nav('/question/stat/' + id)
      },
      onError(error: any) {
        message.error(error?.message || 'Publish failed')
      },
    }
  )

  useKeyPress(['ctrl.s', 'meta.s'], (event: KeyboardEvent) => {
    event.preventDefault()
    saveNow().then(success => {
      if (success) {
        message.success('Draft saved')
      }
    })
  })

  const saveButtonText = useMemo(() => {
    if (status === 'saving') return 'Saving...'
    if (status === 'saved') return 'Saved'
    if (status === 'error') return 'Retry Save'
    if (isDirty) return 'Save Draft'
    return 'Save'
  }, [isDirty, status])

  return (
    <div className={styles['header-wrapper']}>
      <div className={styles.header}>
        <div className={styles.left}>
          <Space>
            <Button type="link" icon={<LeftOutlined />} onClick={() => nav(-1)}>
              Back
            </Button>
            <TitleElem />
          </Space>
        </div>
        <div className={styles.main}>
          <EditToolbar />
        </div>
        <div className={styles.right}>
          <Space>
            <SaveStatusTag status={status} errorMessage={errorMessage} />
            <VersionHistoryButton />
            <Button
              onClick={() => saveNow()}
              icon={status === 'saving' ? <LoadingOutlined /> : null}
              disabled={loading || publishing}
            >
              {saveButtonText}
            </Button>
            <Button type="primary" onClick={publish} loading={publishing} disabled={loading}>
              Publish
            </Button>
          </Space>
        </div>
      </div>
    </div>
  )
}

export default EditHeader

import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal, message } from 'antd'
import { useDispatch } from 'react-redux'
import { updateQuestionService } from '../services/question'
import useGetPageInfo from './useGetPageInfo'
import useGetComponentInfo from './useGetComponentInfo'
import { syncQuestionToStore } from '../utils/question-store'
import {
  getQuestionDraftPayload,
  readLocalQuestionDraft,
  removeLocalQuestionDraft,
  serializeQuestionDraft,
  writeLocalQuestionDraft,
} from '../utils/question-draft'

export type AutoSaveStatusType = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

type PropsType = {
  questionId: string
  loading: boolean
}

function isStaleResponse(
  responseSessionId: number,
  currentSessionId: number,
  responseQuestionId: string,
  currentQuestionId: string,
  responseRequestId: number,
  latestAppliedRequestId: number
) {
  if (responseSessionId !== currentSessionId) return true
  if (responseQuestionId !== currentQuestionId) return true
  if (responseRequestId < latestAppliedRequestId) return true
  return false
}

function clearTimer(timerRef: { current: number | null }) {
  if (timerRef.current == null) return
  window.clearTimeout(timerRef.current)
  timerRef.current = null
}

function useQuestionAutoSave({ questionId, loading }: PropsType) {
  const dispatch = useDispatch()
  const pageInfo = useGetPageInfo()
  const { componentList = [] } = useGetComponentInfo()

  const [status, setStatus] = useState<AutoSaveStatusType>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const payload = useMemo(
    () => getQuestionDraftPayload(pageInfo, componentList),
    [componentList, pageInfo]
  )
  const snapshot = useMemo(() => serializeQuestionDraft(payload), [payload])
  const serverUpdatedAt = String(pageInfo.updatedAt || '')

  const latestPayloadRef = useRef(payload)
  const latestSnapshotRef = useRef(snapshot)
  const currentQuestionIdRef = useRef(questionId)
  const initializedQuestionIdRef = useRef('')
  const restoreCheckedQuestionIdRef = useRef('')
  const baselineServerUpdatedAtRef = useRef('')
  const lastSavedSnapshotRef = useRef('')
  const lastErrorSnapshotRef = useRef('')
  const activeSessionIdRef = useRef(0)
  const nextRequestIdRef = useRef(0)
  const latestAppliedRequestIdRef = useRef(0)
  const autoSaveTimerRef = useRef<number | null>(null)
  const queuedPayloadRef = useRef(payload as typeof payload | null)
  const queuedSnapshotRef = useRef(snapshot as string | null)
  const processingPromiseRef = useRef<Promise<void> | null>(null)

  useEffect(() => {
    latestPayloadRef.current = payload
    latestSnapshotRef.current = snapshot
    currentQuestionIdRef.current = questionId
  }, [payload, snapshot, questionId])

  useEffect(() => {
    if (!questionId) {
      setStatus('idle')
      setErrorMessage('')
      return
    }

    if (initializedQuestionIdRef.current === questionId) return
    if (loading) return

    clearTimer(autoSaveTimerRef)
    activeSessionIdRef.current += 1
    initializedQuestionIdRef.current = questionId
    restoreCheckedQuestionIdRef.current = ''
    baselineServerUpdatedAtRef.current = serverUpdatedAt
    lastSavedSnapshotRef.current = snapshot
    lastErrorSnapshotRef.current = ''
    latestAppliedRequestIdRef.current = 0
    queuedPayloadRef.current = null
    queuedSnapshotRef.current = null
    setStatus('saved')
    setErrorMessage('')
  }, [questionId, loading, serverUpdatedAt, snapshot])

  useEffect(() => {
    if (!questionId || loading) return
    if (initializedQuestionIdRef.current !== questionId) return
    if (!serverUpdatedAt) return
    if (baselineServerUpdatedAtRef.current === serverUpdatedAt) return

    clearTimer(autoSaveTimerRef)
    baselineServerUpdatedAtRef.current = serverUpdatedAt
    lastSavedSnapshotRef.current = latestSnapshotRef.current
    lastErrorSnapshotRef.current = ''
    queuedPayloadRef.current = null
    queuedSnapshotRef.current = null
    removeLocalQuestionDraft(questionId)
    setStatus('saved')
    setErrorMessage('')
  }, [loading, questionId, serverUpdatedAt])

  useEffect(() => {
    if (!questionId || loading) return
    if (initializedQuestionIdRef.current !== questionId) return
    if (restoreCheckedQuestionIdRef.current === questionId) return

    restoreCheckedQuestionIdRef.current = questionId
    const localDraft = readLocalQuestionDraft(questionId)
    if (!localDraft) return

    if (localDraft.snapshot === snapshot) {
      removeLocalQuestionDraft(questionId)
      return
    }

    Modal.confirm({
      title: 'Restore local draft?',
      content: 'Unsaved local changes were found for this question. Do you want to restore them?',
      okText: 'Restore',
      cancelText: 'Discard',
      onOk() {
        syncQuestionToStore(dispatch, localDraft.payload)
        setStatus('dirty')
        setErrorMessage('')
        message.info('Local draft restored')
      },
      onCancel() {
        removeLocalQuestionDraft(questionId)
        setStatus('saved')
        setErrorMessage('')
      },
    })
  }, [dispatch, loading, questionId, snapshot])

  async function processQueue() {
    if (processingPromiseRef.current) return processingPromiseRef.current

    processingPromiseRef.current = (async () => {
      while (queuedPayloadRef.current && queuedSnapshotRef.current) {
        const requestPayload = queuedPayloadRef.current
        const requestSnapshot = queuedSnapshotRef.current
        const requestQuestionId = currentQuestionIdRef.current
        const requestSessionId = activeSessionIdRef.current
        const requestId = ++nextRequestIdRef.current

        queuedPayloadRef.current = null
        queuedSnapshotRef.current = null
        setStatus('saving')
        setErrorMessage('')

        try {
          await updateQuestionService(requestQuestionId, requestPayload)

          const stale = isStaleResponse(
            requestSessionId,
            activeSessionIdRef.current,
            requestQuestionId,
            currentQuestionIdRef.current,
            requestId,
            latestAppliedRequestIdRef.current
          )
          if (stale) {
            continue
          }

          latestAppliedRequestIdRef.current = requestId
          lastSavedSnapshotRef.current = requestSnapshot
          lastErrorSnapshotRef.current = ''

          if (latestSnapshotRef.current === lastSavedSnapshotRef.current) {
            removeLocalQuestionDraft(requestQuestionId)
          }
        } catch (error: any) {
          const stale = isStaleResponse(
            requestSessionId,
            activeSessionIdRef.current,
            requestQuestionId,
            currentQuestionIdRef.current,
            requestId,
            latestAppliedRequestIdRef.current
          )
          if (stale) {
            continue
          }

          lastErrorSnapshotRef.current = latestSnapshotRef.current
          setStatus('error')
          setErrorMessage(error?.message || 'Save failed')
          throw error
        }
      }

      if (latestSnapshotRef.current === lastSavedSnapshotRef.current) {
        removeLocalQuestionDraft(currentQuestionIdRef.current)
        setStatus('saved')
        setErrorMessage('')
      } else if (lastErrorSnapshotRef.current === latestSnapshotRef.current) {
        setStatus('error')
      } else {
        setStatus('dirty')
      }
    })().finally(() => {
      processingPromiseRef.current = null
    })

    return processingPromiseRef.current
  }

  function stageCurrentDraft() {
    queuedPayloadRef.current = latestPayloadRef.current
    queuedSnapshotRef.current = latestSnapshotRef.current
  }

  function scheduleAutoSave() {
    clearTimer(autoSaveTimerRef)
    stageCurrentDraft()
    autoSaveTimerRef.current = window.setTimeout(() => {
      processQueue().catch(() => undefined)
    }, 1000)
  }

  async function saveNow() {
    if (!questionId || loading) return false

    clearTimer(autoSaveTimerRef)

    if (latestSnapshotRef.current === lastSavedSnapshotRef.current && !processingPromiseRef.current) {
      removeLocalQuestionDraft(questionId)
      setStatus('saved')
      setErrorMessage('')
      return true
    }

    stageCurrentDraft()

    try {
      await processQueue()
      return latestSnapshotRef.current === lastSavedSnapshotRef.current
    } catch {
      return false
    }
  }

  useEffect(() => {
    if (!questionId || loading) return
    if (initializedQuestionIdRef.current !== questionId) return

    if (snapshot === lastSavedSnapshotRef.current) {
      removeLocalQuestionDraft(questionId)
      if (!processingPromiseRef.current) {
        setStatus('saved')
        setErrorMessage('')
      }
      return
    }

    writeLocalQuestionDraft(questionId, payload, snapshot)

    if (!processingPromiseRef.current && lastErrorSnapshotRef.current !== snapshot) {
      setStatus('dirty')
      setErrorMessage('')
    }

    if (lastErrorSnapshotRef.current !== snapshot) {
      scheduleAutoSave()
    }
  }, [loading, payload, questionId, snapshot])

  useEffect(() => {
    return () => {
      clearTimer(autoSaveTimerRef)
    }
  }, [])

  return {
    status,
    errorMessage,
    isDirty: latestSnapshotRef.current !== lastSavedSnapshotRef.current,
    saveNow,
  }
}

export default useQuestionAutoSave

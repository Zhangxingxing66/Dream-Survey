import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useRequest } from 'ahooks'
import { useDispatch } from 'react-redux'
import { getQuestionService } from '../services/question'
import { syncQuestionToStore } from '../utils/question-store'

function useLoadQuestionData(mode: 'draft' | 'published' = 'draft') {
  const { id = '' } = useParams()
  const dispatch = useDispatch()

  const { data, loading, error, run } = useRequest(
    async (questionId: string) => {
      if (!questionId) throw new Error('Missing question id')
      return await getQuestionService(questionId, mode)
    },
    {
      manual: true,
    }
  )

  useEffect(() => {
    if (!data) return
    syncQuestionToStore(dispatch, data)
  }, [data, dispatch])

  useEffect(() => {
    run(id)
  }, [id, mode, run])

  return { loading, error }
}

export default useLoadQuestionData

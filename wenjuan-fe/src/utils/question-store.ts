import { resetComponents } from '../store/componentsReducer'
import { resetPageInfo } from '../store/pageInfoReducer'

type QuestionDataType = {
  title?: string
  desc?: string
  js?: string
  css?: string
  updatedAt?: string
  isPublished?: boolean
  publishedVersionId?: string
  publishedAt?: string
  versionCount?: number
  versionId?: string
  versionNumber?: number
  componentList?: Array<any>
}

export function syncQuestionToStore(dispatch: any, data?: QuestionDataType) {
  if (!data) return

  const {
    title = '',
    desc = '',
    js = '',
    css = '',
    updatedAt = '',
    isPublished = false,
    publishedVersionId = '',
    publishedAt = '',
    versionCount = 0,
    versionId = '',
    versionNumber = 0,
    componentList = [],
  } = data

  let selectedId = ''
  if (componentList.length > 0) {
    selectedId = componentList[0].fe_id
  }

  dispatch(resetComponents({ componentList, selectedId, copiedComponent: null }))
  dispatch(
    resetPageInfo({
      title,
      desc,
      js,
      css,
      updatedAt,
      isPublished,
      publishedVersionId,
      publishedAt,
      versionCount,
      versionId,
      versionNumber,
    })
  )
}

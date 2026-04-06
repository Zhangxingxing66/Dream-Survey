export type QuestionDraftPayloadType = {
  title: string
  desc: string
  js: string
  css: string
  componentList: Array<any>
}

export type LocalQuestionDraftType = {
  questionId: string
  snapshot: string
  payload: QuestionDraftPayloadType
  updatedAt: number
}

const DRAFT_STORAGE_PREFIX = 'dream-survey:auto-save:draft:'

export function getQuestionDraftPayload(pageInfo: any, componentList: Array<any>): QuestionDraftPayloadType {
  return {
    title: String(pageInfo?.title || ''),
    desc: String(pageInfo?.desc || ''),
    js: String(pageInfo?.js || ''),
    css: String(pageInfo?.css || ''),
    componentList: Array.isArray(componentList) ? componentList : [],
  }
}

export function serializeQuestionDraft(payload: QuestionDraftPayloadType) {
  return JSON.stringify(payload)
}

function getDraftStorageKey(questionId: string) {
  return `${DRAFT_STORAGE_PREFIX}${questionId}`
}

export function readLocalQuestionDraft(questionId: string): LocalQuestionDraftType | null {
  if (!questionId) return null

  try {
    const raw = window.localStorage.getItem(getDraftStorageKey(questionId))
    if (!raw) return null
    return JSON.parse(raw) as LocalQuestionDraftType
  } catch {
    return null
  }
}

export function writeLocalQuestionDraft(
  questionId: string,
  payload: QuestionDraftPayloadType,
  snapshot: string
) {
  if (!questionId) return

  const data: LocalQuestionDraftType = {
    questionId,
    payload,
    snapshot,
    updatedAt: Date.now(),
  }

  try {
    window.localStorage.setItem(getDraftStorageKey(questionId), JSON.stringify(data))
  } catch {
    // Ignore localStorage quota or availability issues.
  }
}

export function removeLocalQuestionDraft(questionId: string) {
  if (!questionId) return

  try {
    window.localStorage.removeItem(getDraftStorageKey(questionId))
  } catch {
    // Ignore localStorage availability issues.
  }
}

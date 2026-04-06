import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import produce from 'immer'

export type PageInfoType = {
  title: string
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
}

const INIT_STATE: PageInfoType = {
  title: '',
  desc: '',
  js: '',
  css: '',
  updatedAt: '',
  isPublished: false,
  publishedVersionId: '',
  publishedAt: '',
  versionCount: 0,
  versionId: '',
  versionNumber: 0,
}

const pageInfoSlice = createSlice({
  name: 'pageInfo',
  initialState: INIT_STATE,
  reducers: {
    resetPageInfo: (state: PageInfoType, action: PayloadAction<PageInfoType>) => {
      return {
        ...INIT_STATE,
        ...action.payload,
      }
    },

    updatePageInfo: produce((draft: PageInfoType, action: PayloadAction<Partial<PageInfoType>>) => {
      Object.assign(draft, action.payload)
    }),

    changePageTitle: produce((draft: PageInfoType, action: PayloadAction<string>) => {
      draft.title = action.payload
    }),
  },
})

export const { resetPageInfo, updatePageInfo, changePageTitle } = pageInfoSlice.actions

export default pageInfoSlice.reducer

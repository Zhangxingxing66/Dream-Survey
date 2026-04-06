import type { NextApiRequest, NextApiResponse } from 'next'
import { postAnswer } from '@/services/answer'

function genAnswerInfo(reqBody: any) {
  const answerList: any[] = []

  Object.keys(reqBody).forEach(key => {
    if (key === 'questionId' || key === 'versionId') return
    answerList.push({
      componentId: key,
      value: reqBody[key],
    })
  })

  return {
    questionId: reqBody.questionId || '',
    versionId: reqBody.versionId || '',
    answerList,
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(200).json({ errno: -1, msg: 'Invalid method' })
    return
  }

  const answerInfo = genAnswerInfo(req.body)

  try {
    const resData = await postAnswer(answerInfo)
    if (resData.errno === 0) {
      res.redirect('/success')
    } else {
      res.redirect('/fail')
    }
  } catch (err) {
    res.redirect('/fail')
  }
}

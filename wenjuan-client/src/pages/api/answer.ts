import type { NextApiRequest, NextApiResponse } from 'next'
import { postAnswer } from '@/services/answer'

function genAnswerInfo(reqBody: any) {
  const answerList: any[] = []

  Object.keys(reqBody).forEach(key => {
    if (key === 'questionId') return
    answerList.push({
      componentId: key,
      value: reqBody[key],
    })
  })

  return {
    questionId: reqBody.questionId || '',
    answerList,
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(200).json({ errno: -1, msg: 'Method 错误' })
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

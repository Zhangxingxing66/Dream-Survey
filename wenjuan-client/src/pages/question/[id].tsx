import PageWrapper from '@/components/PageWrapper'
import { getQuestionById } from '@/services/question'
import { getComponent } from '@/components/QuestionComponents'
import styles from '@/styles/Question.module.scss'

type PropsType = {
  errno: number
  data?: {
    id: string
    title: string
    desc?: string
    js?: string
    css?: string
    isPublished: boolean
    isDeleted: boolean
    componentList: Array<any>
    versionId?: string
  }
  msg?: string
}

export default function Question(props: PropsType) {
  const { errno, data, msg = '' } = props

  if (errno !== 0) {
    return (
      <PageWrapper title="Error">
        <h1>Error</h1>
        <p>{msg}</p>
      </PageWrapper>
    )
  }

  const {
    id,
    title = '',
    desc = '',
    js = '',
    css = '',
    isDeleted,
    isPublished,
    componentList = [],
    versionId = '',
  } = data || {}

  if (isDeleted) {
    return (
      <PageWrapper title={title} desc={desc}>
        <h1>{title}</h1>
        <p>This survey has been deleted.</p>
      </PageWrapper>
    )
  }

  if (!isPublished) {
    return (
      <PageWrapper title={title} desc={desc}>
        <h1>{title}</h1>
        <p>This survey is not published yet.</p>
      </PageWrapper>
    )
  }

  const componentListElem = (
    <>
      {componentList.map(component => {
        const componentElem = getComponent(component)
        return (
          <div key={component.fe_id} className={styles.componentWrapper}>
            {componentElem}
          </div>
        )
      })}
    </>
  )

  return (
    <PageWrapper title={title} desc={desc} css={css} js={js}>
      <form method="post" action="/api/answer">
        <input type="hidden" name="questionId" value={id} />
        <input type="hidden" name="versionId" value={versionId} />

        {componentListElem}

        <div className={styles.submitBtnContainer}>
          <button type="submit">Submit</button>
        </div>
      </form>
    </PageWrapper>
  )
}

export async function getServerSideProps(context: any) {
  const { id = '' } = context.params
  const data = await getQuestionById(id)

  return {
    props: data,
  }
}

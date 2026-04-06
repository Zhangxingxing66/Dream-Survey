const fs = require('fs/promises')
const path = require('path')
const crypto = require('crypto')
const Koa = require('koa')
const Router = require('koa-router')

const app = new Koa()
const router = new Router()

const PORT = Number(process.env.PORT || 3001)
const DB_DIR = path.join(__dirname, 'data')
const DB_FILE = path.join(DB_DIR, 'db.json')

const DEFAULT_DB = {
  users: [],
  sessions: [],
  questions: [],
  answers: [],
}

let writeChain = Promise.resolve()

function formatDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`
}

function clone(value) {
  if (value == null) return value
  return JSON.parse(JSON.stringify(value))
}

function success(ctx, data = {}) {
  ctx.body = {
    errno: 0,
    data,
  }
}

function fail(ctx, msg, errno = 1001) {
  ctx.body = {
    errno,
    msg,
  }
}

function parseBoolean(value) {
  if (value === true || value === 'true') return true
  if (value === false || value === 'false') return false
  return undefined
}

function getToken(ctx) {
  const auth = ctx.headers.authorization || ''
  if (!auth.startsWith('Bearer ')) return ''
  return auth.slice(7).trim()
}

function getCurrentUser(ctx, db) {
  const token = getToken(ctx)
  if (!token) return null

  const session = db.sessions.find(item => item.token === token)
  if (!session) return null

  return db.users.find(item => item.id === session.userId) || null
}

function requireUser(ctx, db) {
  const user = getCurrentUser(ctx, db)
  if (!user) {
    fail(ctx, 'Please login first', 401)
    return null
  }

  return user
}

function getNextVersionNumber(versions = []) {
  return versions.reduce((max, item) => Math.max(max, Number(item.versionNumber) || 0), 0) + 1
}

function createVersionSnapshotFromQuestion(question, versionNumber = getNextVersionNumber(question.versions)) {
  return {
    id: createId('version'),
    versionNumber,
    createdAt: formatDate(),
    title: question.title || '',
    desc: question.desc || '',
    js: question.js || '',
    css: question.css || '',
    componentList: clone(question.componentList || []),
    answerCount: 0,
    statSummary: createVersionStatSummary(question.componentList || []),
  }
}

function createDefaultComponentList() {
  return [
    {
      fe_id: createId('cmp'),
      type: 'questionInfo',
      title: 'Question Info',
      isHidden: false,
      isLocked: false,
      props: {
        title: 'Personal Survey',
        desc: 'Please complete the questionnaire according to your real situation.',
      },
    },
    {
      fe_id: createId('cmp'),
      type: 'questionTitle',
      title: 'Title',
      isHidden: false,
      isLocked: false,
      props: {
        text: 'Welcome to this survey',
        level: 1,
        isCenter: false,
      },
    },
    {
      fe_id: createId('cmp'),
      type: 'questionInput',
      title: 'Input',
      isHidden: false,
      isLocked: false,
      props: {
        title: 'Your name',
        placeholder: 'Please enter your name',
      },
    },
    {
      fe_id: createId('cmp'),
      type: 'questionInput',
      title: 'Input',
      isHidden: false,
      isLocked: false,
      props: {
        title: 'Contact',
        placeholder: 'Please enter phone or WeChat',
      },
    },
    {
      fe_id: createId('cmp'),
      type: 'questionTextarea',
      title: 'Textarea',
      isHidden: false,
      isLocked: false,
      props: {
        title: 'Additional notes',
        placeholder: 'You can add more details here',
      },
    },
    {
      fe_id: createId('cmp'),
      type: 'questionParagraph',
      title: 'Paragraph',
      isHidden: false,
      isLocked: false,
      props: {
        text: 'This survey is only used for collecting information. Thank you for your cooperation.',
        isCenter: false,
      },
    },
    {
      fe_id: createId('cmp'),
      type: 'questionRadio',
      title: 'Single Choice',
      isHidden: false,
      isLocked: false,
      props: {
        title: 'Which communication method do you use most often?',
        isVertical: false,
        options: [
          { value: 'phone', text: 'Phone' },
          { value: 'wechat', text: 'WeChat' },
          { value: 'email', text: 'Email' },
        ],
        value: '',
      },
    },
    {
      fe_id: createId('cmp'),
      type: 'questionCheckbox',
      title: 'Multiple Choice',
      isHidden: false,
      isLocked: false,
      props: {
        title: 'What content would you like to receive?',
        isVertical: false,
        list: [
          { value: 'news', text: 'Event notices', checked: false },
          { value: 'product', text: 'Product updates', checked: false },
          { value: 'tips', text: 'Usage tips', checked: false },
        ],
      },
    },
  ]
}

function createQuestion(userId) {
  const now = formatDate()

  return {
    id: createId('question'),
    userId,
    title: 'Untitled Survey',
    desc: 'Please complete the survey description',
    js: '',
    css: '',
    isDeleted: false,
    isPublished: false,
    publishedVersionId: '',
    publishedAt: '',
    isStar: false,
    answerCount: 0,
    createdAt: now,
    updatedAt: now,
    componentList: createDefaultComponentList(),
    versions: [],
  }
}

function createVersionStatSummary(componentList = []) {
  const summary = {}

  componentList.forEach(component => {
    const adapter = getStatAdapterByType(component?.type)
    if (!adapter) return

    summary[component.fe_id] = {
      componentId: component.fe_id,
      type: component.type,
      entries: adapter.createEntries(component),
    }
  })

  return summary
}

function normalizeVersion(version, fallbackVersionNumber = 1) {
  return {
    id: typeof version?.id === 'string' && version.id ? version.id : createId('version'),
    versionNumber: Number(version?.versionNumber) || fallbackVersionNumber,
    createdAt: String(version?.createdAt || formatDate()),
    title: String(version?.title || ''),
    desc: String(version?.desc || ''),
    js: String(version?.js || ''),
    css: String(version?.css || ''),
    componentList: Array.isArray(version?.componentList) ? clone(version.componentList) : [],
    answerCount: version?.answerCount == null ? null : Number(version.answerCount || 0),
    statSummary:
      version?.statSummary && typeof version.statSummary === 'object' ? clone(version.statSummary) : null,
  }
}

function normalizeQuestionRecord(question) {
  const normalized = {
    ...clone(question),
    title: String(question?.title || ''),
    desc: String(question?.desc || ''),
    js: String(question?.js || ''),
    css: String(question?.css || ''),
    isDeleted: Boolean(question?.isDeleted),
    isStar: Boolean(question?.isStar),
    answerCount: Number(question?.answerCount || 0),
    createdAt: String(question?.createdAt || formatDate()),
    updatedAt: String(question?.updatedAt || question?.createdAt || formatDate()),
    componentList: Array.isArray(question?.componentList) ? clone(question.componentList) : [],
    versions: Array.isArray(question?.versions)
      ? question.versions.map((item, index) => normalizeVersion(item, index + 1))
      : [],
    publishedVersionId: String(question?.publishedVersionId || ''),
    publishedAt: String(question?.publishedAt || ''),
  }

  if (!normalized.versions.length && Boolean(question?.isPublished)) {
    const legacyVersion = createVersionSnapshotFromQuestion(normalized, 1)
    legacyVersion.createdAt = normalized.updatedAt || normalized.createdAt
    normalized.versions = [legacyVersion]
    normalized.publishedVersionId = legacyVersion.id
    normalized.publishedAt = normalized.publishedAt || legacyVersion.createdAt
  }

  const currentVersionExists = normalized.versions.some(item => item.id === normalized.publishedVersionId)
  if (!currentVersionExists) {
    normalized.publishedVersionId = ''
    normalized.publishedAt = ''
  }

  normalized.isPublished = Boolean(normalized.publishedVersionId)
  return normalized
}

function normalizeAnswerRecord(answer, questionsById) {
  const question = questionsById.get(answer?.questionId)
  const fallbackVersionId = question?.publishedVersionId || ''

  return {
    ...clone(answer),
    id: String(answer?.id || createId('answer')),
    questionId: String(answer?.questionId || ''),
    versionId: String(answer?.versionId || fallbackVersionId),
    createdAt: String(answer?.createdAt || formatDate()),
    answerList: Array.isArray(answer?.answerList)
      ? answer.answerList
          .filter(item => item && item.componentId)
          .map(item => ({
            componentId: String(item.componentId),
            value: Array.isArray(item.value) ? item.value.join(',') : String(item.value || ''),
          }))
      : [],
  }
}

function normalizeDb(db = {}) {
  const normalizedQuestions = Array.isArray(db.questions)
    ? db.questions.map(item => normalizeQuestionRecord(item))
    : []
  const questionsById = new Map(normalizedQuestions.map(item => [item.id, item]))
  const normalizedAnswers = Array.isArray(db.answers)
    ? db.answers.map(item => normalizeAnswerRecord(item, questionsById))
    : []

  const answersByVersion = new Map()
  normalizedAnswers.forEach(answer => {
    const key = getVersionAnswerBucketKey(answer.questionId, answer.versionId)
    const current = answersByVersion.get(key) || []
    current.push(answer)
    answersByVersion.set(key, current)
  })

  normalizedQuestions.forEach(question => {
    question.versions = question.versions.map(version => {
      const needsRebuild = version.answerCount == null || version.statSummary == null
      const nextVersion = {
        ...version,
        answerCount: Number(version.answerCount || 0),
        statSummary: normalizeVersionStatSummary(version.componentList, version.statSummary),
      }

      if (!needsRebuild) return nextVersion

      const answerBucket =
        answersByVersion.get(getVersionAnswerBucketKey(question.id, version.id)) || []

      nextVersion.answerCount = 0
      nextVersion.statSummary = createVersionStatSummary(nextVersion.componentList)
      answerBucket.forEach(answer => {
        applyAnswerToVersionStats(nextVersion, answer)
      })

      return nextVersion
    })
  })

  return {
    users: Array.isArray(db.users) ? db.users : [],
    sessions: Array.isArray(db.sessions) ? db.sessions : [],
    questions: normalizedQuestions,
    answers: normalizedAnswers,
  }
}

function hasDbChanged(a, b) {
  return JSON.stringify(a) !== JSON.stringify(b)
}

async function ensureDbFile() {
  await fs.mkdir(DB_DIR, { recursive: true })

  try {
    await fs.access(DB_FILE)
  } catch {
    await fs.writeFile(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf8')
  }

  const content = await fs.readFile(DB_FILE, 'utf8')
  const parsed = content ? JSON.parse(content) : DEFAULT_DB
  const normalized = normalizeDb(parsed)

  if (hasDbChanged(parsed, normalized)) {
    await fs.writeFile(DB_FILE, JSON.stringify(normalized, null, 2), 'utf8')
  }
}

async function readDb() {
  await ensureDbFile()

  const content = await fs.readFile(DB_FILE, 'utf8')
  const parsed = content ? JSON.parse(content) : DEFAULT_DB

  return normalizeDb(parsed)
}

async function writeDb(db) {
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf8')
}

function updateDb(mutator) {
  const task = writeChain.then(async () => {
    const db = await readDb()
    const result = await mutator(db)
    await writeDb(db)
    return result
  })

  writeChain = task.catch(() => undefined)
  return task
}

function resetComponentIds(componentList = []) {
  return componentList.map(component => ({
    ...clone(component),
    fe_id: createId('cmp'),
  }))
}

function parseCheckboxValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value !== 'string') return []

  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

const statAdapterMap = {
  questionRadio: {
    createEntries(component) {
      const options = Array.isArray(component?.props?.options) ? component.props.options : []
      return options.map(item => ({
        value: String(item.value),
        name: String(item.text || item.value || ''),
        count: 0,
      }))
    },
    accumulate(summary, rawValue) {
      const current = summary.entries.find(item => item.value === String(rawValue))
      if (!current) return
      current.count = Number(current.count || 0) + 1
    },
    toStat(summary) {
      return (summary.entries || []).map(item => ({
        name: item.name,
        count: Number(item.count || 0),
      }))
    },
  },
  questionCheckbox: {
    createEntries(component) {
      const list = Array.isArray(component?.props?.list) ? component.props.list : []
      return list.map(item => ({
        value: String(item.value),
        name: String(item.text || item.value || ''),
        count: 0,
      }))
    },
    accumulate(summary, rawValue) {
      parseCheckboxValue(rawValue).forEach(value => {
        const current = summary.entries.find(item => item.value === String(value))
        if (!current) return
        current.count = Number(current.count || 0) + 1
      })
    },
    toStat(summary) {
      return (summary.entries || []).map(item => ({
        name: item.name,
        count: Number(item.count || 0),
      }))
    },
  },
}

function getStatAdapterByType(type) {
  return statAdapterMap[type] || null
}

function normalizeVersionStatSummary(componentList = [], rawSummary) {
  const nextSummary = createVersionStatSummary(componentList)
  if (!rawSummary || typeof rawSummary !== 'object') return nextSummary

  Object.keys(nextSummary).forEach(componentId => {
    const current = nextSummary[componentId]
    const existing = rawSummary[componentId]
    if (!existing || !Array.isArray(existing.entries)) return

    const counterMap = new Map(
      existing.entries.map(item => [String(item.value), Number(item.count || 0)])
    )

    current.entries = current.entries.map(item => ({
      ...item,
      count: counterMap.get(String(item.value)) || 0,
    }))
  })

  return nextSummary
}

function getVersionAnswerBucketKey(questionId, versionId) {
  return `${questionId}::${versionId}`
}

function applyAnswerToVersionStats(version, answer) {
  version.answerCount = Number(version.answerCount || 0) + 1

  ;(answer.answerList || []).forEach(item => {
    const summary = version.statSummary?.[item.componentId]
    if (!summary) return

    const adapter = getStatAdapterByType(summary.type)
    if (!adapter) return
    adapter.accumulate(summary, item.value)
  })
}

function getComponent(questionLike, componentId) {
  return (questionLike.componentList || []).find(item => item.fe_id === componentId) || null
}

function getDisplayValue(questionLike, componentId, rawValue) {
  const component = getComponent(questionLike, componentId)
  if (!component) return rawValue

  const { type, props = {} } = component

  if (type === 'questionRadio') {
    const options = Array.isArray(props.options) ? props.options : []
    const match = options.find(item => item.value === rawValue)
    return match ? match.text : rawValue
  }

  if (type === 'questionCheckbox') {
    const selectedValues = parseCheckboxValue(rawValue)
    const list = Array.isArray(props.list) ? props.list : []

    return selectedValues
      .map(value => {
        const match = list.find(item => item.value === value)
        return match ? match.text : value
      })
      .join(', ')
  }

  return rawValue
}

function buildStatRow(questionLike, answer) {
  const row = { _id: answer.id }

  ;(answer.answerList || []).forEach(item => {
    row[item.componentId] = getDisplayValue(questionLike, item.componentId, item.value)
  })

  return row
}

function getVersionComponentStat(version, componentId) {
  if (!version?.statSummary) return []

  const summary = version.statSummary[componentId]
  if (!summary) return []

  const adapter = getStatAdapterByType(summary.type)
  if (!adapter) return []

  return adapter.toStat(summary)
}

function getPublishedVersion(question, versionId = question.publishedVersionId) {
  if (!versionId) return null
  return question.versions.find(item => item.id === versionId) || null
}

function getPublishedQuestionLike(question, versionId = question.publishedVersionId) {
  const version = getPublishedVersion(question, versionId)
  if (!version) return null

  return {
    id: question.id,
    title: version.title,
    desc: version.desc,
    js: version.js,
    css: version.css,
    componentList: clone(version.componentList || []),
  }
}

function normaliseQuestionDraft(question) {
  return {
    _id: question.id,
    id: question.id,
    title: question.title,
    desc: question.desc,
    js: question.js,
    css: question.css,
    isDeleted: Boolean(question.isDeleted),
    isPublished: Boolean(question.publishedVersionId),
    publishedVersionId: question.publishedVersionId || '',
    publishedAt: question.publishedAt || '',
    versionCount: Array.isArray(question.versions) ? question.versions.length : 0,
    isStar: Boolean(question.isStar),
    answerCount: Number(question.answerCount || 0),
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
    componentList: clone(question.componentList || []),
  }
}

function normaliseQuestionPublished(question, versionId = question.publishedVersionId) {
  const published = getPublishedQuestionLike(question, versionId)

  if (!published) {
    return {
      _id: question.id,
      id: question.id,
      title: question.title,
      desc: question.desc,
      js: '',
      css: '',
      isDeleted: Boolean(question.isDeleted),
      isPublished: false,
      publishedVersionId: '',
      versionId: '',
      versionNumber: 0,
      publishedAt: '',
      versionCount: Array.isArray(question.versions) ? question.versions.length : 0,
      componentList: [],
    }
  }

  const version = getPublishedVersion(question, versionId)

  return {
    _id: question.id,
    id: question.id,
    title: published.title,
    desc: published.desc,
    js: published.js,
    css: published.css,
    isDeleted: Boolean(question.isDeleted),
    isPublished: true,
    publishedVersionId: question.publishedVersionId || '',
    versionId: version ? version.id : '',
    versionNumber: version ? version.versionNumber : 0,
    publishedAt: question.publishedAt || (version ? version.createdAt : ''),
    versionCount: Array.isArray(question.versions) ? question.versions.length : 0,
    componentList: published.componentList,
  }
}

function normaliseQuestionListItem(question) {
  return {
    _id: question.id,
    id: question.id,
    title: question.title,
    isStar: Boolean(question.isStar),
    isPublished: Boolean(question.publishedVersionId),
    isDeleted: Boolean(question.isDeleted),
    answerCount: Number(question.answerCount || 0),
    createdAt: question.createdAt,
    publishedAt: question.publishedAt || '',
    versionCount: Array.isArray(question.versions) ? question.versions.length : 0,
  }
}

function normaliseVersionList(question) {
  return [...(question.versions || [])]
    .sort((a, b) => Number(b.versionNumber) - Number(a.versionNumber))
    .map(item => ({
      id: item.id,
      versionNumber: item.versionNumber,
      title: item.title,
      createdAt: item.createdAt,
      isCurrentPublished: item.id === question.publishedVersionId,
    }))
}

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []

    req.on('data', chunk => {
      chunks.push(chunk)
    })

    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim()
      if (!raw) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(raw))
      } catch {
        const params = new URLSearchParams(raw)
        const data = {}

        params.forEach((value, key) => {
          data[key] = value
        })

        resolve(data)
      }
    })

    req.on('error', reject)
  })
}

app.use(async (ctx, next) => {
  ctx.set('Access-Control-Allow-Origin', '*')
  ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  ctx.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')

  if (ctx.method === 'OPTIONS') {
    ctx.status = 204
    return
  }

  await next()
})

app.use(async (ctx, next) => {
  if (['POST', 'PATCH', 'DELETE'].includes(ctx.method)) {
    ctx.request.body = await parseBody(ctx.req)
  } else {
    ctx.request.body = {}
  }

  await next()
})

app.use(async (ctx, next) => {
  try {
    await next()

    if (ctx.body == null) {
      fail(ctx, 'API not found', 404)
    }
  } catch (err) {
    console.error(err)
    fail(ctx, err.message || 'Server error', 500)
  }
})

router.get('/api/test', async ctx => {
  success(ctx, {
    message: 'server is running',
  })
})

router.get('/api/user/info', async ctx => {
  const db = await readDb()
  const user = getCurrentUser(ctx, db)

  if (!user) {
    success(ctx, { username: '', nickname: '' })
    return
  }

  success(ctx, {
    username: user.username,
    nickname: user.nickname,
  })
})

router.post('/api/user/register', async ctx => {
  const { username = '', password = '', nickname = '' } = ctx.request.body || {}
  const trimmedUsername = String(username).trim()
  const trimmedPassword = String(password).trim()

  if (!trimmedUsername || !trimmedPassword) {
    fail(ctx, 'Username and password are required')
    return
  }

  const result = await updateDb(db => {
    const exists = db.users.some(item => item.username === trimmedUsername)
    if (exists) return { error: 'Username already exists' }

    db.users.push({
      id: createId('user'),
      username: trimmedUsername,
      password: trimmedPassword,
      nickname: String(nickname || trimmedUsername).trim() || trimmedUsername,
      createdAt: formatDate(),
    })

    return { ok: true }
  })

  if (result.error) {
    fail(ctx, result.error)
    return
  }

  success(ctx)
})

router.post('/api/user/login', async ctx => {
  const { username = '', password = '' } = ctx.request.body || {}
  const trimmedUsername = String(username).trim()
  const trimmedPassword = String(password).trim()

  const result = await updateDb(db => {
    const user = db.users.find(
      item => item.username === trimmedUsername && item.password === trimmedPassword
    )

    if (!user) return { error: 'Incorrect username or password' }

    const token = createId('token')
    db.sessions = db.sessions.filter(item => item.userId !== user.id)
    db.sessions.push({
      token,
      userId: user.id,
      createdAt: formatDate(),
    })

    return { token }
  })

  if (result.error) {
    fail(ctx, result.error)
    return
  }

  success(ctx, { token: result.token })
})

router.post('/api/question/duplicate/:id', async ctx => {
  const result = await updateDb(db => {
    const user = getCurrentUser(ctx, db)
    if (!user) return { error: 'Please login first', errno: 401 }

    const source = db.questions.find(item => item.id === ctx.params.id && item.userId === user.id)
    if (!source) return { error: 'Question not found', errno: 404 }

    const now = formatDate()
    const duplicated = {
      ...clone(source),
      id: createId('question'),
      title: `${source.title} Copy`,
      isPublished: false,
      publishedVersionId: '',
      publishedAt: '',
      isDeleted: false,
      isStar: false,
      answerCount: 0,
      createdAt: now,
      updatedAt: now,
      componentList: resetComponentIds(source.componentList),
      versions: [],
    }

    db.questions.unshift(duplicated)
    return { id: duplicated.id }
  })

  if (result.error) {
    fail(ctx, result.error, result.errno)
    return
  }

  success(ctx, { id: result.id })
})

router.post('/api/question/publish/:id', async ctx => {
  const result = await updateDb(db => {
    const user = getCurrentUser(ctx, db)
    if (!user) return { error: 'Please login first', errno: 401 }

    const question = db.questions.find(item => item.id === ctx.params.id && item.userId === user.id)
    if (!question) return { error: 'Question not found', errno: 404 }

    const snapshot = createVersionSnapshotFromQuestion(question)
    question.versions.push(snapshot)
    question.publishedVersionId = snapshot.id
    question.publishedAt = snapshot.createdAt
    question.isPublished = true
    question.updatedAt = snapshot.createdAt

    return {
      question: normaliseQuestionDraft(question),
      version: {
        id: snapshot.id,
        versionNumber: snapshot.versionNumber,
        createdAt: snapshot.createdAt,
      },
    }
  })

  if (result.error) {
    fail(ctx, result.error, result.errno)
    return
  }

  success(ctx, result)
})

router.get('/api/question/versions/:id', async ctx => {
  const db = await readDb()
  const user = requireUser(ctx, db)
  if (!user) return

  const question = db.questions.find(item => item.id === ctx.params.id && item.userId === user.id)
  if (!question) {
    fail(ctx, 'Question not found', 404)
    return
  }

  success(ctx, {
    list: normaliseVersionList(question),
    publishedVersionId: question.publishedVersionId || '',
    publishedAt: question.publishedAt || '',
  })
})

router.post('/api/question/rollback/:id', async ctx => {
  const { versionId = '' } = ctx.request.body || {}

  const result = await updateDb(db => {
    const user = getCurrentUser(ctx, db)
    if (!user) return { error: 'Please login first', errno: 401 }

    const question = db.questions.find(item => item.id === ctx.params.id && item.userId === user.id)
    if (!question) return { error: 'Question not found', errno: 404 }

    const targetVersion = getPublishedVersion(question, String(versionId))
    if (!targetVersion) return { error: 'Version not found', errno: 404 }

    const now = formatDate()
    question.title = targetVersion.title
    question.desc = targetVersion.desc
    question.js = targetVersion.js
    question.css = targetVersion.css
    question.componentList = clone(targetVersion.componentList || [])
    question.publishedVersionId = targetVersion.id
    question.publishedAt = now
    question.isPublished = true
    question.updatedAt = now

    return {
      question: normaliseQuestionDraft(question),
      currentVersionId: targetVersion.id,
    }
  })

  if (result.error) {
    fail(ctx, result.error, result.errno)
    return
  }

  success(ctx, result)
})

router.get('/api/question/:id', async ctx => {
  const db = await readDb()
  const question = db.questions.find(item => item.id === ctx.params.id)

  if (!question) {
    fail(ctx, 'Question not found', 404)
    return
  }

  const user = getCurrentUser(ctx, db)
  const isOwner = Boolean(user && question.userId === user.id)
  const requestedMode = ctx.query?.mode === 'published' ? 'published' : 'draft'
  const shouldUseDraft = requestedMode === 'draft' && isOwner

  success(ctx, shouldUseDraft ? normaliseQuestionDraft(question) : normaliseQuestionPublished(question))
})

router.post('/api/question', async ctx => {
  const result = await updateDb(db => {
    const user = getCurrentUser(ctx, db)
    if (!user) return { error: 'Please login first', errno: 401 }

    const question = createQuestion(user.id)
    db.questions.unshift(question)

    return { id: question.id }
  })

  if (result.error) {
    fail(ctx, result.error, result.errno)
    return
  }

  success(ctx, { id: result.id })
})

router.get('/api/question', async ctx => {
  const db = await readDb()
  const user = requireUser(ctx, db)
  if (!user) return

  const {
    keyword = '',
    page: pageValue = '1',
    pageSize: pageSizeValue = '10',
    isDeleted,
    isStar,
  } = ctx.query || {}

  const keywordText = String(keyword).trim().toLowerCase()
  const page = Math.max(1, Number(pageValue) || 1)
  const pageSize = Math.max(1, Number(pageSizeValue) || 10)
  const deletedFlag = parseBoolean(isDeleted)
  const starFlag = parseBoolean(isStar)

  let list = db.questions
    .filter(item => item.userId === user.id)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))

  if (typeof deletedFlag === 'boolean') {
    list = list.filter(item => Boolean(item.isDeleted) === deletedFlag)
  }

  if (typeof starFlag === 'boolean') {
    list = list.filter(item => Boolean(item.isStar) === starFlag)
  }

  if (keywordText) {
    list = list.filter(item => {
      const title = String(item.title || '').toLowerCase()
      const desc = String(item.desc || '').toLowerCase()
      return title.includes(keywordText) || desc.includes(keywordText)
    })
  }

  const total = list.length
  const pageList = list
    .slice((page - 1) * pageSize, page * pageSize)
    .map(normaliseQuestionListItem)

  success(ctx, {
    list: pageList,
    total,
  })
})

router.patch('/api/question/:id', async ctx => {
  const body = ctx.request.body || {}

  const result = await updateDb(db => {
    const user = getCurrentUser(ctx, db)
    if (!user) return { error: 'Please login first', errno: 401 }

    const question = db.questions.find(item => item.id === ctx.params.id && item.userId === user.id)
    if (!question) return { error: 'Question not found', errno: 404 }

    const allowedKeys = ['title', 'desc', 'js', 'css', 'isDeleted', 'isStar']
    allowedKeys.forEach(key => {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        question[key] = body[key]
      }
    })

    if (Array.isArray(body.componentList)) {
      question.componentList = clone(body.componentList)
    }

    question.updatedAt = formatDate()
    return { ok: true }
  })

  if (result.error) {
    fail(ctx, result.error, result.errno)
    return
  }

  success(ctx)
})

router.delete('/api/question', async ctx => {
  const ids = Array.isArray(ctx.request.body?.ids) ? ctx.request.body.ids : []

  const result = await updateDb(db => {
    const user = getCurrentUser(ctx, db)
    if (!user) return { error: 'Please login first', errno: 401 }

    const ownedIds = new Set(
      db.questions.filter(item => item.userId === user.id).map(item => item.id)
    )
    const targetIds = ids.filter(id => ownedIds.has(id))

    db.questions = db.questions.filter(item => !targetIds.includes(item.id))
    db.answers = db.answers.filter(item => !targetIds.includes(item.questionId))

    return { ok: true }
  })

  if (result.error) {
    fail(ctx, result.error, result.errno)
    return
  }

  success(ctx)
})

router.post('/api/answer', async ctx => {
  const { questionId = '', versionId = '', answerList = [] } = ctx.request.body || {}

  const result = await updateDb(db => {
    const question = db.questions.find(item => item.id === questionId)
    if (!question) return { error: 'Question not found', errno: 404 }
    if (question.isDeleted) return { error: 'Question has been deleted', errno: 400 }

    const version = getPublishedVersion(question, String(versionId || question.publishedVersionId))
    if (!version) return { error: 'Question has not been published', errno: 400 }

    const normalisedAnswerList = Array.isArray(answerList)
      ? answerList
          .filter(item => item && item.componentId)
          .map(item => ({
            componentId: String(item.componentId),
            value: Array.isArray(item.value) ? item.value.join(',') : String(item.value || ''),
          }))
      : []

    const answerRecord = {
      id: createId('answer'),
      questionId,
      versionId: version.id,
      createdAt: formatDate(),
      answerList: normalisedAnswerList,
    }

    db.answers.unshift(answerRecord)

    question.answerCount = Number(question.answerCount || 0) + 1
    question.updatedAt = formatDate()
    version.answerCount = Number(version.answerCount || 0)
    version.statSummary = normalizeVersionStatSummary(version.componentList, version.statSummary)
    applyAnswerToVersionStats(version, answerRecord)

    return { ok: true }
  })

  if (result.error) {
    fail(ctx, result.error, result.errno)
    return
  }

  success(ctx)
})

router.get('/api/stat/:questionId/:componentId', async ctx => {
  const db = await readDb()
  const user = requireUser(ctx, db)
  if (!user) return

  const question = db.questions.find(
    item => item.id === ctx.params.questionId && item.userId === user.id
  )
  if (!question) {
    fail(ctx, 'Question not found', 404)
    return
  }

  const versionId = String(ctx.query?.versionId || question.publishedVersionId || '')
  const publishedQuestion = getPublishedQuestionLike(question, versionId)
  const version = getPublishedVersion(question, versionId)
  if (!publishedQuestion) {
    fail(ctx, 'Question has not been published', 400)
    return
  }
  if (!version) {
    fail(ctx, 'Published version not found', 404)
    return
  }

  const stat = getVersionComponentStat(version, ctx.params.componentId)

  success(ctx, { stat })
})

router.get('/api/stat/:questionId', async ctx => {
  const db = await readDb()
  const user = requireUser(ctx, db)
  if (!user) return

  const question = db.questions.find(
    item => item.id === ctx.params.questionId && item.userId === user.id
  )
  if (!question) {
    fail(ctx, 'Question not found', 404)
    return
  }

  const versionId = String(ctx.query?.versionId || question.publishedVersionId || '')
  const publishedQuestion = getPublishedQuestionLike(question, versionId)
  const version = getPublishedVersion(question, versionId)
  if (!publishedQuestion) {
    fail(ctx, 'Question has not been published', 400)
    return
  }
  if (!version) {
    fail(ctx, 'Published version not found', 404)
    return
  }

  const page = Math.max(1, Number(ctx.query?.page) || 1)
  const pageSize = Math.max(1, Number(ctx.query?.pageSize) || 10)
  const answers = db.answers
    .filter(item => item.questionId === question.id && item.versionId === versionId)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))

  const list = answers
    .slice((page - 1) * pageSize, page * pageSize)
    .map(answer => buildStatRow(publishedQuestion, answer))

  success(ctx, {
    total: Number(version.answerCount || answers.length),
    list,
    versionId,
  })
})

app.use(router.routes())
app.use(router.allowedMethods())

ensureDbFile()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Survey server running at http://localhost:${PORT}`)
    })
  })
  .catch(err => {
    console.error('Failed to start server:', err)
    process.exit(1)
  })

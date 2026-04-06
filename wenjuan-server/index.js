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

async function ensureDbFile() {
  await fs.mkdir(DB_DIR, { recursive: true })

  try {
    await fs.access(DB_FILE)
  } catch {
    await fs.writeFile(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf8')
  }
}

async function readDb() {
  await ensureDbFile()

  const content = await fs.readFile(DB_FILE, 'utf8')
  const parsed = content ? JSON.parse(content) : {}

  return {
    ...DEFAULT_DB,
    ...parsed,
    users: Array.isArray(parsed.users) ? parsed.users : [],
    sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    questions: Array.isArray(parsed.questions) ? parsed.questions : [],
    answers: Array.isArray(parsed.answers) ? parsed.answers : [],
  }
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
    fail(ctx, '请先登录', 401)
    return null
  }

  return user
}

function normaliseQuestion(question) {
  return {
    ...clone(question),
    _id: question.id,
  }
}

function normaliseQuestionListItem(question) {
  return {
    _id: question.id,
    id: question.id,
    title: question.title,
    isStar: Boolean(question.isStar),
    isPublished: Boolean(question.isPublished),
    isDeleted: Boolean(question.isDeleted),
    answerCount: Number(question.answerCount || 0),
    createdAt: question.createdAt,
  }
}

function createDefaultComponentList() {
  return [
    {
      fe_id: createId('cmp'),
      type: 'questionInfo',
      title: '问卷信息',
      isHidden: false,
      isLocked: false,
      props: {
        title: '个人问卷',
        desc: '请根据实际情况填写问卷内容。',
      },
    },
    {
      fe_id: createId('cmp'),
      type: 'questionTitle',
      title: '标题',
      isHidden: false,
      isLocked: false,
      props: {
        text: '欢迎参与本次调查',
        level: 1,
        isCenter: false,
      },
    },
    {
      fe_id: createId('cmp'),
      type: 'questionInput',
      title: '输入框',
      isHidden: false,
      isLocked: false,
      props: {
        title: '你的姓名',
        placeholder: '请输入姓名',
      },
    },
    {
      fe_id: createId('cmp'),
      type: 'questionInput',
      title: '输入框',
      isHidden: false,
      isLocked: false,
      props: {
        title: '联系方式',
        placeholder: '请输入手机号或微信',
      },
    },
    {
      fe_id: createId('cmp'),
      type: 'questionTextarea',
      title: '多行输入',
      isHidden: false,
      isLocked: false,
      props: {
        title: '补充说明',
        placeholder: '可以填写你的补充想法',
      },
    },
    {
      fe_id: createId('cmp'),
      type: 'questionParagraph',
      title: '段落',
      isHidden: false,
      isLocked: false,
      props: {
        text: '本问卷仅用于个人收集信息。\n感谢你的配合。',
        isCenter: false,
      },
    },
    {
      fe_id: createId('cmp'),
      type: 'questionRadio',
      title: '单选',
      isHidden: false,
      isLocked: false,
      props: {
        title: '你最常使用的沟通方式是？',
        isVertical: false,
        options: [
          { value: 'phone', text: '电话' },
          { value: 'wechat', text: '微信' },
          { value: 'email', text: '邮箱' },
        ],
        value: '',
      },
    },
    {
      fe_id: createId('cmp'),
      type: 'questionCheckbox',
      title: '多选',
      isHidden: false,
      isLocked: false,
      props: {
        title: '你希望收到哪些内容？',
        isVertical: false,
        list: [
          { value: 'news', text: '活动通知', checked: false },
          { value: 'product', text: '产品更新', checked: false },
          { value: 'tips', text: '使用技巧', checked: false },
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
    title: '未命名问卷',
    desc: '请完善问卷描述',
    js: '',
    css: '',
    isDeleted: false,
    isPublished: false,
    isStar: false,
    answerCount: 0,
    createdAt: now,
    updatedAt: now,
    componentList: createDefaultComponentList(),
  }
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

function getComponent(question, componentId) {
  return (question.componentList || []).find(item => item.fe_id === componentId) || null
}

function getDisplayValue(question, componentId, rawValue) {
  const component = getComponent(question, componentId)
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

function buildStatRow(question, answer) {
  const row = { _id: answer.id }

  ;(answer.answerList || []).forEach(item => {
    row[item.componentId] = getDisplayValue(question, item.componentId, item.value)
  })

  return row
}

function buildComponentStat(question, componentId, answers) {
  const component = getComponent(question, componentId)
  if (!component) return []

  const { type, props = {} } = component

  if (type === 'questionRadio') {
    const options = Array.isArray(props.options) ? props.options : []
    const counter = new Map(options.map(item => [item.value, 0]))

    answers.forEach(answer => {
      const current = (answer.answerList || []).find(item => item.componentId === componentId)
      if (!current || !counter.has(current.value)) return
      counter.set(current.value, counter.get(current.value) + 1)
    })

    return options.map(item => ({
      name: item.text,
      count: counter.get(item.value) || 0,
    }))
  }

  if (type === 'questionCheckbox') {
    const list = Array.isArray(props.list) ? props.list : []
    const counter = new Map(list.map(item => [item.value, 0]))

    answers.forEach(answer => {
      const current = (answer.answerList || []).find(item => item.componentId === componentId)
      if (!current) return

      parseCheckboxValue(current.value).forEach(value => {
        if (!counter.has(value)) return
        counter.set(value, counter.get(value) + 1)
      })
    })

    return list.map(item => ({
      name: item.text,
      count: counter.get(item.value) || 0,
    }))
  }

  return []
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
      fail(ctx, '接口不存在', 404)
    }
  } catch (err) {
    console.error(err)
    fail(ctx, err.message || '服务异常', 500)
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
    fail(ctx, '用户名和密码不能为空')
    return
  }

  const result = await updateDb(db => {
    const exists = db.users.some(item => item.username === trimmedUsername)
    if (exists) return { error: '用户名已存在' }

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

    if (!user) return { error: '用户名或密码错误' }

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
    if (!user) return { error: '请先登录', errno: 401 }

    const source = db.questions.find(item => item.id === ctx.params.id && item.userId === user.id)
    if (!source) return { error: '问卷不存在', errno: 404 }

    const now = formatDate()
    const duplicated = {
      ...clone(source),
      id: createId('question'),
      title: `${source.title} 副本`,
      isPublished: false,
      isDeleted: false,
      isStar: false,
      answerCount: 0,
      createdAt: now,
      updatedAt: now,
      componentList: resetComponentIds(source.componentList),
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

router.get('/api/question/:id', async ctx => {
  const db = await readDb()
  const question = db.questions.find(item => item.id === ctx.params.id)

  if (!question) {
    fail(ctx, '问卷不存在', 404)
    return
  }

  success(ctx, normaliseQuestion(question))
})

router.post('/api/question', async ctx => {
  const result = await updateDb(db => {
    const user = getCurrentUser(ctx, db)
    if (!user) return { error: '请先登录', errno: 401 }

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
    if (!user) return { error: '请先登录', errno: 401 }

    const question = db.questions.find(item => item.id === ctx.params.id && item.userId === user.id)
    if (!question) return { error: '问卷不存在', errno: 404 }

    const allowedKeys = ['title', 'desc', 'js', 'css', 'isPublished', 'isDeleted', 'isStar']
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
    if (!user) return { error: '请先登录', errno: 401 }

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
  const { questionId = '', answerList = [] } = ctx.request.body || {}

  const result = await updateDb(db => {
    const question = db.questions.find(item => item.id === questionId)
    if (!question) return { error: '问卷不存在', errno: 404 }
    if (question.isDeleted) return { error: '该问卷已删除', errno: 400 }
    if (!question.isPublished) return { error: '该问卷尚未发布', errno: 400 }

    const normalisedAnswerList = Array.isArray(answerList)
      ? answerList
          .filter(item => item && item.componentId)
          .map(item => ({
            componentId: String(item.componentId),
            value: Array.isArray(item.value) ? item.value.join(',') : String(item.value || ''),
          }))
      : []

    db.answers.unshift({
      id: createId('answer'),
      questionId,
      createdAt: formatDate(),
      answerList: normalisedAnswerList,
    })

    question.answerCount = Number(question.answerCount || 0) + 1
    question.updatedAt = formatDate()

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
    fail(ctx, '问卷不存在', 404)
    return
  }

  const answers = db.answers.filter(item => item.questionId === question.id)
  const stat = buildComponentStat(question, ctx.params.componentId, answers)

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
    fail(ctx, '问卷不存在', 404)
    return
  }

  const page = Math.max(1, Number(ctx.query?.page) || 1)
  const pageSize = Math.max(1, Number(ctx.query?.pageSize) || 10)
  const answers = db.answers
    .filter(item => item.questionId === question.id)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))

  const list = answers
    .slice((page - 1) * pageSize, page * pageSize)
    .map(answer => buildStatRow(question, answer))

  success(ctx, {
    total: answers.length,
    list,
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

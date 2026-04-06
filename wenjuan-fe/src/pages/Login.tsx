import React, { FC, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Typography, Space, Form, Input, Button, Checkbox, message } from 'antd'
import { UserAddOutlined } from '@ant-design/icons'
import { useRequest } from 'ahooks'
import { useDispatch } from 'react-redux'
import { REGISTER_PATHNAME, MANAGE_INDEX_PATHNAME } from '../router'
import { getUserInfoService, loginService } from '../services/user'
import { setToken } from '../utils/user-token'
import { loginReducer } from '../store/userReducer'
import styles from './Login.module.scss'

const { Title } = Typography

const USERNAME_KEY = 'USERNAME'
const PASSWORD_KEY = 'PASSWORD'

function rememberUser(username: string, password: string) {
  localStorage.setItem(USERNAME_KEY, username)
  localStorage.setItem(PASSWORD_KEY, password)
}

function deleteUserFromStorage() {
  localStorage.removeItem(USERNAME_KEY)
  localStorage.removeItem(PASSWORD_KEY)
}

function getUserInfoFromStorage() {
  return {
    username: localStorage.getItem(USERNAME_KEY),
    password: localStorage.getItem(PASSWORD_KEY),
  }
}

const Login: FC = () => {
  const nav = useNavigate()
  const dispatch = useDispatch()

  const [form] = Form.useForm()

  useEffect(() => {
    const { username, password } = getUserInfoFromStorage()
    form.setFieldsValue({ username, password })
  }, [form])

  const { run, loading } = useRequest(
    async (username: string, password: string) => {
      const loginData = await loginService(username, password)
      const { token = '' } = loginData

      setToken(token)

      const userInfo = await getUserInfoService()
      return userInfo
    },
    {
      manual: true,
      onSuccess(result) {
        const { username = '', nickname = '' } = result
        dispatch(loginReducer({ username, nickname }))

        message.success('登录成功')
        nav(MANAGE_INDEX_PATHNAME)
      },
    }
  )

  const onFinish = (values: any) => {
    const { username, password, remember } = values || {}

    run(username, password)

    if (remember) {
      rememberUser(username, password)
    } else {
      deleteUserFromStorage()
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.title}>
          <Space>
            <Title level={2}>
              <UserAddOutlined />
            </Title>
            <Title level={2}>欢迎回来</Title>
          </Space>
          <p>继续管理你的问卷与答卷统计。</p>
        </div>
        <Form
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 16 }}
          initialValues={{ remember: true }}
          onFinish={onFinish}
          form={form}
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { type: 'string', min: 5, max: 20, message: '字符长度在 5-20 之间' },
              { pattern: /^\w+$/, message: '只能是字母数字下划线' },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="remember" valuePropName="checked" wrapperCol={{ offset: 6, span: 16 }}>
            <Checkbox>记住我</Checkbox>
          </Form.Item>
          <Form.Item wrapperCol={{ offset: 6, span: 16 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                登录
              </Button>
              <Link to={REGISTER_PATHNAME}>注册新用户</Link>
            </Space>
          </Form.Item>
        </Form>
      </div>
    </div>
  )
}

export default Login

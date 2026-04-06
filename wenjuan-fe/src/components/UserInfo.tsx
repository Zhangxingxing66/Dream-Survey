import React, { FC } from 'react'
import { Button, message } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { UserOutlined } from '@ant-design/icons'
import { useDispatch } from 'react-redux'
import { LOGIN_PATHNAME } from '../router'
import { removeToken } from '../utils/user-token'
import useGetUserInfo from '../hooks/useGetUserInfo'
import { logoutReducer } from '../store/userReducer'
import styles from './UserInfo.module.scss'

const UserInfo: FC = () => {
  const nav = useNavigate()
  const dispatch = useDispatch()
  const { username, nickname } = useGetUserInfo()

  function logout() {
    dispatch(logoutReducer())
    removeToken()
    message.success('已退出登录')
    nav(LOGIN_PATHNAME)
  }

  if (!username) {
    return (
      <div className={styles.container}>
        <Link to={LOGIN_PATHNAME} className={styles.login}>
          登录
        </Link>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <span className={styles.user}>
        <UserOutlined />
        {nickname || username}
      </span>
      <Button type="link" onClick={logout}>
        退出
      </Button>
    </div>
  )
}

export default UserInfo

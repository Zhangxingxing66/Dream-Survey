import React, { FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Typography, Space } from 'antd'
import { MANAGE_INDEX_PATHNAME, LOGIN_PATHNAME } from '../router'
import styles from './Home.module.scss'

const { Title, Paragraph } = Typography

const Home: FC = () => {
  const nav = useNavigate()

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.badge}>Dream Survey 2026</div>
        <Title>Dream Survey</Title>
        <Paragraph>
          A light, fresh survey workspace for 2026. Create surveys, publish links,
          collect answers, and review stats in one local project.
        </Paragraph>
        <Space size="middle" wrap>
          <Button type="primary" size="large" onClick={() => nav(MANAGE_INDEX_PATHNAME)}>
            Open Admin
          </Button>
          <Button size="large" onClick={() => nav(LOGIN_PATHNAME)}>
            Go To Login
          </Button>
        </Space>
      </div>
      <div className={styles.grid}>
        <div className={styles.card}>
          <h3>Fresh Visuals</h3>
          <p>Soft mint tones, rounded cards, and a cleaner interface for 2026.</p>
        </div>
        <div className={styles.card}>
          <h3>Local Workflow</h3>
          <p>Create, edit, publish, and store all data locally with a simple setup.</p>
        </div>
        <div className={styles.card}>
          <h3>Survey Loop</h3>
          <p>Answer pages and admin pages share one backend, so publishing and stats stay connected.</p>
        </div>
      </div>
    </div>
  )
}

export default Home

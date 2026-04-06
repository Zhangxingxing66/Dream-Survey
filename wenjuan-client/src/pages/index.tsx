import Head from 'next/head'
import styles from '@/styles/Home.module.css'

const manageHost = process.env.NEXT_PUBLIC_MANAGE_HOST || 'http://localhost:8000'

export default function Home() {
  return (
    <>
      <Head>
        <title>Dream Survey</title>
        <meta name="description" content="Dream Survey 2026 client" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <div className={styles.center}>
          <div className={styles.description} style={{ maxWidth: 720, textAlign: 'left' }}>
            <p>Dream Survey Client</p>
            <div>
              <a href={manageHost} target="_blank" rel="noreferrer">
                Open Admin
              </a>
            </div>
          </div>
          <div className={styles.grid} style={{ marginTop: 32 }}>
            <div className={styles.card}>
              <h2>How To Use</h2>
              <p>1. Register and log in from the admin side.</p>
              <p>2. Create a survey, edit it, and publish it.</p>
              <p>3. Open the published link to fill out the survey.</p>
            </div>
            <div className={styles.card}>
              <h2>Project</h2>
              <p>Brand: Dream Survey</p>
              <p>Edition: 2026</p>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

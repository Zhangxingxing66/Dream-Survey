import React from 'react'
import { ConfigProvider, theme } from 'antd'
import { RouterProvider } from 'react-router-dom'
import routerConfig from './router'
import 'antd/dist/reset.css'
import './App.css'

function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#78c2ad',
          colorSuccess: '#86cf9a',
          colorWarning: '#f0c27b',
          colorError: '#e58d8d',
          colorInfo: '#7ab8d9',
          borderRadius: 16,
          borderRadiusLG: 22,
          colorBgContainer: 'rgba(255, 255, 255, 0.9)',
          colorText: '#4f665d',
          colorTextHeading: '#35564a',
          colorBorder: '#d6ebe2',
          controlHeight: 42,
          controlOutline: 'rgba(120, 194, 173, 0.18)',
          boxShadowSecondary: '0 18px 45px rgba(105, 157, 142, 0.12)',
          fontFamily: '"Trebuchet MS", "PingFang SC", "Microsoft YaHei", sans-serif',
        },
      }}
    >
      <RouterProvider router={routerConfig} />
    </ConfigProvider>
  )
}

export default App

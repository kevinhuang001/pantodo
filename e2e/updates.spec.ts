import { test, expect } from '@playwright/test'

test('About checks versions, exposes downloads and reports failures without technical labels', async ({
  page,
}) => {
  await page.goto('/')
  await page.locator('.sidebar').getByRole('button', { name: '设置', exact: true }).click()
  await page.locator('.settings-nav').getByRole('button', { name: '关于', exact: true }).click()
  const about = page.locator('.about-settings')
  await expect(about).not.toContainText('技术栈')
  await expect(about).not.toContainText('里程碑')
  const api = 'https://api.github.com/repos/kevinhuang001/pantodo/releases/latest'
  await page.route(api, (route) => route.fulfill({ json: { tag_name: 'v999.0.0' } }))
  await about.getByRole('button', { name: '检查更新', exact: true }).click()
  await expect(about).toContainText('发现新版本 999.0.0')
  await expect(about.getByRole('button', { name: '查看下载', exact: true })).toBeVisible()
  await page.unroute(api)
  await page.route(api, (route) => route.fulfill({ json: { tag_name: 'v0.0.1' } }))
  await about.getByRole('button', { name: '检查更新', exact: true }).click()
  await expect(about).toContainText('当前已是最新版本')
  await expect(about.getByRole('button', { name: '查看下载', exact: true })).toHaveCount(0)
  await page.unroute(api)
  await page.route(api, (route) => route.fulfill({ status: 429, body: '' }))
  await about.getByRole('button', { name: '检查更新', exact: true }).click()
  await expect(about.getByRole('alert')).toContainText('请求次数达到上限')
})

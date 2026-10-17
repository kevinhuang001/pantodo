/** Set capture metadata through the same calendar, duration and app-owned menus a user sees.
 * @param {import('@playwright/test').Page} page
 * @param {{start?:string,end?:string,due?:string,estimate?:string}} values
 * @param {boolean} close
 */
export async function setCaptureSchedule(page, values, close = true) {
  if (values.estimate !== undefined) {
    await page.getByRole('button', { name: '预估时长', exact: true }).click()
    const estimate = page.locator('.capture-estimate-picker')
    await estimate.locator('#create-estimate').fill(values.estimate)
    await estimate.getByRole('button', { name: '完成', exact: true }).click()
  }
  await page.getByRole('button', { name: '安排时间', exact: true }).click()
  const picker = page.locator('.capture-schedule-picker')
  for (const [key] of [
    ['start', '开始时间'],
    ['end', '结束时间'],
    ['due', '截止时间'],
  ]) {
    const value = values[key]
    if (!value) continue
    const row = picker.locator(`[data-endpoint="${key}"]`)
    await row.locator('button').nth(0).click()
    const [day, time] = value.split('T')
    const dayLabel = new Date(day + 'T12:00').toLocaleDateString('zh-CN')
    await page.locator(`.date-popover button[data-day="${dayLabel}"]`).click()
    await row.locator('button').nth(1).click()
    await page.locator('.time-popover input').fill(time)
    await page.locator('.time-popover').getByRole('button', { name: '完成', exact: true }).click()
  }
  if (close) await picker.getByRole('button', { name: '完成', exact: true }).click()
}

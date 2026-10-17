import { selectCalendarDate, selectClockTime, selectDuration } from './date-fixture.mjs'
/** Set capture metadata using only the app-owned selection controls. */
export async function setCaptureSchedule(page, values, close = true) {
  if (values.estimate !== undefined) {
    await page.getByRole('button', { name: '预估时长', exact: true }).click()
    await selectDuration(page, values.estimate)
  }
  await page.getByRole('button', { name: '安排时间', exact: true }).click()
  const picker = page.locator('.capture-schedule-picker')
  for (const key of ['start', 'end', 'due']) {
    if (!values[key]) continue
    const row = picker.locator(`[data-endpoint="${key}"]`),
      [day, time] = values[key].split('T')
    await row.locator('button').nth(0).click()
    await selectCalendarDate(page, day)
    await row.locator('button').nth(1).click()
    await selectClockTime(page, time)
  }
  if (close) await picker.getByRole('button', { name: '完成', exact: true }).click()
}

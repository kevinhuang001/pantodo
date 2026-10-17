import { selectCalendarDate, selectClockTime, selectDuration } from './date-fixture.mjs'
/** Select a start and duration, then configure the independent due date. */
export async function setCaptureSchedule(page, values, close = true) {
  const picker = page.locator('.capture-schedule-picker')
  if (values.start || values.estimate) {
    await page.getByRole('button', { name: '安排时间', exact: true }).click()
    if (values.start) {
      const row = picker.locator('[data-endpoint="start"]')
      const [day, time] = values.start.split('T')
      await row.locator('[data-part=date]').click()
      await selectCalendarDate(page, day)
      await row.locator('[data-part=time]').click()
      await selectClockTime(page, time)
    }
    const minutes =
      values.start && values.end
        ? String((Date.parse(values.end) - Date.parse(values.start)) / 60000)
        : values.estimate
    if (minutes) {
      await picker.getByRole('button', { name: '持续时间', exact: true }).click()
      await selectDuration(page, minutes)
    }
    if (!close && !values.due) return
    await picker.getByRole('button', { name: '完成', exact: true }).click()
  }
  if (values.due) {
    await page.getByRole('button', { name: '截止时间', exact: true }).click()
    const row = picker.locator('[data-endpoint="due"]')
    const [day, time] = values.due.split('T')
    await row.locator('[data-part=date]').click()
    await selectCalendarDate(page, day)
    await row.locator('[data-part=time]').click()
    await selectClockTime(page, time)
    if (close) await picker.getByRole('button', { name: '完成', exact: true }).click()
  }
}

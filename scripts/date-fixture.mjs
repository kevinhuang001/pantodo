/** Exercise selection controls through the same buttons used in the app. */
export async function selectCalendarDate(page, day) {
  const calendar = page.locator('.date-popover')
  const target = new Date(day + 'T12:00').toLocaleDateString('zh-CN')
  for (let i = 0; i < 36; i++) {
    const button = calendar.locator(`button[data-day="${target}"]`)
    if (await button.count()) {
      await button.click()
      return
    }
    const middle = await calendar.locator('button[data-day]').nth(15).getAttribute('data-day')
    const [year, month] = middle.split('/').map(Number)
    const current = year * 12 + month,
      desired = Number(day.slice(0, 4)) * 12 + Number(day.slice(5, 7))
    await calendar.locator(desired > current ? '.rdp-button_next' : '.rdp-button_previous').click()
  }
  throw new Error('Date outside test navigation range: ' + day)
}
export async function selectClockTime(page, time) {
  const [hour, minute] = time.split(':')
  await page.locator(`.clock-options[data-unit="hour"] [data-value="${hour}"]`).click()
  await page.locator(`.clock-options[data-unit="minute"] [data-value="${minute}"]`).click()
  await page.locator('.time-popover').getByRole('button', { name: '完成', exact: true }).click()
}
export async function setDateTimeField(page, id, value) {
  const field = page.locator(`[data-datetime-field="${id}"]`)
  await field.locator('[data-part="date"]').click()
  const [day, time] = value.split('T')
  await selectCalendarDate(page, day)
  if (time) {
    await field.locator('[data-part="time"]').click()
    await selectClockTime(page, time)
  }
}
export async function selectDuration(page, minutes) {
  await page
    .locator('.capture-estimate-picker')
    .getByRole('button', { name: '自定义', exact: true })
    .click()
  const picker = page.locator('.duration-custom-dialog')
  await picker
    .getByRole('spinbutton', { name: '小时', exact: true })
    .fill(String(Math.floor(Number(minutes) / 60)))
  await picker
    .getByRole('spinbutton', { name: '分钟数', exact: true })
    .fill(String(Number(minutes) % 60))
  await picker.getByRole('button', { name: '完成', exact: true }).click()
}

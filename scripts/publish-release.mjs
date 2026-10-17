import { readFile, readdir, copyFile, mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const { version } = JSON.parse(await readFile('package.json', 'utf8'))
const tag = `v${version}`
const repo = process.env.GITHUB_REPOSITORY
const sha = process.env.GITHUB_SHA
if (!repo || !sha) throw new Error('Release requires a GitHub Actions commit context')
try {
  execFileSync('gh', ['release', 'view', tag, '--repo', repo], { stdio: 'ignore' })
  console.log(`${tag} is already published; existing assets are immutable.`)
  process.exit(0)
} catch {
  /* This version has not been published yet. */
}
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((item) =>
      item.isDirectory()
        ? walk(path.join(directory, item.name))
        : [path.join(directory, item.name)],
    ),
  )
  return nested.flat()
}
const files = (await walk('installers'))
  .filter((file) => /\.(dmg|exe|msi|deb|rpm|AppImage)$/.test(file))
  .sort()
const checks = [/aarch64\.dmg$/, /x64\.dmg$/, /\.exe$/, /\.msi$/, /\.deb$/, /\.rpm$/, /\.AppImage$/]
for (const required of checks)
  if (!files.some((file) => required.test(file)))
    throw new Error(`Missing release installer: ${required}`)
await mkdir('release-assets', { recursive: true })
const sums = []
const assets = []
for (const file of files) {
  const name = path.basename(file)
  if (assets.some((asset) => path.basename(asset) === name))
    throw new Error(`Duplicate installer: ${name}`)
  const destination = path.join('release-assets', name)
  await copyFile(file, destination)
  assets.push(destination)
  sums.push(
    `${createHash('sha256')
      .update(await readFile(file))
      .digest('hex')}  ${name}`,
  )
}
await writeFile('release-assets/SHA256SUMS.txt', sums.join('\n') + '\n')
assets.push('release-assets/SHA256SUMS.txt')
execFileSync(
  'gh',
  [
    'release',
    'create',
    tag,
    ...assets,
    '--repo',
    repo,
    '--target',
    sha,
    '--title',
    `Pantodo ${version}`,
    '--notes-file',
    'docs/RELEASE-NOTES.md',
    '--prerelease',
    '--draft',
  ],
  { stdio: 'inherit' },
)

execFileSync('gh', ['release', 'edit', tag, '--repo', repo, '--draft=false', '--prerelease'], {
  stdio: 'inherit',
})
